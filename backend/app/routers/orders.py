from fastapi import APIRouter, Depends

from ..dependencies import get_current_user
from ..schemas.orders import CreateOrderRequest
from ..services import orders_service

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/", status_code=201)
def create_order(body: CreateOrderRequest, user: dict = Depends(get_current_user)):
    return orders_service.create_order(body, user["sub"])


@router.get("/mine")
def my_orders(user: dict = Depends(get_current_user)):
    return orders_service.get_my_orders(user["sub"])


@router.get("/{order_id}")
def get_order(order_id: str, user: dict = Depends(get_current_user)):
    return orders_service.get_order(order_id, user["sub"], is_admin=user.get("admin", False))


@router.post("/{order_id}/sync-payment")
def sync_payment(order_id: str, payment_id: str, user: dict = Depends(get_current_user)):
    """Called by the frontend after MP redirects back; syncs payment status from MP."""
    return orders_service.sync_payment(order_id, payment_id, user["sub"])


@router.post("/webhook/mp")
async def mp_webhook(data: dict):
    return orders_service.process_mp_webhook(data)
