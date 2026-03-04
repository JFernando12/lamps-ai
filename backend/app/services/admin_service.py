"""Admin business logic: order management and stats."""
from datetime import datetime, timezone

from fastapi import HTTPException

from .. import database
from .. import s3 as s3_helper
from ..schemas.admin import UpdateOrderStatusRequest

ORDER_STATUSES = [
    "pending_payment",
    "paid",
    "in_process",
    "shipped",
    "delivered",
    "payment_failed",
    "cancelled",
]


def _scan_all(table) -> list:
    """Full table scan handling DynamoDB pagination."""
    response = table.scan()
    items = response.get("Items", [])
    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))
    return items


def list_orders() -> list:
    orders = _scan_all(database.orders_table())

    previews_cache: dict = {}
    for o in orders:
        pid = o.get("preview_id")
        if pid and pid not in previews_cache:
            previews_cache[pid] = (
                database.previews_table().get_item(Key={"preview_id": pid}).get("Item")
            )
        if pid and previews_cache.get(pid):
            key = previews_cache[pid].get("s3_render_key")
            if key:
                o["render_url"] = s3_helper.get_presigned_url(key)

    orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return orders


def update_order_status(order_id: str, body: UpdateOrderStatusRequest) -> dict:
    if body.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Valid: {ORDER_STATUSES}",
        )

    table = database.orders_table()
    if not table.get_item(Key={"order_id": order_id}).get("Item"):
        raise HTTPException(status_code=404, detail="Order not found")

    update_expr = "SET #s = :s, updated_at = :u"
    attr_names = {"#s": "status"}
    attr_values = {
        ":s": body.status,
        ":u": datetime.now(timezone.utc).isoformat(),
    }
    if body.tracking_number:
        update_expr += ", tracking_number = :t"
        attr_values[":t"] = body.tracking_number
    if body.notes:
        update_expr += ", admin_notes = :n"
        attr_values[":n"] = body.notes

    table.update_item(
        Key={"order_id": order_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
    )
    return {"ok": True, "order_id": order_id, "new_status": body.status}


def get_stats() -> dict:
    total_previews = database.previews_table().scan(Select="COUNT").get("Count", 0)

    orders = _scan_all(database.orders_table())
    paid_orders = [
        o for o in orders
        if o.get("status") in ("paid", "in_process", "shipped", "delivered")
    ]
    total_revenue = sum(
        float(o.get("unit_price", 0)) * int(o.get("quantity", 1))
        for o in paid_orders
    )

    previews_purchased = database.previews_table().scan(
        FilterExpression="purchased = :t",
        ExpressionAttributeValues={":t": True},
        Select="COUNT",
    ).get("Count", 0)

    return {
        "total_previews_generated": total_previews,
        "previews_converted_to_order": previews_purchased,
        "total_orders": len(orders),
        "paid_orders": len(paid_orders),
        "total_revenue_mxn": round(total_revenue, 2),
        "conversion_rate_pct": round(
            (previews_purchased / total_previews * 100) if total_previews else 0, 1
        ),
    }
