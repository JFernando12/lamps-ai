from fastapi import APIRouter, Request

from ..schemas.carts import UpsertCartRequest
from ..services import carts_service

router = APIRouter(prefix="/api/carts", tags=["carts"])


@router.post("/", status_code=201)
def upsert_cart(body: UpsertCartRequest, request: Request):
    """Create or update a cart draft (abandoned checkout recovery)."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    client_ip = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (request.client.host if request.client else None)
    )
    user_agent = request.headers.get("User-Agent")
    return carts_service.upsert_cart(body, client_ip=client_ip, user_agent=user_agent)


@router.get("/{cart_id}")
def get_cart(cart_id: str):
    """Restore a cart by ID — used when user clicks link in recovery email."""
    return carts_service.get_cart(cart_id)


@router.post("/{cart_id}/convert", status_code=204)
def convert_cart(cart_id: str):
    """Mark a cart as converted (order placed). Suppresses further emails."""
    carts_service.convert_cart(cart_id)
