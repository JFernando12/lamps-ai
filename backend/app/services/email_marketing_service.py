"""Email marketing business logic.

Handles:
- Listing audience segments (customers with orders + abandoned carts)
- Email templates (predefined + custom campaigns)
- Sending campaigns and recording results in DynamoDB
- Transactional emails: order confirmation, tracking number
"""
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import HTTPException

from .. import database
from ..email_sender import send_bulk_emails, send_generic_email
from ..services.admin_service import _scan_all

# ── Types ─────────────────────────────────────────────────────────────────────

SegmentType = Literal["all", "customers", "abandoned_carts", "rejected", "pending"]

TEMPLATES: list[dict] = [
    {
        "id": "order_confirmation",
        "name": "Confirmación de pedido",
        "description": "Se envía cuando el pago es confirmado.",
        "subject": "¡Tu pedido ha sido confirmado! 🎉",
        "title": "¡Gracias por tu compra!",
        "body_html": "<p>Tu pedido ha sido confirmado y estamos trabajando en él con mucho cariño.</p><p>Te avisaremos en cuanto esté listo para enviar.</p>",
        "cta_text": "Ver mi pedido",
        "cta_url_template": "{frontend_url}/pedido/{order_id}",
        "category": "transactional",
    },
    {
        "id": "tracking_ready",
        "name": "Guía de rastreo lista",
        "description": "Enviar cuando tengas el número de rastreo.",
        "subject": "Tu lámpara está en camino 🚚",
        "title": "¡Tu pedido ya fue enviado!",
        "body_html": "<p>Tu lámpara personalizada ya está en camino. Puedes rastrear tu paquete con el número:</p><p><strong>{tracking_number}</strong></p>",
        "cta_text": "Ver estado de mi pedido",
        "cta_url_template": "{frontend_url}/pedido/{order_id}",
        "category": "transactional",
    },
    {
        "id": "abandoned_cart",
        "name": "Carrito abandonado (manual)",
        "description": "Recordatorio manual para retomar el checkout.",
        "subject": "Tu lámpara personalizada te está esperando 🕯️",
        "title": "¿Olvidaste algo?",
        "body_html": "<p>Empezaste a crear tu lámpara personalizada pero no terminaste el pedido.</p><p>Tu diseño sigue guardado — sólo faltan tus datos de envío.</p>",
        "cta_text": "Retomar mi pedido",
        "cta_url_template": "{frontend_url}/checkout?cart_id={cart_id}",
        "category": "recovery",
    },
    {
        "id": "payment_failed",
        "name": "Pago fallido — reintento",
        "description": "Para clientes cuyo pago no fue procesado.",
        "subject": "Hubo un problema con tu pago 😔",
        "title": "Tu pago no fue procesado",
        "body_html": "<p>Parece que hubo un problema al procesar tu pago. No te preocupes — tu diseño sigue guardado.</p><p>Intenta de nuevo con otro método de pago.</p>",
        "cta_text": "Reintentar mi pedido",
        "cta_url_template": "{frontend_url}/checkout",
        "category": "recovery",
    },
    {
        "id": "dia_madres",
        "name": "Día de las Madres",
        "description": "Campaña para el 10 de mayo.",
        "subject": "El regalo perfecto para mamá 🌸",
        "title": "Sorprende a mamá con una lámpara única",
        "body_html": "<p>Este Día de las Madres regálale algo que no olvidará: una lámpara personalizada con su foto favorita.</p><p>Hecha a mano con amor, entregada en tu puerta.</p>",
        "cta_text": "Crear mi regalo ahora",
        "cta_url_template": "{frontend_url}",
        "category": "campaign",
    },
    {
        "id": "dia_padres",
        "name": "Día del Padre",
        "description": "Campaña para el tercer domingo de junio.",
        "subject": "Papá se merece lo mejor 🎁",
        "title": "Un regalo que nunca olvidará",
        "body_html": "<p>Sorprende a papá con una lámpara personalizada única en su tipo.</p><p>Elige su foto favorita, añade un texto especial y nosotros hacemos el resto.</p>",
        "cta_text": "Diseñar mi regalo",
        "cta_url_template": "{frontend_url}",
        "category": "campaign",
    },
    {
        "id": "custom",
        "name": "Campaña personalizada",
        "description": "Redacta tu propio mensaje.",
        "subject": "",
        "title": "",
        "body_html": "",
        "cta_text": "",
        "cta_url_template": "",
        "category": "campaign",
    },
]


# ── Audience ──────────────────────────────────────────────────────────────────

def _get_audience(segment: SegmentType, product_filter: str | None = None) -> list[dict]:
    """Return list of {email, name, order_id?, cart_id?, product_id?, tracking_number?}."""
    results: dict[str, dict] = {}

    if segment in ("all", "customers"):
        orders = _scan_all(database.orders_table())
        for o in orders:
            email = o.get("user_email") or o.get("email")
            if not email or "@" not in email or email.startswith("guest_"):
                continue
            if product_filter and product_filter != "all":
                items = o.get("items", [])
                if not any(it.get("product_id") == product_filter for it in items):
                    continue
            if email not in results:
                results[email] = {
                    "email": email,
                    "name": o.get("shipping", {}).get("full_name", ""),
                    "order_id": o.get("order_id"),
                    "cart_id": None,
                    "product_id": (o.get("items") or [{}])[0].get("product_id", "rgb"),
                    "tracking_number": o.get("tracking_number"),
                    "status": o.get("status"),
                }

    if segment in ("all", "abandoned_carts"):
        carts = _scan_all(database.carts_table())
        _CONVERTED = {"converted", "expired"}
        for c in carts:
            email = c.get("email")
            if not email or "@" not in email or email.startswith("guest_"):
                continue
            if c.get("status") in _CONVERTED:
                continue
            if email in results:
                continue
            if product_filter and product_filter != "all":
                items = c.get("items", [])
                if not any(it.get("product_id") == product_filter for it in items):
                    continue
            results[email] = {
                "email": email,
                "name": "",
                "order_id": None,
                "cart_id": c.get("cart_id"),
                "product_id": (c.get("items") or [{}])[0].get("product_id", "rgb"),
                "tracking_number": None,
                "status": "abandoned",
            }

    if segment in ("rejected", "pending"):
        orders = _scan_all(database.orders_table())
        for o in orders:
            if o.get("status") != segment:
                continue
            email = o.get("user_email") or o.get("email")
            if not email or "@" not in email:
                continue
            results[email] = {
                "email": email,
                "name": o.get("shipping", {}).get("full_name", ""),
                "order_id": o.get("order_id"),
                "cart_id": None,
                "product_id": (o.get("items") or [{}])[0].get("product_id", "rgb"),
                "tracking_number": None,
                "status": o.get("status"),
            }

    return list(results.values())


