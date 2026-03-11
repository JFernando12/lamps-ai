"""Admin business logic: order management and stats."""
from datetime import datetime, timezone

from fastapi import HTTPException

from .. import config
from .. import database
from .. import s3 as s3_helper
from ..pixel_events import pixel_events_list
from ..schemas.admin import UpdateOrderStatusRequest

ORDER_STATUSES = [
    "pending",
    "approved",
    "in_process",
    "shipped",
    "delivered",
    "rejected",
    "cancelled",
]

_PAID_STATUSES_ALL = ("approved", "in_process", "shipped", "delivered")


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

    photos_cache: dict = {}
    designs_cache: dict = {}

    for o in orders:
        if o.get("whatsapp_phone"):
            o["type"] = "whatsapp"
            # Fetch payments linked to this order
            payments_resp = database.payments_table().query(
                IndexName="order_id-index",
                KeyConditionExpression="order_id = :ref",
                ExpressionAttributeValues={":ref": o["order_id"]},
            )
            o["payments"] = [
                {
                    "payment_id": p["payment_id"],
                    "method": p.get("method"),
                    "concept": p.get("concept"),
                    "amount": float(p.get("amount", 0)),
                    "status": p.get("status"),
                }
                for p in payments_resp.get("Items", [])
            ]
            o["paid_total"] = sum(
                p["amount"] for p in o["payments"] if p["status"] == "approved"
            )
            # Fetch design url
            dsn_id = o.get("design_id")
            if dsn_id:
                if dsn_id not in designs_cache:
                    designs_cache[dsn_id] = database.designs_table().get_item(
                        Key={"design_id": dsn_id}
                    ).get("Item")
                if designs_cache.get(dsn_id):
                    o["design_url"] = designs_cache[dsn_id].get("design_url")
                    o["design_status"] = designs_cache[dsn_id].get("status")
                    o["design_approved"] = designs_cache[dsn_id].get("approved", False)
        else:
            o["type"] = "checkout"
            phid = (o.get("items") or [{}])[0].get("photo_id") or o.get("photo_id")
            if phid and not o.get("photo_url"):
                if phid not in photos_cache:
                    photos_cache[phid] = (
                        database.photos_table().get_item(Key={"photo_id": phid}).get("Item")
                    )
                if photos_cache.get(phid):
                    key = photos_cache[phid].get("s3_key")
                    if key:
                        o["photo_url"] = s3_helper.get_presigned_url(key)

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
    from ..catalog import PRODUCTS

    total_photos = database.photos_table().scan(Select="COUNT").get("Count", 0)

    orders = _scan_all(database.orders_table())
    paid_orders = [o for o in orders if o.get("status") in _PAID_STATUSES_ALL]

    total_revenue = 0.0
    for o in paid_orders:
        total_revenue += float(o.get("total_amount", 0))

    return {
        "total_photos_uploaded": total_photos,
        "total_orders": len(orders),
        "paid_orders": len(paid_orders),
        "total_revenue_mxn": round(total_revenue, 2),
        "conversion_rate_pct": round(
            (len(orders) / total_photos * 100) if total_photos else 0, 1
        ),
    }


_PAID_STATUSES = _PAID_STATUSES_ALL


def get_ads_attribution() -> dict:
    """Returns UTM-based funnel breakdown for the Ads admin panel."""
    orders = _scan_all(database.orders_table())

    # ── Funnel by source ──────────────────────────────────────
    funnel: dict[str, dict] = {}
    for o in orders:
        src = o.get("utm_source") or "(directo)"
        if src not in funnel:
            funnel[src] = {"source": src, "initiated": 0, "paid": 0, "revenue": 0.0}
        funnel[src]["initiated"] += 1
        if o.get("status") in _PAID_STATUSES:
            funnel[src]["paid"] += 1
            funnel[src]["revenue"] += float(o.get("total_amount", 0))

    funnel_list = []
    for v in sorted(funnel.values(), key=lambda x: x["revenue"], reverse=True):
        v["cvr_pct"] = round(v["paid"] / v["initiated"] * 100, 1) if v["initiated"] else 0.0
        funnel_list.append(v)

    # ── Breakdown by campaign ─────────────────────────────────
    campaigns: dict[str, dict] = {}
    for o in orders:
        if not o.get("utm_campaign"):
            continue
        key = f"{o.get('utm_source', '')}|{o.get('utm_campaign', '')}"
        if key not in campaigns:
            campaigns[key] = {
                "utm_source": o.get("utm_source", ""),
                "utm_campaign": o.get("utm_campaign", ""),
                "utm_content": o.get("utm_content", ""),
                "initiated": 0,
                "paid": 0,
                "revenue": 0.0,
            }
        campaigns[key]["initiated"] += 1
        if o.get("status") in _PAID_STATUSES:
            campaigns[key]["paid"] += 1
            campaigns[key]["revenue"] += float(o.get("total_amount", 0))

    campaign_list = sorted(campaigns.values(), key=lambda x: x["revenue"], reverse=True)
    for c in campaign_list:
        c["cvr_pct"] = round(c["paid"] / c["initiated"] * 100, 1) if c["initiated"] else 0.0

    # ── Summary ───────────────────────────────────────────────
    ads_paid = [o for o in orders if o.get("utm_source") and o.get("status") in _PAID_STATUSES]
    ads_initiated = [o for o in orders if o.get("utm_source")]
    ads_revenue = sum(
        float(o.get("total_amount", 0)) for o in ads_paid
    )

    return {
        "funnel_by_source": funnel_list,
        "by_campaign": campaign_list,
        "summary": {
            "total_attributed_orders": len(ads_paid),
            "total_attributed_revenue": round(ads_revenue, 2),
            "total_initiated": len(ads_initiated),
        },
    }


def get_ads_config() -> dict:
    """Returns current Ads / CAPI configuration status (no secrets exposed)."""
    return {
        "pixel_id": config.META_PIXEL_ID or None,
        "capi_configured": bool(config.META_PIXEL_ID and config.META_ACCESS_TOKEN),
        "api_version": "v21.0",
    }


def get_pixel_events() -> list:
    return pixel_events_list()

