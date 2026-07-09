"""Site-wide configuration stored in DynamoDB (single-item pattern)."""
import time

from .. import database

_SETTING_ID = "general"
_CACHE_TTL_SECONDS = 60

_DEFAULTS: dict = {
    "whatsapp_number": "527551008874",
    "whatsapp_message": "Hola, me das información de las lámparas personalizadas",
}

_cache: dict | None = None
_cache_expires_at: float = 0.0


def _fetch_config() -> dict:
    table = database.config_table()
    item = table.get_item(Key={"setting_id": _SETTING_ID}).get("Item")
    if not item:
        return _DEFAULTS.copy()
    return {**_DEFAULTS, **{k: v for k, v in item.items() if k != "setting_id"}}


def get_config() -> dict:
    global _cache, _cache_expires_at
    now = time.monotonic()
    if _cache is None or now >= _cache_expires_at:
        _cache = _fetch_config()
        _cache_expires_at = now + _CACHE_TTL_SECONDS
    return _cache


def update_config(data: dict) -> dict:
    global _cache, _cache_expires_at
    allowed = set(_DEFAULTS.keys())
    updates = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not updates:
        return get_config()

    table = database.config_table()
    table.update_item(
        Key={"setting_id": _SETTING_ID},
        UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in updates),
        ExpressionAttributeNames={f"#{k}": k for k in updates},
        ExpressionAttributeValues={f":{k}": v for k, v in updates.items()},
    )
    _cache = _fetch_config()
    _cache_expires_at = time.monotonic() + _CACHE_TTL_SECONDS
    return _cache
