"""Meta Conversions API — server-side event tracking.

Sends the same events as the frontend Meta Pixel, from the server, so they
reach Meta even when the browser pixel is blocked by ad-blockers or iOS.
event_id is used for deduplication: server + browser events with the same
event_id + event_name are deduplicated automatically by Meta.
"""
import hashlib
import logging
import time

import httpx

from .. import config

logger = logging.getLogger(__name__)

_API_VERSION = "v21.0"


def _sha256(value: str) -> str:
    return hashlib.sha256(value.lower().strip().encode()).hexdigest()


def _build_user_data(
    email: str = "",
    phone: str = "",
    full_name: str = "",
    client_ip: str | None = None,
    user_agent: str | None = None,
    fbclid: str | None = None,
    fbp: str | None = None,
) -> dict:
    """Build the user_data dict with hashed PII for CAPI."""
    data: dict = {}
    if email:
        data["em"] = [_sha256(email)]
    if phone:
        # Strip non-digits and hash
        clean_phone = "".join(c for c in phone if c.isdigit())
        if clean_phone:
            data["ph"] = [_sha256(clean_phone)]
    if full_name:
        parts = full_name.strip().split(None, 1)
        if parts:
            data["fn"] = [_sha256(parts[0])]
        if len(parts) > 1:
            data["ln"] = [_sha256(parts[1])]
    if client_ip:
        data["client_ip_address"] = client_ip
    if user_agent:
        data["client_user_agent"] = user_agent
    if fbp:
        data["fbp"] = fbp
    if fbclid:
        # fbc format: fb.1.{timestamp_ms}.{fbclid}
        data["fbc"] = f"fb.1.{int(time.time() * 1000)}.{fbclid}"
    return data


def _send(events: list[dict]) -> None:
    if not config.META_PIXEL_ID or not config.META_ACCESS_TOKEN:
        logger.debug("Meta CAPI skipped: META_PIXEL_ID or META_ACCESS_TOKEN not configured")
        return

    url = f"https://graph.facebook.com/{_API_VERSION}/{config.META_PIXEL_ID}/events"
    try:
        resp = httpx.post(
            url,
            params={"access_token": config.META_ACCESS_TOKEN},
            json={"data": events},
            timeout=5.0,
        )
        if resp.status_code != 200:
            logger.warning("Meta CAPI %s: %s", resp.status_code, resp.text)
    except Exception as exc:
        logger.warning("Meta CAPI request failed: %s", exc)


def track_purchase(order: dict) -> None:
    """Purchase event — fired when payment is confirmed.

    Uses order_id as event_id so Meta deduplicates with the frontend pixel
    Purchase event that fires on the /pedido/{id}?status=success page.
    """
    email = order.get("user_email", "")
    phone = order.get("shipping", {}).get("phone", "") if isinstance(order.get("shipping"), dict) else ""
    full_name = order.get("shipping", {}).get("full_name", "") if isinstance(order.get("shipping"), dict) else ""
    value = float(order.get("unit_price", 0)) * int(order.get("quantity", 1))

    user_data = _build_user_data(
        email=email,
        phone=phone,
        full_name=full_name,
        client_ip=order.get("client_ip"),
        user_agent=order.get("user_agent"),
        fbclid=order.get("fbclid"),
        fbp=order.get("fbp"),
    )

    _send([{
        "event_name": "Purchase",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": order["order_id"],
        "event_source_url": f"{config.FRONTEND_URL}/pedido/{order['order_id']}",
        "user_data": user_data,
        "custom_data": {
            "currency": "MXN",
            "value": str(value),
            "content_ids": [order.get("product_name", "")],
            "content_type": "product",
        },
    }])


def track_initiate_checkout(
    order_id: str,
    user_email: str,
    value: float,
    checkout_event_id: str | None = None,
    client_ip: str | None = None,
    user_agent: str | None = None,
    fbclid: str | None = None,
    fbp: str | None = None,
) -> None:
    """InitiateCheckout event — fired when the order is created and user is
    redirected to MercadoPago.

    If checkout_event_id is provided (sent from the frontend), uses it as
    event_id for proper deduplication with the browser pixel event.
    """
    event_id = checkout_event_id or f"checkout_{order_id}"
    user_data = _build_user_data(
        email=user_email,
        client_ip=client_ip,
        user_agent=user_agent,
        fbclid=fbclid,
        fbp=fbp,
    )
    _send([{
        "event_name": "InitiateCheckout",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": event_id,
        "event_source_url": f"{config.FRONTEND_URL}/checkout",
        "user_data": user_data,
        "custom_data": {
            "currency": "MXN",
            "value": str(value),
        },
    }])

