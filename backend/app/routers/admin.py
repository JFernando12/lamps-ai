from fastapi import APIRouter, Depends

from ..dependencies import get_current_admin
from ..schemas.admin import UpdateOrderStatusRequest
from ..services import admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/orders")
def list_orders(_admin=Depends(get_current_admin)):
    return admin_service.list_orders()


@router.patch("/orders/{order_id}")
def update_order_status(
    order_id: str,
    body: UpdateOrderStatusRequest,
    _admin=Depends(get_current_admin),
):
    return admin_service.update_order_status(order_id, body)


@router.get("/stats")
def stats(_admin=Depends(get_current_admin)):
    return admin_service.get_stats()


@router.get("/ads/attribution")
def ads_attribution(_admin=Depends(get_current_admin)):
    return admin_service.get_ads_attribution()


@router.get("/ads/config")
def ads_config(_admin=Depends(get_current_admin)):
    return admin_service.get_ads_config()
