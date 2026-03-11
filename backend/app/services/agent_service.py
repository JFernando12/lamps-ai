"""Agent platform service: payments, designs, orders — called by the AI agent via API key."""
import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
import mercadopago
import openai
from fastapi import HTTPException

from .. import config, database
from ..schemas.agent import (
    ConfirmAgentOrderRequest,
    CreateAgentOrderRequest,
    CreateDesignRequest,
    CreatePaymentLinkRequest,
    CreateTransferPaymentRequest,
    RevisionDesignRequest,
    UpdateAgentOrderRequest,
)

logger = logging.getLogger(__name__)

_PRODUCTS = {
    "lamp_led_16": {"name": "Lámpara LED 16 colores", "full_price": 597.0},
    "lamp_wood":   {"name": "Lámpara base madera",    "full_price": 719.0},
}


def _compact(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None}


def _order_number() -> str:
    year = datetime.now(timezone.utc).year
    seq = str(uuid.uuid4().int)[:4]
    return f"TDG-{year}-{seq}"


# ─────────────────────────────────────────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────────────────────────────────────────

def create_payment_link(body: CreatePaymentLinkRequest) -> dict:
    if body.amount < 10:
        raise HTTPException(status_code=422, detail={"error": "invalid_amount", "message": "El monto mínimo es $10 MXN"})

    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", ".000Z")

    callback_url: Optional[str] = None
    if body._channel_id and body._session_id:
        callback_url = (
            f"{config.AI_PLATFORM_BASE_URL}/whatsapp/webhooks/async"
            f"/{body._channel_id}/{body._session_id}"
        )

    payload = {
        "items": [
            {
                "title": body.concept,
                "quantity": 1,
                "unit_price": float(body.amount),
                "currency_id": "MXN",
            }
        ],
        "external_reference": body.order_ref,
        "expiration_date_to": _expiration_iso(body.expiration_hours),
        "expires": True,
    }

    resp = sdk.preference().create(payload)
    if resp["status"] not in (200, 201):
        logger.error("MP create_preference error: %s", resp)
        raise HTTPException(status_code=502, detail="Error al crear preferencia de pago")

    pref = resp["response"]
    payment_id = f"pay_{pref['id']}"

    # Persist for later status checks
    database.payments_table().put_item(Item=_compact({
        "payment_id": payment_id,
        "mp_preference_id": pref["id"],
        "order_ref": body.order_ref,
        "whatsapp_phone": body.whatsapp_phone,
        "amount": str(body.amount),
        "status": "pending",
        "callback_url": callback_url,
        "created_at": now_iso,
    }))

    # MP provides different URLs for sandbox vs production
    is_sandbox = "sandbox" in config.MP_ACCESS_TOKEN.lower() or config.MP_ACCESS_TOKEN.startswith("TEST-")
    payment_url = pref.get("sandbox_init_point" if is_sandbox else "init_point")

    return {
        "payment_id": payment_id,
        "payment_url": payment_url,
        "expires_at": _expiration_iso(body.expiration_hours),
    }


