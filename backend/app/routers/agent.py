"""Agent platform endpoints — most protected by AGENT_API_KEY (per-endpoint)."""
from fastapi import APIRouter, Depends, Request

from ..auth_utils import validate_mp_webhook_signature
from ..dependencies import require_agent_key
from ..schemas.agent import (
    ApproveDesignRequest,
    ConfirmAgentOrderRequest,
    CreateAgentOrderRequest,
    CreateDesignRequest,
    CreatePaymentLinkRequest,
    CreateTransferPaymentRequest,
    RevisionDesignRequest,
    UpdateAgentOrderRequest,
)
from ..services import agent_service

router = APIRouter(prefix="/api", tags=["agent"])


# ── Payments ──────────────────────────────────────────────────────────────────

@router.post("/payments/link", status_code=201, dependencies=[Depends(require_agent_key)])
def create_payment_link(body: CreatePaymentLinkRequest):
    return agent_service.create_payment_link(body)


@router.post("/payments/transfer", status_code=201, dependencies=[Depends(require_agent_key)])
def create_transfer_payment(body: CreateTransferPaymentRequest):
    return agent_service.create_transfer_payment(body)


@router.post("/payments/webhook/mp")
async def mp_webhook_agent(request: Request, data: dict):
    """MercadoPago IPN webhook — no API key, validated by x-signature instead."""
    validate_mp_webhook_signature(request, str((data.get("data") or {}).get("id", "")))
    return agent_service.process_mp_webhook_agent(data)


# ── Designs ───────────────────────────────────────────────────────────────────

@router.post("/designs", status_code=202, dependencies=[Depends(require_agent_key)])
def create_design(body: CreateDesignRequest):
    return agent_service.create_design(body)


@router.post("/designs/approve", dependencies=[Depends(require_agent_key)])
def approve_design(body: ApproveDesignRequest):
    return agent_service.approve_design(body.design_id)


@router.post("/designs/revision", status_code=202, dependencies=[Depends(require_agent_key)])
def request_revision(body: RevisionDesignRequest):
    return agent_service.request_revision(body.design_id, body)


# ── Orders ────────────────────────────────────────────────────────────────────

@router.post("/orders", status_code=201, dependencies=[Depends(require_agent_key)])
def create_agent_order(body: CreateAgentOrderRequest):
    return agent_service.create_agent_order(body)


@router.patch("/orders", dependencies=[Depends(require_agent_key)])
def update_agent_order(body: UpdateAgentOrderRequest):
    return agent_service.update_agent_order(body)


@router.post("/orders/confirm", dependencies=[Depends(require_agent_key)])
def confirm_agent_order(body: ConfirmAgentOrderRequest):
    return agent_service.confirm_agent_order(body.order_id)


@router.get("/orders/by-whatsapp", dependencies=[Depends(require_agent_key)])
def get_orders_by_whatsapp(whatsapp_phone: str):
    return agent_service.get_orders_by_phone(whatsapp_phone)


@router.get("/orders/by-email", dependencies=[Depends(require_agent_key)])
def get_orders_by_email(email: str):
    return agent_service.get_orders_by_email(email)
