"""Cart (abandoned checkout) business logic."""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from .. import config, database
from ..email_sender import send_abandoned_cart_email
from ..schemas.carts import UpsertCartRequest

logger = logging.getLogger(__name__)

_CART_TTL_DAYS = 30


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ttl() -> int:
    """Unix timestamp 30 days from now — used as DynamoDB TTL."""
    return int((datetime.now(timezone.utc) + timedelta(days=_CART_TTL_DAYS)).timestamp())


def _compact(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None}


def upsert_cart(body: UpsertCartRequest) -> dict:
    """Create a new cart draft or update an existing one (idempotent via cart_id)."""
    table = database.carts_table()
    items_data = [_compact(item.model_dump()) for item in body.items]

    # Update existing cart when the frontend sends back the cart_id it received
    if body.cart_id:
        existing = table.get_item(Key={"cart_id": body.cart_id}).get("Item")
        if existing and existing.get("status") not in ("converted", "expired"):
            updates: dict = {"updated_at": _now_iso(), "items": items_data}

            set_expr = ", ".join(f"#k_{k} = :v_{k}" for k in updates)
            expr_names = {f"#k_{k}": k for k in updates}
            expr_values = {f":v_{k}": v for k, v in updates.items()}

            table.update_item(
                Key={"cart_id": body.cart_id},
                UpdateExpression=f"SET {set_expr}",
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values,
            )
            return {"cart_id": body.cart_id}

    # Create new cart
    cart_id = str(uuid.uuid4())
    table.put_item(Item=_compact({
        "cart_id": cart_id,
        "email": str(body.email),
        "items": items_data,
        "status": "active",
        "utm_source": body.utm_source,
        "utm_medium": body.utm_medium,
        "utm_campaign": body.utm_campaign,
        "utm_content": body.utm_content,
        "utm_term": body.utm_term,
        "fbclid": body.fbclid,
        "fbp": body.fbp,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "expires_ttl": _ttl(),
    }))
    return {"cart_id": cart_id}


def get_cart(cart_id: str) -> dict:
    """Return the cart fields needed to restore a checkout session."""
    item = database.carts_table().get_item(Key={"cart_id": cart_id}).get("Item")
    if not item or item.get("status") in ("converted", "expired"):
        raise HTTPException(status_code=404, detail="Cart not found or already converted")
    return {
        "cart_id": item["cart_id"],
        "email": item.get("email", ""),
        "items": item.get("items", []),
    }


def convert_cart(cart_id: str) -> None:
    """Mark cart as converted (order placed). Non-critical — swallows errors."""
    try:
        database.carts_table().update_item(
            Key={"cart_id": cart_id},
            UpdateExpression="SET #s = :s, converted_at = :ca",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "converted",
                ":ca": _now_iso(),
            },
        )
    except Exception as exc:
        logger.warning("convert_cart failed for %s: %s", cart_id, exc)


def process_abandoned_carts() -> None:
    """Scheduled job — runs every 15 min.
    Scans active/partially-sent carts and fires the next recovery email."""
    table = database.carts_table()
    now = datetime.now(timezone.utc)

    try:
        response = table.scan(
            FilterExpression="#s IN (:a, :e1, :e2)",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":a": "active",
                ":e1": "email_1_sent",
                ":e2": "email_2_sent",
            },
        )
    except Exception as exc:
        logger.error("Failed to scan carts table: %s", exc)
        return

    for cart in response.get("Items", []):
        cart_id = cart["cart_id"]
        status = cart.get("status")
        email = cart.get("email")
        cart_items = cart.get("items", [])
        product_id = cart_items[0].get("product_id", "rgb") if cart_items else "rgb"

        if not email:
            continue

        try:
            if status == "active":
                updated_at = datetime.fromisoformat(cart["updated_at"])
                if now - updated_at < timedelta(hours=1):
                    continue
                if send_abandoned_cart_email(email, cart_id, step=1, product_id=product_id):
                    table.update_item(
                        Key={"cart_id": cart_id},
                        UpdateExpression="SET #s = :s, email_1_sent_at = :t",
                        ExpressionAttributeNames={"#s": "status"},
                        ExpressionAttributeValues={":s": "email_1_sent", ":t": now.isoformat()},
                    )

            elif status == "email_1_sent":
                sent_at = datetime.fromisoformat(cart["email_1_sent_at"])
                if now - sent_at < timedelta(hours=23):
                    continue
                if send_abandoned_cart_email(email, cart_id, step=2, product_id=product_id):
                    table.update_item(
                        Key={"cart_id": cart_id},
                        UpdateExpression="SET #s = :s, email_2_sent_at = :t",
                        ExpressionAttributeNames={"#s": "status"},
                        ExpressionAttributeValues={":s": "email_2_sent", ":t": now.isoformat()},
                    )

            elif status == "email_2_sent":
                sent_at = datetime.fromisoformat(cart["email_2_sent_at"])
                if now - sent_at < timedelta(hours=47):
                    continue
                if send_abandoned_cart_email(email, cart_id, step=3, product_id=product_id):
                    table.update_item(
                        Key={"cart_id": cart_id},
                        UpdateExpression="SET #s = :s, email_3_sent_at = :t",
                        ExpressionAttributeNames={"#s": "status"},
                        ExpressionAttributeValues={":s": "email_3_sent", ":t": now.isoformat()},
                    )

        except Exception as exc:
            logger.warning("Error processing cart %s: %s", cart_id, exc)
