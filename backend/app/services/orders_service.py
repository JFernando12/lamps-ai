"""Orders business logic: create, retrieve, MercadoPago webhook."""
import logging
import uuid
from datetime import datetime, timezone

import mercadopago
from fastapi import HTTPException

from .. import config
from .. import database
from .. import s3 as s3_helper
from ..schemas.orders import CreateOrderRequest
from ..pixel_events import get_event

logger = logging.getLogger(__name__)


def _compact(d: dict) -> dict:
    """Remove keys whose value is None — DynamoDB rejects null attribute values."""
    return {k: v for k, v in d.items() if v is not None}


def create_order(
    body: CreateOrderRequest,
    user_email: str,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    order_id = str(uuid.uuid4())

    # Build MercadoPago preference
    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    is_local = "localhost" in config.FRONTEND_URL or "127.0.0.1" in config.FRONTEND_URL
    preference_payload = {
        "items": [{
            "title": body.product_name,
            "quantity": body.quantity,
            "unit_price": body.unit_price,
            "currency_id": "MXN",
        }],
        "external_reference": order_id,
        "back_urls": {
            "success": f"{config.FRONTEND_URL}/pedido/{order_id}?status=success",
            "failure": f"{config.FRONTEND_URL}/pedido/{order_id}?status=failure",
            "pending": f"{config.FRONTEND_URL}/pedido/{order_id}?status=pending",
        },
        # In sandbox, setting payer.email to a real email causes "Una de las partes es de prueba"
        # Only set payer email in production (non-sandbox) mode
        **({"payer": {"email": user_email}} if not is_local else {}),
        # auto_return works with public URLs; in local dev MercadoPago won't redirect
        # automatically but the user can click "Volver al sitio" to trigger back_urls
        "auto_return": "approved",
    }
    pref_response = sdk.preference().create(preference_payload)

    if pref_response["status"] not in (200, 201):
        logger.error("MercadoPago error: status=%s body=%s", pref_response["status"], pref_response.get("response"))
        raise HTTPException(
            status_code=502,
            detail=f"MercadoPago error {pref_response['status']}: {pref_response.get('response')}",
        )

    preference = pref_response["response"]

    # Persist order (compact removes None values — DynamoDB rejects nulls)
    item = _compact({
        "order_id": order_id,
        "user_email": user_email,
        "photo_id": body.photo_id,
        "preview_id": body.preview_id,
        "engraving_text": body.engraving_text,
        "spotify_url": body.spotify_url,
        "product_name": body.product_name,
        "quantity": body.quantity,
        "unit_price": str(body.unit_price),
        "shipping": body.shipping.model_dump(),
        "status": "pending_payment",
        "mp_preference_id": preference["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        # Attribution
        "utm_source": body.utm_source,
        "utm_medium": body.utm_medium,
        "utm_campaign": body.utm_campaign,
        "utm_content": body.utm_content,
        "utm_term": body.utm_term,
        "fbclid": body.fbclid,
        "fbp": body.fbp,
        "client_ip": client_ip,
        "user_agent": user_agent,
    })
    database.orders_table().put_item(Item=item)

    # Link source asset → order
    if body.preview_id:
        database.previews_table().update_item(
            Key={"preview_id": body.preview_id},
            UpdateExpression="SET order_id = :oid",
            ExpressionAttributeValues={":oid": order_id},
        )
    if body.photo_id:
        database.photos_table().update_item(
            Key={"photo_id": body.photo_id},
            UpdateExpression="SET order_id = :oid",
            ExpressionAttributeValues={":oid": order_id},
        )
    get_event("InitiateCheckout").send({
        "order_id": order_id,
        "user_email": user_email,
        "unit_price": body.unit_price,
        "quantity": body.quantity,
        "checkout_event_id": body.checkout_event_id,
        "client_ip": client_ip,
        "user_agent": user_agent,
        "fbclid": body.fbclid,
        "fbp": body.fbp,
    })
    return {
        "order_id": order_id,
        "mp_init_point": preference["init_point"],
        "mp_sandbox_init_point": preference.get("sandbox_init_point", preference["init_point"]),
        "mp_preference_id": preference["id"],
    }


def _attach_render_url(order: dict) -> None:
    """Mutates order dict in-place, adding render_url if available."""
    pid = order.get("preview_id")
    if not pid:
        return
    try:
        prev = database.previews_table().get_item(Key={"preview_id": pid}).get("Item")
        if prev and prev.get("s3_render_key"):
            order["render_url"] = s3_helper.get_presigned_url(prev["s3_render_key"])
    except Exception:
        pass


def get_my_orders(user_email: str) -> list:
    response = database.orders_table().query(
        IndexName="email-index",
        KeyConditionExpression="user_email = :email",
        ExpressionAttributeValues={":email": user_email},
    )
    orders = response.get("Items", [])
    for o in orders:
        _attach_render_url(o)
    return orders


def get_order(order_id: str, user_email: str, is_admin: bool = False) -> dict:
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Order not found")
    if item["user_email"] != user_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")
    _attach_render_url(item)
    return item


def sync_payment(order_id: str, payment_id: str, user_email: str) -> dict:
    """Manually fetch payment status from MP and update the order (used on redirect back)."""
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Order not found")
    if item["user_email"] != user_email:
        raise HTTPException(status_code=403, detail="Forbidden")

    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    payment = sdk.payment().get(payment_id)["response"]
    mp_status = payment.get("status")

    new_status = {
        "approved": "paid",
        "rejected": "payment_failed",
        "pending": "pending_payment",
        "in_process": "pending_payment",
    }.get(mp_status, "pending_payment")

    table = database.orders_table()
    table.update_item(
        Key={"order_id": order_id},
        UpdateExpression="SET #s = :s, mp_payment_id = :pid, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": new_status,
            ":pid": str(payment_id),
            ":u": datetime.now(timezone.utc).isoformat(),
        },
    )

    if mp_status == "approved":
        pid = item.get("preview_id")
        if pid:
            database.previews_table().update_item(
                Key={"preview_id": pid},
                UpdateExpression="SET purchased = :t",
                ExpressionAttributeValues={":t": True},
            )

    updated = table.get_item(Key={"order_id": order_id}).get("Item", {})
    _attach_render_url(updated)

    if mp_status == "approved":
        get_event("Purchase").send(updated)

    return updated


def process_mp_webhook(data: dict) -> dict:
    if data.get("type") != "payment":
        return {"ok": True}

    payment_id = data.get("data", {}).get("id")
    if not payment_id:
        return {"ok": True}

    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    payment = sdk.payment().get(payment_id)["response"]
    order_id = payment.get("external_reference")
    mp_status = payment.get("status")

    if not order_id:
        return {"ok": True}

    new_status = {
        "approved": "paid",
        "rejected": "payment_failed",
        "pending": "pending_payment",
        "in_process": "pending_payment",
    }.get(mp_status, "pending_payment")

    table = database.orders_table()
    table.update_item(
        Key={"order_id": order_id},
        UpdateExpression="SET #s = :s, mp_payment_id = :pid, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": new_status,
            ":pid": str(payment_id),
            ":u": datetime.now(timezone.utc).isoformat(),
        },
    )

    if mp_status == "approved":
        order = table.get_item(Key={"order_id": order_id}).get("Item", {})
        pid = order.get("preview_id")
        if pid:
            database.previews_table().update_item(
                Key={"preview_id": pid},
                UpdateExpression="SET purchased = :t",
                ExpressionAttributeValues={":t": True},
            )
        get_event("Purchase").send(order)

    return {"ok": True}