def get_payment_status(payment_id: str) -> dict:
    item = database.payments_table().get_item(Key={"payment_id": payment_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    # Sync from MP if still pending
    if item.get("status") == "pending" and item.get("mp_preference_id"):
        sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
        # Search payments by external_reference (order_ref)
        search = sdk.payment().search({"external_reference": item["order_ref"]})
        results = (search.get("response") or {}).get("results", [])
        if results:
            mp_status = results[0].get("status", "pending")
            mapped = _map_mp_status(mp_status)
            if mapped != item.get("status"):
                paid_at = results[0].get("date_approved")
                update_expr = "SET #s = :s, updated_at = :u" + (", paid_at = :pa" if paid_at else "")
                expr_vals = {":s": mapped, ":u": datetime.now(timezone.utc).isoformat()}
                if paid_at:
                    expr_vals[":pa"] = paid_at
                database.payments_table().update_item(
                    Key={"payment_id": payment_id},
                    UpdateExpression=update_expr,
                    ExpressionAttributeNames={"#s": "status"},
                    ExpressionAttributeValues=expr_vals,
                )
                item["status"] = mapped
                item["paid_at"] = paid_at

    return {
        "payment_id": payment_id,
        "status": item.get("status", "pending"),
        "amount": float(item.get("amount", 0)),
        "paid_at": item.get("paid_at"),
    }


def process_mp_webhook_agent(data: dict) -> dict:
    """MP IPN webhook that updates agent_payments table."""
    if data.get("type") != "payment":
        return {"ok": True}

    payment_mp_id = (data.get("data") or {}).get("id")
    if not payment_mp_id:
        return {"ok": True}

    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    payment = sdk.payment().get(payment_mp_id)["response"]
    order_ref = payment.get("external_reference")
    mp_status = payment.get("status")

    if not order_ref:
        return {"ok": True}

    # Find our record by order_ref
    resp = database.payments_table().query(
        IndexName="order_ref-index",
        KeyConditionExpression="order_ref = :ref",
        ExpressionAttributeValues={":ref": order_ref},
    )
    items = resp.get("Items", [])
    if not items:
        return {"ok": True}

    new_status = _map_mp_status(mp_status)
    for item in items:
        database.payments_table().update_item(
            Key={"payment_id": item["payment_id"]},
            UpdateExpression="SET #s = :s, mp_payment_id = :pid, updated_at = :u",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": new_status,
                ":pid": str(payment_mp_id),
                ":u": datetime.now(timezone.utc).isoformat(),
            },
        )
        if new_status == "approved" and item.get("callback_url"):
            _notify_platform_payment_approved(item["payment_id"], item["callback_url"])

    return {"ok": True}


def create_transfer_payment(body: CreateTransferPaymentRequest) -> dict:
    if body.amount < 10:
        raise HTTPException(status_code=422, detail={"error": "invalid_amount", "message": "El monto mínimo es $10 MXN"})

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", ".000Z")
    payment_id = f"pay_tr_{uuid.uuid4().hex[:10]}"

    callback_url: Optional[str] = None
    if body._channel_id and body._session_id:
        callback_url = (
            f"{config.AI_PLATFORM_BASE_URL}/whatsapp/webhooks/async"
            f"/{body._channel_id}/{body._session_id}"
        )

    database.payments_table().put_item(Item=_compact({
        "payment_id": payment_id,
        "method": "transfer",
        "order_ref": body.order_ref,
        "whatsapp_phone": body.whatsapp_phone,
        "amount": str(body.amount),
        "concept": body.concept,
        "proof_url": body.proof_url,
        "status": "pending_verification",
        "callback_url": callback_url,
        "created_at": now_iso,
    }))

    return {
        "payment_id": payment_id,
        "status": "pending_verification",
        "message": "Comprobante recibido. Un asesor lo verificará en breve.",
    }


def review_transfer_payment(payment_id: str, approved: bool, note: str | None = None) -> dict:
    """Admin action: approve or reject a pending transfer."""
    item = database.payments_table().get_item(Key={"payment_id": payment_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    if item.get("method") != "transfer":
        raise HTTPException(status_code=422, detail="Solo aplica para transferencias")

    new_status = "approved" if approved else "rejected"
    now = datetime.now(timezone.utc).isoformat()

    database.payments_table().update_item(
        Key={"payment_id": payment_id},
        UpdateExpression="SET #s = :s, reviewed_at = :r, review_note = :n, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": new_status,
            ":r": now,
            ":n": note or "",
            ":u": now,
        },
    )

    if approved and item.get("callback_url"):
        _notify_platform_payment_approved(payment_id, item["callback_url"])

    return {"payment_id": payment_id, "status": new_status}


def list_pending_transfers() -> dict:
    """Admin: list all transfer payments awaiting verification."""
    resp = database.payments_table().scan(
        FilterExpression="#s = :s AND #m = :m",
        ExpressionAttributeNames={"#s": "status", "#m": "method"},
        ExpressionAttributeValues={":s": "pending_verification", ":m": "transfer"},
    )
    items = resp.get("Items", [])
    return {
        "transfers": [
            {
                "payment_id": i["payment_id"],
                "order_ref": i.get("order_ref"),
                "amount": float(i.get("amount", 0)),
                "concept": i.get("concept"),
                "proof_url": i.get("proof_url"),
                "whatsapp_phone": i.get("whatsapp_phone"),
                "created_at": i.get("created_at"),
            }
            for i in items
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# DESIGNS
# ─────────────────────────────────────────────────────────────────────────────

def create_design(body: CreateDesignRequest) -> dict:
    job_id = f"dsn_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()

    callback_url: Optional[str] = None
    if body._channel_id and body._session_id:
        callback_url = (
            f"{config.AI_PLATFORM_BASE_URL}/whatsapp/webhooks/async"
            f"/{body._channel_id}/{body._session_id}"
        )

    database.designs_table().put_item(Item=_compact({
        "job_id": job_id,
        "product_id": body.product_id,
        "photo_url": body.photo_url,
        "status": "processing",
        "iteration": 1,
        "design_url": None,
        "error_message": None,
        "approved": False,
        "callback_url": callback_url,
        "whatsapp_phone": body.whatsapp_phone,
        "created_at": now,
        "updated_at": now,
    }))

    _trigger_design_job(job_id, body.photo_url, callback_url)

    return {"job_id": job_id, "estimated_seconds": 30}


def get_design_status(job_id: str) -> dict:
    item = database.designs_table().get_item(Key={"job_id": job_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    return {
        "job_id": job_id,
        "status": item.get("status"),
        "design_url": item.get("design_url"),
        "iteration": int(item.get("iteration", 1)),
        "error_message": item.get("error_message"),
    }


def approve_design(job_id: str) -> dict:
    item = database.designs_table().get_item(Key={"job_id": job_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    if item.get("status") != "ready":
        raise HTTPException(status_code=422, detail={"error": "design_not_ready", "message": "El diseño aún no está listo"})

    database.designs_table().update_item(
        Key={"job_id": job_id},
        UpdateExpression="SET approved = :a, updated_at = :u",
        ExpressionAttributeValues={
            ":a": True,
            ":u": datetime.now(timezone.utc).isoformat(),
        },
    )
    return {"approved": True}


def request_revision(job_id: str, body: RevisionDesignRequest) -> dict:
    item = database.designs_table().get_item(Key={"job_id": job_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")

    new_job_id = f"dsn_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    prev_iteration = int(item.get("iteration", 1))

    callback_url: Optional[str] = item.get("callback_url")

    database.designs_table().put_item(Item=_compact({
        "job_id": new_job_id,
        "product_id": item.get("product_id"),
        "photo_url": item.get("photo_url"),
        "status": "processing",
        "iteration": prev_iteration + 1,
        "design_url": None,
        "error_message": None,
        "approved": False,
        "change_notes": body.change_notes,
        "previous_job_id": job_id,
        "callback_url": callback_url,
        "whatsapp_phone": item.get("whatsapp_phone"),
        "created_at": now,
        "updated_at": now,
    }))

    _trigger_design_job(new_job_id, item.get("photo_url"), callback_url, change_notes=body.change_notes)

    return {"job_id": new_job_id, "estimated_seconds": 30}


# ─────────────────────────────────────────────────────────────────────────────
# ORDERS
# ─────────────────────────────────────────────────────────────────────────────

def get_order(order_id: str) -> dict:
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "El pedido no existe"})

    required = ["product_id", "design_job_id", "customer_name", "street", "neighborhood", "city", "state", "zip_code"]
    missing = [f for f in required if not item.get(f)]

    return {
        "order_id": item["order_id"],
        "order_number": item.get("order_number"),
        "status": item.get("status"),
        "whatsapp_phone": item.get("whatsapp_phone"),
        "product_id": item.get("product_id"),
        "product_name": item.get("product_name"),
        "design_job_id": item.get("design_job_id"),
        "payment_id": item.get("payment_id"),
        "balance_payment_id": item.get("balance_payment_id"),
        "customer_name": item.get("customer_name"),
        "street": item.get("street"),
        "neighborhood": item.get("neighborhood"),
        "city": item.get("city"),
        "state": item.get("state"),
        "zip_code": item.get("zip_code"),
        "email": item.get("email"),
        "custom_text": item.get("custom_text"),
        "spotify_ref": item.get("spotify_ref"),
        "missing_fields": missing,
        "ready_to_confirm": len(missing) == 0,
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
    }


def create_agent_order(body: CreateAgentOrderRequest) -> dict:
    # Validate initial payment is approved
    payment = get_payment_status(body.payment_id)
    if payment["status"] != "approved":
        raise HTTPException(status_code=422, detail={"error": "payment_not_approved", "message": "El pago no está confirmado"})

    order_id = str(uuid.uuid4())
    order_number = _order_number()
    now = datetime.now(timezone.utc).isoformat()

    database.orders_table().put_item(Item={
        "order_id": order_id,
        "order_number": order_number,
        "whatsapp_phone": body.whatsapp_phone,
        "payment_id": body.payment_id,
        "status": "apartado",
        "created_at": now,
        "updated_at": now,
    })

    return {
        "order_id": order_id,
        "order_number": order_number,
        "status": "apartado",
    }


def update_agent_order(body: UpdateAgentOrderRequest) -> dict:
    item = database.orders_table().get_item(Key={"order_id": body.order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "El pedido no existe"})

    updatable = [
        "product_id", "design_job_id", "balance_payment_id", "customer_name",
        "street", "neighborhood", "city", "state", "zip_code",
        "custom_text", "spotify_ref", "email",
    ]
    updates = {f: getattr(body, f) for f in updatable if getattr(body, f) is not None}

    if "product_id" in updates:
        updates["product_name"] = _PRODUCTS.get(updates["product_id"], {}).get("name", updates["product_id"])

    if not updates:
        return {"order_id": body.order_id, "updated": []}

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    set_parts, expr_names, expr_vals = [], {}, {}
    for i, (k, v) in enumerate(updates.items()):
        ph, nn = f":v{i}", f"#f{i}"
        expr_names[nn] = k
        expr_vals[ph] = v
        set_parts.append(f"{nn} = {ph}")

    database.orders_table().update_item(
        Key={"order_id": body.order_id},
        UpdateExpression="SET " + ", ".join(set_parts),
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_vals,
    )

    return {"order_id": body.order_id, "updated": list(updates.keys())}


def confirm_agent_order(order_id: str) -> dict:
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "El pedido no existe"})

    if item.get("status") == "en_produccion":
        raise HTTPException(status_code=422, detail={"error": "already_confirmed", "message": "El pedido ya fue confirmado"})

    # Check all required fields are filled
    required = ["product_id", "design_job_id", "customer_name", "street", "neighborhood", "city", "state", "zip_code"]
    missing = [f for f in required if not item.get(f)]
    if missing:
        raise HTTPException(status_code=422, detail={"error": "incomplete_order", "missing_fields": missing, "message": f"Faltan datos: {', '.join(missing)}"})

    # Check design is approved
    design_item = database.designs_table().get_item(Key={"job_id": item["design_job_id"]}).get("Item")
    if not design_item or not design_item.get("approved"):
        raise HTTPException(status_code=422, detail={"error": "design_not_approved", "message": "El diseño no ha sido aprobado"})

    # Check initial payment is approved
    payment = get_payment_status(item["payment_id"])
    if payment["status"] != "approved":
        raise HTTPException(status_code=422, detail={"error": "payment_not_approved", "message": "El pago inicial no está confirmado"})

    # Check balance payment if present
    if item.get("balance_payment_id"):
        balance = get_payment_status(item["balance_payment_id"])
        if balance["status"] != "approved":
            raise HTTPException(status_code=422, detail={"error": "balance_not_approved", "message": "El pago del saldo no está confirmado"})

    now = datetime.now(timezone.utc).isoformat()
    product_name = _PRODUCTS.get(item["product_id"], {}).get("name", item["product_id"])
    database.orders_table().update_item(
        Key={"order_id": order_id},
        UpdateExpression="SET #s = :s, product_name = :pn, design_url = :du, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "en_produccion",
            ":pn": product_name,
            ":du": design_item.get("design_url"),
            ":u": now,
        },
    )

    return {
        "order_id": order_id,
        "order_number": item.get("order_number"),
        "status": "en_produccion",
        "estimated_production_days": 2,
        "estimated_delivery_days": "2-5",
    }


def get_orders_by_phone(phone: str) -> dict:
    resp = database.orders_table().query(
        IndexName="whatsapp_phone-index",
        KeyConditionExpression="whatsapp_phone = :p",
        ExpressionAttributeValues={":p": phone},
    )
    return {"orders": [_serialize_order(o) for o in resp.get("Items", [])]}


def get_orders_by_email(email: str) -> dict:
    resp = database.orders_table().query(
        IndexName="agent_email-index",
        KeyConditionExpression="#email = :e",
        ExpressionAttributeNames={"#email": "email"},
        ExpressionAttributeValues={":e": email},
    )
    return {"orders": [_serialize_order(o) for o in resp.get("Items", [])]}


# ─────────────────────────────────────────────────────────────────────────────
# INTERNALS
# ─────────────────────────────────────────────────────────────────────────────

def _trigger_design_job(
    job_id: str,
    photo_url: str,
    callback_url: Optional[str],
    change_notes: Optional[str] = None,
) -> None:
    """Start design generation in background thread using OpenAI image edit."""
    import threading
    thread = threading.Thread(
        target=_run_design_job,
        args=(job_id, photo_url, callback_url, change_notes),
        daemon=True,
    )
    thread.start()


def _run_design_job(
    job_id: str,
    photo_url: str,
    callback_url: Optional[str],
    change_notes: Optional[str] = None,
) -> None:
    """Download photo, call OpenAI gpt-image-1 edit, upload result, notify platform."""
    import base64

    try:
        # 1. Download the photo
        with httpx.Client(timeout=30) as client:
            photo_resp = client.get(photo_url)
            photo_resp.raise_for_status()
        photo_bytes = photo_resp.content

        # 2. Build prompt
        base_prompt = (
            "Convert this photo into a clean black and white line art drawing suitable for laser cutting. "
            "IMPORTANT: ignore the background completely — only draw the people in the foreground. "
            "Use only thin black lines on a pure white background — no fills, no shading, no gray tones. "
            "Trace the exact outer silhouette and internal details. "
            "For faces: clean jaw outline, elegant almond-shaped eyes, minimal nose, clean lip contour. "
            "DO NOT draw wrinkles, expression lines or skin texture. "
            "The result must look elegant and attractive. White background, black lines only."
        )
        if change_notes:
            base_prompt = f"{base_prompt}\n\nAdditional revision notes: {change_notes}"

        # 3. Call OpenAI
        ai_client = openai.OpenAI(api_key=config.OPENAI_API_KEY)
        response = ai_client.images.edit(
            model="gpt-image-1",
            image=io.BytesIO(photo_bytes),
            prompt=base_prompt,
            quality="high",
            size="1024x1024",
            response_format="b64_json",
        )
        image_bytes = base64.b64decode(response.data[0].b64_json)

        # 4. Upload to S3
        from .. import s3 as s3_helper
        s3_key = f"designs/{job_id}.png"
        s3_helper.upload_bytes(image_bytes, s3_key, content_type="image/png")
        design_url = f"https://{config.S3_BUCKET}.s3.amazonaws.com/{s3_key}"

        # 5. Mark as ready
        database.designs_table().update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, design_url = :u, updated_at = :t",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "ready",
                ":u": design_url,
                ":t": datetime.now(timezone.utc).isoformat(),
            },
        )

        # 6. Notify platform via callback
        if callback_url:
            _notify_platform_design_ready(job_id, design_url, callback_url)

    except Exception as exc:  # noqa: BLE001
        logger.error("Design job %s failed: %s", job_id, exc)
        database.designs_table().update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET #s = :s, error_message = :e, updated_at = :t",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "failed",
                ":e": str(exc),
                ":t": datetime.now(timezone.utc).isoformat(),
            },
        )
        if callback_url:
            _notify_platform_design_failed(callback_url)


def _notify_platform_payment_approved(payment_id: str, callback_url: str) -> None:
    payload = {
        "status": "approved",
        "context_for_agent": {
            "payment_id": payment_id,
            "payment_status": "approved",
        },
    }
    _post_callback(callback_url, payload)


def _notify_platform_design_ready(
    job_id: str, design_url: str, callback_url: str
) -> None:
    payload = {
        "status": "ready",
        "message_to_client": {
            "type": "multi",
            "messages": [
                {"type": "image", "url": design_url, "caption": "Tu diseño personalizado 🎨"},
                {"type": "text", "body": "¿Qué te parece? Responde *sí, me gusta* para confirmarlo\no dime qué quisieras cambiar."},
            ],
        },
        "context_for_agent": {
            "design_job_id": job_id,
            "design_url": design_url,
            "design_status": "awaiting_approval",
        },
    }
    _post_callback(callback_url, payload)


def _notify_platform_design_failed(callback_url: str) -> None:
    payload = {
        "status": "failed",
        "error_message": "No pudimos generar tu diseño. Nuestro equipo te contactará pronto 🙏",
    }
    _post_callback(callback_url, payload)


def _post_callback(url: str, payload: dict) -> None:
    try:
        with httpx.Client(timeout=15) as client:
            r = client.post(
                url,
                json=payload,
                headers={"X-Webhook-Secret": config.AGENT_WEBHOOK_SECRET},
            )
            r.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        logger.error("Callback to platform failed (%s): %s", url, exc)


def _expiration_iso(hours: int) -> str:
    from datetime import timedelta
    dt = datetime.now(timezone.utc) + timedelta(hours=hours)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _map_mp_status(mp_status: str) -> str:
    return {
        "approved": "approved",
        "rejected": "rejected",
        "cancelled": "rejected",
        "expired": "expired",
        "pending": "pending",
        "in_process": "pending",
        "authorized": "pending",
    }.get(mp_status, "pending")


def _serialize_order(o: dict) -> dict:
    return {
        "order_id": o.get("order_id"),
        "order_number": o.get("order_number"),
        "status": o.get("status"),
        "created_at": o.get("created_at"),
        "product_name": o.get("product_name"),
        "tracking_number": o.get("tracking_number"),
        "carrier": o.get("carrier"),
        "tracking_url": o.get("tracking_url"),
        "estimated_delivery": o.get("estimated_delivery"),
    }
