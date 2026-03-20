"""Orders business logic: create, retrieve, MercadoPago webhook."""
import logging
import uuid
from datetime import datetime, timezone

import mercadopago
from botocore.exceptions import ClientError
from fastapi import HTTPException

from .. import config
from .. import database
from ..schemas.orders import CreateOrderRequest
from ..pixel_events import get_event
from ..services.email_marketing_service import send_order_confirmation

from ..catalog import PRODUCTS

logger = logging.getLogger(__name__)


def _compact(d: dict) -> dict:
    """Remove keys whose value is None — DynamoDB rejects null attribute values."""
    return {k: v for k, v in d.items() if v is not None}


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


def create_order(
    body: CreateOrderRequest,
    user_email: str | None,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    # 1. Fetch and validate cart
    cart = database.carts_table().get_item(Key={"cart_id": body.cart_id}).get("Item")
    if not cart or cart.get("status") in ("converted", "expired", "converting"):
        raise HTTPException(status_code=400, detail="Carrito no válido o ya convertido")

    cart_items = cart.get("items", [])
    if not cart_items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    # Atomically claim the cart to prevent double-spend (TOCTOU race condition).
    # Only one concurrent request can transition the cart to "converting".
    try:
        database.carts_table().update_item(
            Key={"cart_id": body.cart_id},
            UpdateExpression="SET #s = :converting",
            ConditionExpression=(
                "attribute_not_exists(#s) OR "
                "(#s <> :converted AND #s <> :expired AND #s <> :converting)"
            ),
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":converting": "converting",
                ":converted": "converted",
                ":expired": "expired",
            },
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(status_code=400, detail="Carrito no válido o ya convertido")
        raise

    # Resolve email: authenticated user > cart email > None
    resolved_email: str | None = user_email or cart.get("email") or None

    order_id = str(uuid.uuid4())
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    # 2. Build MercadoPago preference from cart items
    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    is_production = config.APP_ENV == "production"

    mp_items = []
    total_amount = 0.0
    for ci in cart_items:
        catalog = PRODUCTS.get(ci.get("product_id", "rgb"), PRODUCTS["rgb"])
        qty = int(ci.get("quantity", 1))
        total_amount += catalog["unit_price"] * qty
        mp_items.append({
            "title": catalog["title"],
            "quantity": qty,
            "unit_price": catalog["unit_price"],
            "currency_id": "MXN",
        })

    preference_payload = {
        "items": mp_items,
        "external_reference": payment_id,
        "notification_url": f"{config.BACKEND_URL}/api/orders/webhook/mp",
        "back_urls": {
            "success": f"{config.FRONTEND_URL}/pedido/{order_id}?status=success",
            "failure": f"{config.FRONTEND_URL}/pedido/{order_id}?status=failure",
            "pending": f"{config.FRONTEND_URL}/pedido/{order_id}?status=pending",
        },
        # Only include payer email when we have a real one and we're in production
        **({
            "payer": {"email": resolved_email}
        } if is_production and resolved_email and "@" in resolved_email else {}),
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
    order_item = _compact({
        "order_id": order_id,
        "user_email": resolved_email,
        "items": cart_items,
        "total_amount": str(total_amount),
        "shipping": body.shipping.model_dump(),
        "status": "pending",
        "mp_init_point": preference["init_point"],
        "created_at": now,
        "updated_at": now,
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

    # 4. Persist payment record (same structure as WA payments)
    concept = PRODUCTS[cart_items[0].get("product_id", "rgb")]["title"]
    database.payments_table().put_item(Item={
        "payment_id": payment_id,
        "method": "mercadopago",
        "mp_preference_id": preference["id"],
        "order_id": order_id,
        "amount": str(total_amount),
        "concept": concept,
        "status": "pending",
        "created_at": now,
    })

    # 5. Delete cart — it has been converted to an order, no longer needed
    try:
        database.carts_table().delete_item(Key={"cart_id": body.cart_id})
    except Exception as exc:
        logger.warning("delete_cart failed: %s", exc)

    # 6. Fire CAPI
    get_event("InitiateCheckout").send({
        "order_id": order_id,
        "user_email": resolved_email,
        "total_amount": total_amount,
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


def sync_payment(order_id: str, mp_payment_id: str, user_email: str | None) -> dict:
    """Fetch payment status from MP and update the order (called on MP redirect back)."""
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Order not found")
    if user_email is not None and item.get("user_email") != user_email:
        raise HTTPException(status_code=403, detail="Forbidden")

    # 1. Look up our stored payment record first — used to validate ownership
    payments = database.payments_table().query(
        IndexName="order_id-index",
        KeyConditionExpression="order_id = :ref",
        ExpressionAttributeValues={":ref": order_id},
    ).get("Items", [])
    if not payments:
        raise HTTPException(status_code=404, detail="Payment record not found")
    payment_record = payments[0]

    # 2. Fetch live status from MP
    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    try:
        mp_response = sdk.payment().get(mp_payment_id)["response"]
    except Exception as exc:
        logger.error("MP API error in sync_payment order=%s: %s", order_id, exc)
        raise HTTPException(status_code=502, detail="Error al contactar MercadoPago")

    # 3. Validate that this MP payment belongs to our order (prevents spoofing with an
    #    approved payment_id from a different transaction)
    if mp_response.get("external_reference") != payment_record["payment_id"]:
        logger.warning(
            "sync_payment ownership mismatch: order=%s expected_ref=%s mp_ref=%s",
            order_id, payment_record["payment_id"], mp_response.get("external_reference"),
        )
        raise HTTPException(status_code=400, detail="El pago no corresponde a este pedido")

    mp_status = mp_response.get("status")
    new_status = _map_mp_status(mp_status)
    now = datetime.now(timezone.utc).isoformat()

    database.payments_table().update_item(
        Key={"payment_id": payment_record["payment_id"]},
        UpdateExpression="SET #s = :s, mp_payment_id = :pid, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": new_status, ":pid": str(mp_payment_id), ":u": now},
    )

    table = database.orders_table()
    table.update_item(
        Key={"order_id": order_id},
        UpdateExpression="SET #s = :s, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": new_status, ":u": now},
    )

    updated = table.get_item(Key={"order_id": order_id}).get("Item", {})

    # Fire CAPI Purchase only once — the webhook handler may also fire it
    if mp_status == "approved" and not updated.get("purchase_event_sent"):
        get_event("Purchase").send(updated)
        table.update_item(
            Key={"order_id": order_id},
            UpdateExpression="SET purchase_event_sent = :t",
            ExpressionAttributeValues={":t": True},
        )

    # Send confirmation email only once across sync_payment + webhook
    if mp_status == "approved" and not updated.get("confirmation_email_sent"):
        try:
            send_order_confirmation(order_id)
            table.update_item(
                Key={"order_id": order_id},
                UpdateExpression="SET confirmation_email_sent = :t",
                ExpressionAttributeValues={":t": True},
            )
        except Exception as exc:
            logger.warning("confirmation email failed for order=%s: %s", order_id, exc)

    return updated


def process_mp_webhook(data: dict) -> dict:
    if data.get("type") != "payment":
        return {"ok": True}

    mp_payment_id = (data.get("data") or {}).get("id")
    if not mp_payment_id:
        return {"ok": True}

    sdk = mercadopago.SDK(config.MP_ACCESS_TOKEN)
    payment = sdk.payment().get(mp_payment_id)["response"]
    our_payment_id = payment.get("external_reference")  # our internal pay_xxx
    mp_status = payment.get("status")

    if not our_payment_id:
        return {"ok": True}

    payment_item = database.payments_table().get_item(Key={"payment_id": our_payment_id}).get("Item")
    if not payment_item:
        return {"ok": True}

    order_id = payment_item["order_id"]
    new_status = _map_mp_status(mp_status)
    now = datetime.now(timezone.utc).isoformat()

    database.payments_table().update_item(
        Key={"payment_id": our_payment_id},
        UpdateExpression="SET #s = :s, mp_payment_id = :pid, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": new_status, ":pid": str(mp_payment_id), ":u": now},
    )

    database.orders_table().update_item(
        Key={"order_id": order_id},
        UpdateExpression="SET #s = :s, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": new_status, ":u": now},
    )

    if mp_status == "approved":
        order = database.orders_table().get_item(Key={"order_id": order_id}).get("Item", {})
        if not order.get("purchase_event_sent"):
            get_event("Purchase").send(order)
            database.orders_table().update_item(
                Key={"order_id": order_id},
                UpdateExpression="SET purchase_event_sent = :t",
                ExpressionAttributeValues={":t": True},
            )
        if not order.get("confirmation_email_sent"):
            try:
                send_order_confirmation(order_id)
                database.orders_table().update_item(
                    Key={"order_id": order_id},
                    UpdateExpression="SET confirmation_email_sent = :t",
                    ExpressionAttributeValues={":t": True},
                )
            except Exception as exc:
                logger.warning("confirmation email failed for order=%s: %s", order_id, exc)

    return {"ok": True}
