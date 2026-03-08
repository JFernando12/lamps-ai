"""Orders business logic: create, retrieve, MercadoPago webhook."""
import logging
import uuid
from datetime import datetime, timezone

import mercadopago
from fastapi import HTTPException

from .. import config
from .. import database
from ..schemas.orders import CreateOrderRequest
from ..pixel_events import get_event

logger = logging.getLogger(__name__)

_PRODUCT_CATALOG: dict[str, dict] = {
    "rgb":    {"name": "L\u00e1mpara acr\u00edlica LED RGB",  "price": 598.0},
    "madera": {"name": "L\u00e1mpara base de madera", "price": 719.0},
}


def _compact(d: dict) -> dict:
    """Remove keys whose value is None — DynamoDB rejects null attribute values."""
    return {k: v for k, v in d.items() if v is not None}


def create_order(
    body: CreateOrderRequest,
    user_email: str | None,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    # 1. Fetch and validate cart
    cart = database.carts_table().get_item(Key={"cart_id": body.cart_id}).get("Item")
    if not cart or cart.get("status") in ("converted", "expired"):
        raise HTTPException(status_code=400, detail="Carrito no válido o ya convertido")

    cart_items = cart.get("items", [])
    if not cart_items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    # Resolve email: authenticated user > cart email > None
    resolved_email: str | None = user_email or cart.get("email") or None

    order_id = str(uuid.uuid4())

    # 2. Build MercadoPago preference from cart items
    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    is_local = "localhost" in config.FRONTEND_URL or "127.0.0.1" in config.FRONTEND_URL

    mp_items = []
    total_amount = 0.0
    for ci in cart_items:
        catalog = _PRODUCT_CATALOG.get(ci.get("product_id", "rgb"), _PRODUCT_CATALOG["rgb"])
        qty = int(ci.get("quantity", 1))
        mp_items.append({
            "title": catalog["name"],
            "quantity": qty,
            "unit_price": catalog["price"],
            "currency_id": "MXN",
        })
        total_amount += catalog["price"] * qty

    preference_payload = {
        "items": mp_items,
        "external_reference": order_id,
        "back_urls": {
            "success": f"{config.FRONTEND_URL}/pedido/{order_id}?status=success",
            "failure": f"{config.FRONTEND_URL}/pedido/{order_id}?status=failure",
            "pending": f"{config.FRONTEND_URL}/pedido/{order_id}?status=pending",
        },
        # Only include payer email when we have a real one and we're in production
        **({
            "payer": {"email": resolved_email}
        } if not is_local and resolved_email and "@" in resolved_email else {}),
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

    # 3. Persist order
    total_qty = sum(int(ci.get("quantity", 1)) for ci in cart_items)
    first_catalog = _PRODUCT_CATALOG.get(cart_items[0].get("product_id", "rgb"), _PRODUCT_CATALOG["rgb"])
    display_name = first_catalog["name"] if len(cart_items) == 1 else f"{first_catalog['name']} +{len(cart_items)-1} más"

    order_item = _compact({
        "order_id": order_id,
        "user_email": resolved_email,
        "cart_id": body.cart_id,
        "items": cart_items,
        "total_amount": str(total_amount),
        "product_name": display_name,
        "quantity": total_qty,
        "unit_price": str(total_amount),
        "shipping": body.shipping.model_dump(),
        "status": "pending_payment",
        "mp_preference_id": preference["id"],
        "mp_init_point": preference["init_point"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        # Attribution — pulled from cart so the frontend doesn't re-send it
        "utm_source": cart.get("utm_source"),
        "utm_medium": cart.get("utm_medium"),
        "utm_campaign": cart.get("utm_campaign"),
        "utm_content": cart.get("utm_content"),
        "utm_term": cart.get("utm_term"),
        "fbclid": cart.get("fbclid"),
        "fbp": cart.get("fbp"),
        "client_ip": client_ip,
        "user_agent": user_agent,
    })
    database.orders_table().put_item(Item=order_item)

    # 4. Link each photo → order
    for ci in cart_items:
        if ci.get("photo_id"):
            database.photos_table().update_item(
                Key={"photo_id": ci["photo_id"]},
                UpdateExpression="SET order_id = :oid",
                ExpressionAttributeValues={":oid": order_id},
            )

    # 5. Convert cart (non-critical)
    try:
        database.carts_table().update_item(
            Key={"cart_id": body.cart_id},
            UpdateExpression="SET #s = :s, converted_at = :ca",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "converted",
                ":ca": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as exc:
        logger.warning("convert_cart failed: %s", exc)

    # 6. Fire CAPI
    total_qty = sum(int(ci.get("quantity", 1)) for ci in cart_items)
    get_event("InitiateCheckout").send({
        "order_id": order_id,
        "user_email": resolved_email,
        "unit_price": total_amount,
        "quantity": total_qty,
        "checkout_event_id": body.checkout_event_id,
        "client_ip": client_ip,
        "user_agent": user_agent,
        "fbclid": cart.get("fbclid"),
        "fbp": cart.get("fbp"),
    })

    return {
        "order_id": order_id,
        "mp_init_point": preference["init_point"],
        "mp_sandbox_init_point": preference.get("sandbox_init_point", preference["init_point"]),
        "mp_preference_id": preference["id"],
    }


def get_my_orders(user_email: str) -> list:
    response = database.orders_table().query(
        IndexName="email-index",
        KeyConditionExpression="user_email = :email",
        ExpressionAttributeValues={":email": user_email},
    )
    orders = response.get("Items", [])
    return orders


def get_order(order_id: str, user_email: str | None, is_admin: bool = False) -> dict:
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Order not found")
    # Allow access if: admin, anonymous request (UUID is unguessable), or email matches
    if not is_admin and user_email is not None and item.get("user_email") != user_email:
        raise HTTPException(status_code=403, detail="Forbidden")
    return item


def sync_payment(order_id: str, payment_id: str, user_email: str | None) -> dict:
    """Manually fetch payment status from MP and update the order (used on redirect back)."""
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Order not found")
    # Allow sync if anonymous (UUID is unguessable) or email matches
    if user_email is not None and item.get("user_email") != user_email:
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

    updated = table.get_item(Key={"order_id": order_id}).get("Item", {})

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
        get_event("Purchase").send(order)

    return {"ok": True}
