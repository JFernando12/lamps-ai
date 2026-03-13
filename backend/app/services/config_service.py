"""Site-wide configuration stored in DynamoDB (single-item pattern)."""
from .. import database

_SETTING_ID = "general"

_DEFAULTS: dict = {
    "whatsapp_number": "527551008874",
    "whatsapp_message": "Hola, me das información de las lámparas personalizadas",
}


def get_config() -> dict:
    table = database.config_table()
    item = table.get_item(Key={"setting_id": _SETTING_ID}).get("Item")
    if not item:
        return _DEFAULTS.copy()
    return {**_DEFAULTS, **{k: v for k, v in item.items() if k != "setting_id"}}


def update_config(data: dict) -> dict:
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
    return get_config()
