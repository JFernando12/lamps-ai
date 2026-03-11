"""Agent platform endpoints — all protected by AGENT_API_KEY."""
from fastapi import APIRouter, Depends

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

router = APIRouter(
    prefix="/api",
    tags=["agent"],
    dependencies=[Depends(require_agent_key)],
)


# ── Payments ──────────────────────────────────────────────────────────────────

@router.post("/payments/link", status_code=201)
def create_payment_link(body: CreatePaymentLinkRequest):
    return agent_service.create_payment_link(body)


@router.post("/payments/transfer", status_code=201)
def create_transfer_payment(body: CreateTransferPaymentRequest):
    return agent_service.create_transfer_payment(body)


@router.get("/payments")
def get_payment_status(payment_id: str):
    return agent_service.get_payment_status(payment_id)


@router.post("/payments/webhook/mp")
async def mp_webhook_agent(data: dict):
    """MercadoPago IPN webhook for agent-created payments."""
    return agent_service.process_mp_webhook_agent(data)


# ── Designs ───────────────────────────────────────────────────────────────────

@router.post("/designs", status_code=202)
def create_design(body: CreateDesignRequest):
    return agent_service.create_design(body)


@router.get("/designs")
def get_design_status(job_id: str):
    return agent_service.get_design_status(job_id)


@router.post("/designs/approve")
def approve_design(body: ApproveDesignRequest):
    return agent_service.approve_design(body.job_id)


@router.post("/designs/revision", status_code=202)
def request_revision(body: RevisionDesignRequest):
    return agent_service.request_revision(body.job_id, body)


# ── Orders ────────────────────────────────────────────────────────────────────

@router.post("/orders", status_code=201)
def create_agent_order(body: CreateAgentOrderRequest):
    return agent_service.create_agent_order(body)


@router.get("/orders")
def get_order(order_id: str):
    return agent_service.get_order(order_id)


@router.patch("/orders")
def update_agent_order(body: UpdateAgentOrderRequest):
    return agent_service.update_agent_order(body)


@router.post("/orders/confirm")
def confirm_agent_order(body: ConfirmAgentOrderRequest):
    return agent_service.confirm_agent_order(body.order_id)


@router.get("/orders/by-whatsapp")
def get_orders_by_whatsapp(whatsapp_phone: str):
    return agent_service.get_orders_by_phone(whatsapp_phone)


@router.get("/orders/by-email")
def get_orders_by_email(email: str):
    return agent_service.get_orders_by_email(email)
