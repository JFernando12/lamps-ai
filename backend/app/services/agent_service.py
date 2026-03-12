"""Agent platform service: payments, designs, orders — called by the AI agent via API key."""
import base64
import io
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import mercadopago
import openai
from fastapi import HTTPException

from .. import config, database
from .. import s3 as s3_helper
from ..catalog import PRODUCTS
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


def _compact(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None}


def _generate_unique_order_id() -> str:
    """Generate a unique human-readable order ID, guaranteed unique in DynamoDB."""
    from boto3.dynamodb.conditions import Attr
    year = datetime.now(timezone.utc).year
    for _ in range(10):  # retry up to 10 times on collision
        seq = uuid.uuid4().hex[:6].upper()
        order_id = f"TDG-{year}-{seq}"
        try:
            database.orders_table().put_item(
                Item={"order_id": order_id, "_reserved": True},
                ConditionExpression=Attr("order_id").not_exists(),
            )
            return order_id
        except database.orders_table().meta.client.exceptions.ConditionalCheckFailedException:
            continue
    raise RuntimeError("No se pudo generar un order_id único después de 10 intentos")


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
        "expiration_date_to": _expiration_iso(body.expiration_hours),
        "expires": True,
    }

    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    payload["external_reference"] = payment_id

    resp = sdk.preference().create(payload)
    if resp["status"] not in (200, 201):
        logger.error("MP create_preference error: %s", resp)
        raise HTTPException(status_code=502, detail="Error al crear preferencia de pago")

    pref = resp["response"]

    # Persist for later status checks
    database.payments_table().put_item(Item=_compact({
        "payment_id": payment_id,
        "method": "mercadopago",
        "mp_preference_id": pref["id"],
        "order_id": body.order_id,
        "whatsapp_phone": body.whatsapp_phone,
        "amount": str(body.amount),
        "concept": body.concept,
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

        # external_reference == payment_id, so result is always exactly this payment
        search = sdk.payment().search({"external_reference": payment_id})
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
        "method": item.get("method"),
        "concept": item.get("concept"),
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
    # external_reference is our payment_id — direct 1-to-1 lookup, no ambiguity
    our_payment_id = payment.get("external_reference")
    mp_status = payment.get("status")

    if not our_payment_id:
        return {"ok": True}

    item = database.payments_table().get_item(Key={"payment_id": our_payment_id}).get("Item")
    if not item:
        return {"ok": True}

    new_status = _map_mp_status(mp_status)
    database.payments_table().update_item(
        Key={"payment_id": our_payment_id},
        UpdateExpression="SET #s = :s, mp_payment_id = :pid, updated_at = :u",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": new_status,
            ":pid": str(payment_mp_id),
            ":u": datetime.now(timezone.utc).isoformat(),
        },
    )
    if new_status == "approved" and item.get("callback_url"):
        _notify_platform_payment_approved(our_payment_id, item["callback_url"])

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
        "order_id": body.order_id,
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
                "order_id": i.get("order_id"),
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
    # Validate order exists
    order = database.orders_table().get_item(Key={"order_id": body.order_id}).get("Item")
    if not order:
        raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "El pedido no existe"})

    # Validate approved payments total at least $100 MXN
    order_payments = _get_order_payments(body.order_id)
    approved_total = sum(float(p.get("amount", 0)) for p in order_payments if p.get("status") == "approved")
    if approved_total < 100:
        raise HTTPException(
            status_code=422,
            detail={"error": "payment_required", "message": f"Se requiere un mínimo de $100 MXN pagados para crear un diseño (actual: ${approved_total:.2f} MXN)"},
        )

    # Download the WhatsApp photo and upload to S3 to get a permanent photo_id.
    with httpx.Client(timeout=30) as client:
        photo_resp = client.get(body.photo_url)
        photo_resp.raise_for_status()
        photo_bytes = photo_resp.content
        photo_content_type = photo_resp.headers.get("content-type", "image/jpeg").split(";")[0]

    photo_id = str(uuid.uuid4())
    ext = photo_content_type.split("/")[-1]
    s3_key = f"photos/{photo_id}.{ext}"
    s3_helper.upload_bytes(photo_bytes, s3_key, content_type=photo_content_type)
    s3_photo_url = f"https://{config.S3_BUCKET}.s3.amazonaws.com/{s3_key}"

    now = datetime.now(timezone.utc).isoformat()
    database.photos_table().put_item(Item={
        "photo_id": photo_id,
        "s3_key": s3_key,
        "created_at": now,
    })

    # Write photo_id into items[0] on the order (same structure as web orders)
    current_item = (order.get("items") or [{}])[0]
    database.orders_table().update_item(
        Key={"order_id": body.order_id},
        UpdateExpression="SET #items = :items",
        ExpressionAttributeNames={"#items": "items"},
        ExpressionAttributeValues={":items": [_compact({**current_item, "photo_id": photo_id})]},
    )

    design_id = f"dsn_{uuid.uuid4().hex[:10]}"
    callback_url: Optional[str] = None
    if body._channel_id and body._session_id:
        callback_url = (
            f"{config.AI_PLATFORM_BASE_URL}/whatsapp/webhooks/async"
            f"/{body._channel_id}/{body._session_id}"
        )

    database.designs_table().put_item(Item=_compact({
        "design_id": design_id,
        "order_id": body.order_id,
        "photo_url": s3_photo_url,
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

    _trigger_design_job(design_id, s3_photo_url, callback_url)

    return {"design_id": design_id, "estimated_seconds": 30}


def get_design_status(design_id: str) -> dict:
    item = database.designs_table().get_item(Key={"design_id": design_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    return {
        "design_id": design_id,
        "status": item.get("status"),
        "design_url": item.get("design_url"),
        "iteration": int(item.get("iteration", 1)),
        "change_notes": item.get("change_notes"),
        "revision_history": item.get("revision_history", []),
        "error_message": item.get("error_message"),
    }


def approve_design(design_id: str) -> dict:
    item = database.designs_table().get_item(Key={"design_id": design_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    if item.get("status") != "ready":
        raise HTTPException(status_code=422, detail={"error": "design_not_ready", "message": "El diseño aún no está listo"})

    database.designs_table().update_item(
        Key={"design_id": design_id},
        UpdateExpression="SET approved = :a, updated_at = :u",
        ExpressionAttributeValues={
            ":a": True,
            ":u": datetime.now(timezone.utc).isoformat(),
        },
    )
    return {"approved": True}


def request_revision(design_id: str, body: RevisionDesignRequest) -> dict:
    item = database.designs_table().get_item(Key={"design_id": design_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")

    now = datetime.now(timezone.utc).isoformat()
    prev_iteration = int(item.get("iteration", 1))
    callback_url: Optional[str] = item.get("callback_url")

    # Append current version to revision history before overwriting
    history_entry = {
        "iteration": prev_iteration,
        "design_url": item.get("design_url"),
        "change_notes": item.get("change_notes"),
        "created_at": item.get("updated_at", item.get("created_at")),
    }
    revision_history = item.get("revision_history", [])
    revision_history.append(history_entry)

    database.designs_table().update_item(
        Key={"design_id": design_id},
        UpdateExpression=(
            "SET #s = :s, iteration = :it, design_url = :du, "
            "error_message = :em, approved = :ap, change_notes = :cn, "
            "revision_history = :rh, updated_at = :u"
        ),
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "processing",
            ":it": prev_iteration + 1,
            ":du": None,
            ":em": None,
            ":ap": False,
            ":cn": body.change_notes,
            ":rh": revision_history,
            ":u": now,
        },
    )

    _trigger_design_job(
        design_id,
        item.get("photo_url"),
        callback_url,
        change_notes=body.change_notes,
        previous_design_url=item.get("design_url"),
        revision_history=revision_history,
    )

    return {"design_id": design_id, "iteration": prev_iteration + 1, "estimated_seconds": 30}


# ─────────────────────────────────────────────────────────────────────────────
# ORDERS
# ─────────────────────────────────────────────────────────────────────────────

# Shipping fields (same names in API and in the shipping sub-object)
_SHIPPING_FIELDS = {"full_name", "address", "city", "state", "zip_code"}


def _build_missing(item: dict) -> list[str]:
    """Return list of missing required fields using shipping sub-object."""
    shipping = item.get("shipping") or {}
    first_item = (item.get("items") or [{}])[0]
    missing = []
    if not first_item.get("product_id"):
        missing.append("product_id")
    if not item.get("design_id"):
        missing.append("design_id")
    if not shipping.get("full_name"):
        missing.append("full_name")
    if not shipping.get("address"):
        missing.append("address")
    if not shipping.get("city"):
        missing.append("city")
    if not shipping.get("state"):
        missing.append("state")
    if not shipping.get("zip_code"):
        missing.append("zip_code")
    return missing


def get_order(order_id: str) -> dict:
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "El pedido no existe"})

    # items[0] holds product details pre- and post-confirm (unit_price added at confirm)
    first_item = (item.get("items") or [{}])[0]

    missing = _build_missing(item)
    shipping = item.get("shipping") or {}

    order_payments = _get_order_payments(order_id)
    product_id = first_item["product_id"]
    product_info = PRODUCTS[product_id]
    full_price = product_info["unit_price"]
    approved_total = sum(float(p.get("amount", 0)) for p in order_payments if p.get("status") == "approved")

    return {
        "order_id": item["order_id"],
        "status": item.get("status"),
        "whatsapp_phone": item.get("whatsapp_phone"),
        "product_id": product_id,
        "product_name": product_info["title"],
        "design_id": item.get("design_id"),
        "payments": [
            {
                "payment_id": p["payment_id"],
                "method": p.get("method"),
                "concept": p.get("concept"),
                "amount": float(p.get("amount", 0)),
                "status": p.get("status"),
            }
            for p in order_payments
        ],
        "paid_total": approved_total,
        "price_required": full_price,
        "payment_complete": approved_total >= full_price if full_price > 0 else False,
        "full_name": shipping.get("full_name"),
        "address": shipping.get("address"),
        "city": shipping.get("city"),
        "state": shipping.get("state"),
        "zip_code": shipping.get("zip_code"),
        "email": item.get("email"),
        "engraving_text": first_item.get("engraving_text"),
        "spotify_url": first_item.get("spotify_url"),
        "missing_fields": missing,
        "ready_to_confirm": len(missing) == 0,
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
    }


def create_agent_order(body: CreateAgentOrderRequest) -> dict:
    order_id = _generate_unique_order_id()
    now = datetime.now(timezone.utc).isoformat()

    database.orders_table().put_item(Item={
        "order_id": order_id,
        "whatsapp_phone": body.whatsapp_phone,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    })

    return {
        "order_id": order_id,
        "status": "pending",
    }


def update_agent_order(body: UpdateAgentOrderRequest) -> dict:
    item = database.orders_table().get_item(Key={"order_id": body.order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "El pedido no existe"})

    _ALL_FIELDS = list(_SHIPPING_FIELDS) + ["design_id", "email", "product_id", "engraving_text", "spotify_url"]
    received = {f: getattr(body, f) for f in _ALL_FIELDS if getattr(body, f) is not None}

    if not received:
        return {"order_id": body.order_id, "updated": []}

    now = datetime.now(timezone.utc).isoformat()

    # Fields that go into items[0] (product details)
    _ITEM_FIELDS = {"product_id", "engraving_text", "spotify_url"}
    item_updates = {f: received[f] for f in _ITEM_FIELDS if f in received}
    order_updates = {f: v for f, v in received.items() if f not in _ITEM_FIELDS}

    top_level_updates: dict = {"updated_at": now}
    shipping_updates: dict = {}

    for f, v in order_updates.items():
        if f in _SHIPPING_FIELDS:
            shipping_updates[f] = v
        else:
            top_level_updates[f] = v

    if shipping_updates:
        current_shipping = item.get("shipping") or {}
        new_shipping = {**current_shipping, **shipping_updates}
        if "phone" not in new_shipping and item.get("whatsapp_phone"):
            new_shipping["phone"] = item["whatsapp_phone"]
        new_shipping.setdefault("country", "México")
        top_level_updates["shipping"] = new_shipping

    # Merge item_updates into items[0], preserving existing fields
    if item_updates:
        current_item = (item.get("items") or [{}])[0]
        new_item = _compact({**current_item, **item_updates})
        top_level_updates["items"] = [new_item]

    set_parts, expr_names, expr_vals = [], {}, {}
    for i, (k, v) in enumerate(top_level_updates.items()):
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

    return {"order_id": body.order_id, "updated": list(received.keys())}


def confirm_agent_order(order_id: str) -> dict:
    item = database.orders_table().get_item(Key={"order_id": order_id}).get("Item")
    if not item:
        raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "El pedido no existe"})

    if item.get("status") == "in_process":
        raise HTTPException(status_code=422, detail={"error": "already_confirmed", "message": "El pedido ya fue confirmado"})

    # Check all required fields are filled
    missing = _build_missing(item)
    if missing:
        raise HTTPException(status_code=422, detail={"error": "incomplete_order", "missing_fields": missing, "message": f"Faltan datos: {', '.join(missing)}"})

    # Check design is approved
    design_item = database.designs_table().get_item(Key={"design_id": item["design_id"]}).get("Item")
    if not design_item or not design_item.get("approved"):
        raise HTTPException(status_code=422, detail={"error": "design_not_approved", "message": "El diseño no ha sido aprobado"})

    # Check all payments for the order cover the full product cost
    first_item = (item.get("items") or [{}])[0]
    product_id = first_item.get("product_id", "rgb")
    product_info = PRODUCTS.get(product_id, PRODUCTS["rgb"])
    full_price = product_info.get("unit_price", 0)
    order_payments = _get_order_payments(order_id)
    approved_total = sum(float(p.get("amount", 0)) for p in order_payments if p.get("status") == "approved")
    if approved_total < full_price:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "insufficient_payment",
                "message": f"El total pagado (${approved_total:.2f} MXN) no cubre el precio del producto (${full_price:.2f} MXN)",
                "paid": approved_total,
                "required": full_price,
            },
        )

    now = datetime.now(timezone.utc).isoformat()
    database.orders_table().update_item(
        Key={"order_id": order_id},
        UpdateExpression="SET #s = :s, design_url = :du, #items = :items, total_amount = :ta, user_email = :ue, updated_at = :u",
        ExpressionAttributeNames={"#s": "status", "#items": "items"},
        ExpressionAttributeValues={
            ":s": "in_process",
            ":du": design_item.get("design_url"),
            ":items": [first_item],
            ":ta": str(full_price),
            ":ue": item.get("email"),
            ":u": now,
        },
    )

    return {
        "order_id": order_id,
        "status": "in_process",
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
        IndexName="email-index",
        KeyConditionExpression="user_email = :e",
        ExpressionAttributeValues={":e": email},
    )
    return {"orders": [_serialize_order(o) for o in resp.get("Items", [])]}


# ─────────────────────────────────────────────────────────────────────────────
# INTERNALS
# ─────────────────────────────────────────────────────────────────────────────

def _trigger_design_job(
    design_id: str,
    photo_url: str,
    callback_url: Optional[str],
    change_notes: Optional[str] = None,
    previous_design_url: Optional[str] = None,
    revision_history: Optional[list] = None,
) -> None:
    """Start design generation in background thread using OpenAI image edit."""
    import threading
    thread = threading.Thread(
        target=_run_design_job,
        args=(design_id, photo_url, callback_url, change_notes, previous_design_url, revision_history),
        daemon=True,
    )
    thread.start()


def _run_design_job(
    design_id: str,
    photo_url: str,
    callback_url: Optional[str],
    change_notes: Optional[str] = None,
    previous_design_url: Optional[str] = None,
    revision_history: Optional[list] = None,
) -> None:
    """Download photo, call OpenAI gpt-image-1 edit, upload result, notify platform."""

    try:
        # 1. Download the original photo
        with httpx.Client(timeout=30) as client:
            photo_resp = client.get(photo_url)
            photo_resp.raise_for_status()
            photo_bytes = photo_resp.content

            # Download previous design if this is a revision
            prev_design_bytes: Optional[bytes] = None
            if previous_design_url:
                prev_resp = client.get(previous_design_url)
                prev_resp.raise_for_status()
                prev_design_bytes = prev_resp.content

        # 2. Build prompt — accumulate all revision notes for full context
        base_prompt = (
            "Convert this photo into a clean black and white line art drawing suitable for laser cutting. "
            "IMPORTANT: ignore the background completely — only draw the people in the foreground. "
            "Use only thin black lines on a pure white background — no fills, no shading, no gray tones. "
            "Trace the exact outer silhouette and internal details. "
            "For faces: clean jaw outline, elegant almond-shaped eyes, minimal nose, clean lip contour. "
            "DO NOT draw wrinkles, expression lines or skin texture. "
            "The result must look elegant and attractive. White background, black lines only."
        )

        if revision_history or change_notes:
            history_notes = [
                e["change_notes"] for e in (revision_history or []) if e.get("change_notes")
            ]
            if change_notes:
                history_notes.append(change_notes)
            accumulated = "\n".join(f"- {n}" for n in history_notes)
            base_prompt = (
                f"{base_prompt}\n\n"
                f"This is a revision. Apply ALL of the following change requests cumulatively:\n"
                f"{accumulated}"
            )
            if prev_design_bytes:
                base_prompt = (
                    f"{base_prompt}\n\n"
                    "The second image provided is the PREVIOUS version of the design. "
                    "Use it as reference to understand what has already been done and apply only the requested corrections."
                )

        # 3. Call OpenAI — pass previous design as second image when available
        ai_client = openai.OpenAI(api_key=config.OPENAI_API_KEY)
        images_arg: list = [io.BytesIO(photo_bytes)]
        if prev_design_bytes:
            images_arg.append(io.BytesIO(prev_design_bytes))
        response = ai_client.images.edit(
            model="gpt-image-1",
            image=images_arg if len(images_arg) > 1 else images_arg[0],
            prompt=base_prompt,
            quality="high",
            size="1024x1024",
            response_format="b64_json",
        )
        image_bytes = base64.b64decode(response.data[0].b64_json)

        # 4. Upload to S3
        s3_key = f"designs/{design_id}.png"
        s3_helper.upload_bytes(image_bytes, s3_key, content_type="image/png")
        design_url = f"https://{config.S3_BUCKET}.s3.amazonaws.com/{s3_key}"

        # 5. Mark as ready
        database.designs_table().update_item(
            Key={"design_id": design_id},
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
            _notify_platform_design_ready(design_id, design_url, callback_url)

    except Exception as exc:  # noqa: BLE001
        logger.error("Design job %s failed: %s", design_id, exc)
        database.designs_table().update_item(
            Key={"design_id": design_id},
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
    design_id: str, design_url: str, callback_url: str
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
            "design_id": design_id,
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


def _get_order_payments(order_id: str) -> list[dict]:
    """Return all payments linked to an order (via order_id GSI)."""
    resp = database.payments_table().query(
        IndexName="order_id-index",
        KeyConditionExpression="order_id = :ref",
        ExpressionAttributeValues={":ref": order_id},
    )
    return resp.get("Items", [])


def _serialize_order(o: dict) -> dict:
    product_id = (o.get("items") or [{}])[0]["product_id"]
    return {
        "order_id": o.get("order_id"),
        "status": o.get("status"),
        "created_at": o.get("created_at"),
        "product_name": PRODUCTS[product_id]["title"],
        "tracking_number": o.get("tracking_number"),
        "carrier": o.get("carrier"),
        "tracking_url": o.get("tracking_url"),
        "estimated_delivery": o.get("estimated_delivery"),
    }
