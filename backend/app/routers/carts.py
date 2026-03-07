from fastapi import APIRouter

from ..schemas.carts import UpsertCartRequest
from ..services import carts_service

router = APIRouter(prefix="/api/carts", tags=["carts"])


@router.post("/", status_code=201)
def upsert_cart(body: UpsertCartRequest):
    """Create or update a cart draft (abandoned checkout recovery)."""
    return carts_service.upsert_cart(body)


@router.get("/{cart_id}")
def get_cart(cart_id: str):
    """Restore a cart by ID — used when user clicks link in recovery email."""
    return carts_service.get_cart(cart_id)


@router.post("/{cart_id}/convert", status_code=204)
def convert_cart(cart_id: str):
    """Mark a cart as converted (order placed). Suppresses further emails."""
    carts_service.convert_cart(cart_id)
