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
    value = float(order.get("unit_price", 0)) * int(order.get("quantity", 1))
    _send([{
        "event_name": "Purchase",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": order["order_id"],
        "event_source_url": f"{config.FRONTEND_URL}/pedido/{order['order_id']}",
        "user_data": {
            "em": [_sha256(email)] if email else [],
        },
        "custom_data": {
            "currency": "MXN",
            "value": str(value),
        },
    }])


def track_initiate_checkout(order_id: str, user_email: str, value: float) -> None:
    """InitiateCheckout event — fired when the order is created and user is
    redirected to MercadoPago.

    Uses "checkout_{order_id}" as event_id to deduplicate with the frontend
    AddPaymentInfo event (which fires just before the MP redirect).
    """
    _send([{
        "event_name": "InitiateCheckout",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": f"checkout_{order_id}",
        "event_source_url": f"{config.FRONTEND_URL}/checkout",
        "user_data": {
            "em": [_sha256(user_email)] if user_email else [],
        },
        "custom_data": {
            "currency": "MXN",
            "value": str(value),
        },
    }])
