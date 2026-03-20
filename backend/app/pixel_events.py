"""Registro central de eventos Meta Pixel / CAPI.

Cada evento es una entrada en PIXEL_EVENTS con:
  - name     : string exacto que usa Meta (browser pixel + CAPI)
  - type     : "standard" | "custom"
  - trigger  : descripción de cuándo se dispara (para el dashboard)
  - file     : archivo frontend donde vive el fbq() correspondiente
  - has_event_id / has_capi : flags para el dashboard
  - send     : función que manda el evento al CAPI de Meta (None si no hay CAPI)

Uso:
  from .pixel_events import PIXEL_EVENTS, get_event

  get_event("Purchase").send(order=order_dict)
"""

import hashlib
import logging
import time
from dataclasses import dataclass, field
from typing import Callable, Literal

import httpx

from . import config
from .catalog import PRODUCTS

logger = logging.getLogger(__name__)
_API_VERSION = "v21.0"


def _noop(*_args, **_kwargs) -> None:
    """Placeholder for events that have no CAPI implementation."""

# ── Helpers ───────────────────────────────────────────────────

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
    data: dict = {}
    if email:
        data["em"] = [_sha256(email)]
    if phone:
        clean = "".join(c for c in phone if c.isdigit())
        if clean:
            # Normalize to E.164: 10-digit Mexican numbers need country code 52
            if len(clean) == 10:
                clean = "52" + clean
            data["ph"] = [_sha256(clean)]
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
        data["fbc"] = f"fb.1.{int(time.time() * 1000)}.{fbclid}"
    return data


def _send_capi(events: list[dict]) -> None:
    if not config.META_PIXEL_ID or not config.META_ACCESS_TOKEN:
        logger.debug("Meta CAPI skipped: credentials not configured")
        return
    url = f"https://graph.facebook.com/{_API_VERSION}/{config.META_PIXEL_ID}/events"
    payload: dict = {"data": events}
    if config.META_TEST_EVENT_CODE:
        payload["test_event_code"] = config.META_TEST_EVENT_CODE
    try:
        resp = httpx.post(
            url,
            params={"access_token": config.META_ACCESS_TOKEN},
            json=payload,
            timeout=5.0,
        )
        if resp.status_code != 200:
            logger.warning("Meta CAPI %s: %s", resp.status_code, resp.text)
    except Exception as exc:
        logger.warning("Meta CAPI request failed: %s", exc)


# ── CAPI send functions ───────────────────────────────────────

def _send_purchase(order: dict) -> None:
    """order keys: order_id, user_email, total_amount, product_name,
    shipping (dict with phone/full_name), client_ip, user_agent, fbclid, fbp"""
    shipping = order.get("shipping") or {}
    value = float(order.get("total_amount", 0))
    user_data = _build_user_data(
        email=order.get("user_email", ""),
        phone=shipping.get("phone", ""),
        full_name=shipping.get("full_name", ""),
        client_ip=order.get("client_ip"),
        user_agent=order.get("user_agent"),
        fbclid=order.get("fbclid"),
        fbp=order.get("fbp"),
    )
    _send_capi([{
        "event_name": "Purchase",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": order["order_id"],
        "event_source_url": f"{config.FRONTEND_URL}/pedido/{order['order_id']}",
        "user_data": user_data,
        "custom_data": {
            "currency": "MXN",
            "value": str(value),
            "content_ids": [item.get("product_id", "") for item in (order.get("items") or [])],
            "content_type": "product",
            "num_items": sum(item.get("quantity", 1) for item in (order.get("items") or [])),
        },
    }])


def _send_initiate_checkout(order: dict) -> None:
    """order keys: order_id, user_email, total_amount,
    checkout_event_id, items, client_ip, user_agent, fbclid, fbp"""
    order_id = order["order_id"]
    value = float(order.get("total_amount", 0))
    items = order.get("items") or []
    content_ids = [item.get("product_id", "") for item in items]
    num_items = sum(item.get("quantity", 1) for item in items)
    custom_data: dict = {"currency": "MXN", "value": str(value)}
    if content_ids:
        custom_data["content_ids"] = content_ids
        custom_data["content_type"] = "product"
    if num_items:
        custom_data["num_items"] = num_items
    _send_capi([{
        "event_name": "InitiateCheckout",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": order.get("checkout_event_id") or f"checkout_{order_id}",
        "event_source_url": f"{config.FRONTEND_URL}/checkout",
        "user_data": _build_user_data(
            email=order.get("user_email", ""),
            client_ip=order.get("client_ip"),
            user_agent=order.get("user_agent"),
            fbclid=order.get("fbclid"),
            fbp=order.get("fbp"),
        ),
        "custom_data": custom_data,
    }])


def _send_add_to_cart(cart: dict) -> None:
    """cart keys: cart_id, email, items, fbclid, fbp, client_ip, user_agent"""
    items = cart.get("items") or []
    total = sum(
        PRODUCTS.get(item.get("product_id", "rgb"), {}).get("unit_price", 0) * item.get("quantity", 1)
        for item in items
    )
    content_ids = [item.get("product_id", "rgb") for item in items]
    num_items = sum(item.get("quantity", 1) for item in items)
    _send_capi([{
        "event_name": "AddToCart",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": f"cart_{cart['cart_id']}",
        "event_source_url": f"{config.FRONTEND_URL}/checkout",
        "user_data": _build_user_data(
            email=cart.get("email", ""),
            client_ip=cart.get("client_ip"),
            user_agent=cart.get("user_agent"),
            fbclid=cart.get("fbclid"),
            fbp=cart.get("fbp"),
        ),
        "custom_data": {
            "currency": "MXN",
            "value": str(total),
            "content_ids": content_ids,
            "content_type": "product",
            "num_items": num_items,
        },
    }])


# ── Registry ──────────────────────────────────────────────────

@dataclass
class PixelEventDef:
    name: str
    type: Literal["standard", "custom"]
    route: str           # API endpoint/route que dispara este evento CAPI
    has_event_id: bool
    send: Callable = field(default=_noop, repr=False)
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "event_name": self.name,
            "type": self.type,
            "route": self.route,
            "has_event_id": self.has_event_id,
            "notes": self.notes,
            "enabled": True,
        }


PIXEL_EVENTS: list[PixelEventDef] = [
    PixelEventDef(
        name="AddToCart",
        type="standard",
        route="POST /api/carts/",
        has_event_id=True,
        send=_send_add_to_cart,
        notes="event_id = cart_{cart_id}; se dispara al crear un carrito nuevo",
    ),
    PixelEventDef(
        name="InitiateCheckout",
        type="standard",
        route="POST /api/orders/",
        has_event_id=True,
        send=_send_initiate_checkout,
        notes="event_id compartido con el browser pixel para deduplicación",
    ),
    PixelEventDef(
        name="Purchase",
        type="standard",
        route="POST /api/orders/{order_id}/sync-payment",
        has_event_id=True,
        send=_send_purchase,
        notes="event_id = order_id para deduplicación con el browser pixel",
    ),
]

_INDEX: dict[str, PixelEventDef] = {e.name: e for e in PIXEL_EVENTS}


def get_event(name: str) -> PixelEventDef:
    """Look up an event by its Meta name. Raises KeyError if not registered."""
    return _INDEX[name]


def pixel_events_list() -> list[dict]:
    """Flat list for the admin API endpoint."""
    return [e.to_dict() for e in PIXEL_EVENTS]