def get_audience_preview(
    segment: SegmentType = "all",
    product_filter: str | None = None,
) -> dict:
    audience = _get_audience(segment, product_filter)
    return {
        "count": len(audience),
        "sample": audience[:5],
    }


# ── Templates ─────────────────────────────────────────────────────────────────

def list_templates() -> list[dict]:
    return TEMPLATES


def get_template(template_id: str) -> dict:
    for t in TEMPLATES:
        if t["id"] == template_id:
            return t
    raise HTTPException(status_code=404, detail="Template not found")


# ── Campaigns ─────────────────────────────────────────────────────────────────

def _resolve_url(template: str, recipient: dict) -> str:
    from .. import config
    return (
        template
        .replace("{frontend_url}", config.FRONTEND_URL)
        .replace("{order_id}", recipient.get("order_id") or "")
        .replace("{cart_id}", recipient.get("cart_id") or "")
        .replace("{tracking_number}", recipient.get("tracking_number") or "")
    )


def _resolve_body(body_html: str, recipient: dict) -> str:
    return (
        body_html
        .replace("{tracking_number}", recipient.get("tracking_number") or "")
        .replace("{order_id}", recipient.get("order_id") or "")
    )


def send_campaign(
    template_id: str,
    segment: SegmentType,
    subject: str,
    title: str,
    body_html: str,
    cta_text: str | None,
    cta_url_template: str | None,
    product_filter: str | None = None,
    recipient_override: list[str] | None = None,
) -> dict:
    """
    Send a campaign to the resolved audience and persist the record.
    If recipient_override is provided (list of emails), send only to those.
    """
    table = database.email_campaigns_table()
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    if recipient_override is not None:
        # Manual list of emails (e.g. single order notification)
        audience = [{"email": e, "name": "", "order_id": None, "cart_id": None,
                     "product_id": "rgb", "tracking_number": None, "status": None}
                    for e in recipient_override]
    else:
        audience = _get_audience(segment, product_filter)

    if not audience:
        return {"campaign_id": campaign_id, "sent": 0, "failed": 0, "skipped": 0,
                "total_recipients": 0}

    sent = failed = 0
    for recipient in audience:
        resolved_body = _resolve_body(body_html, recipient)
        resolved_cta_url = _resolve_url(cta_url_template or "", recipient) if cta_url_template else None
        ok = send_generic_email(
            to=recipient["email"],
            subject=subject,
            title=title,
            body_html=resolved_body,
            cta_text=cta_text or None,
            cta_url=resolved_cta_url or None,
        )
        if ok:
            sent += 1
        else:
            failed += 1

    # Persist campaign record
    table.put_item(Item={
        "campaign_id": campaign_id,
        "template_id": template_id,
        "segment": segment,
        "product_filter": product_filter or "all",
        "subject": subject,
        "title": title,
        "total_recipients": len(audience),
        "sent": sent,
        "failed": failed,
        "created_at": now,
        "status": "sent" if failed == 0 else ("partial" if sent > 0 else "failed"),
    })

    return {
        "campaign_id": campaign_id,
        "sent": sent,
        "failed": failed,
        "skipped": 0,
        "total_recipients": len(audience),
    }


def list_campaigns() -> list[dict]:
    campaigns = _scan_all(database.email_campaigns_table())
    campaigns.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return campaigns


# ── Transactional ─────────────────────────────────────────────────────────────

def send_order_confirmation(order_id: str) -> dict:
    """Send order confirmation email for a specific order."""
    order = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    email = order.get("user_email") or order.get("email")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Order has no valid email address")

    template = get_template("order_confirmation")
    recipient = {
        "email": email,
        "order_id": order_id,
        "cart_id": None,
        "tracking_number": None,
    }
    from .. import config
    cta_url = f"{config.FRONTEND_URL}/pedido/{order_id}"

    ok = send_generic_email(
        to=email,
        subject=template["subject"],
        title=template["title"],
        body_html=template["body_html"],
        cta_text=template["cta_text"],
        cta_url=cta_url,
    )
    return {"sent": ok, "email": email}


def send_tracking_email(order_id: str, tracking_number: str) -> dict:
    """Send tracking number email for a specific order."""
    order = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    email = order.get("user_email") or order.get("email")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Order has no valid email address")

    from .. import config
    template = get_template("tracking_ready")
    body = template["body_html"].replace("{tracking_number}", tracking_number)
    cta_url = f"{config.FRONTEND_URL}/pedido/{order_id}"

    ok = send_generic_email(
        to=email,
        subject=template["subject"],
        title=template["title"],
        body_html=body,
        cta_text=template["cta_text"],
        cta_url=cta_url,
    )
    return {"sent": ok, "email": email}
