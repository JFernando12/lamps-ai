from pydantic import BaseModel


# ── Payments ───────────────────────────────────────────────────────────────────

class CreatePaymentLinkRequest(BaseModel):
    amount: float
    concept: str
    order_ref: str
    expiration_hours: int = 24
    whatsapp_phone: str | None = None
    _session_id: str | None = None
    _channel_id: str | None = None


class CreateTransferPaymentRequest(BaseModel):
    amount: float
    concept: str
    order_ref: str
    proof_url: str          # URL of the transfer receipt photo
    whatsapp_phone: str | None = None
    _session_id: str | None = None
    _channel_id: str | None = None


# ── Designs ────────────────────────────────────────────────────────────────────

class CreateDesignRequest(BaseModel):
    photo_url: str
    product_id: str  # lamp_led_16 | lamp_wood
    whatsapp_phone: str | None = None
    _session_id: str | None = None
    _channel_id: str | None = None


class RevisionDesignRequest(BaseModel):
    job_id: str
    change_notes: str


class ApproveDesignRequest(BaseModel):
    job_id: str


# ── Orders ─────────────────────────────────────────────────────────────────────

class CreateAgentOrderRequest(BaseModel):
    """Minimal order creation: initial payment + whatsapp number."""
    payment_id: str
    whatsapp_phone: str


class UpdateAgentOrderRequest(BaseModel):
    """Patch any order fields after creation."""
    order_id: str
    product_id: str | None = None          # lamp_led_16 | lamp_wood
    design_job_id: str | None = None
    balance_payment_id: str | None = None  # set when paying the deposit balance
    customer_name: str | None = None
    street: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    custom_text: str | None = None
    spotify_ref: str | None = None
    email: str | None = None


class ConfirmAgentOrderRequest(BaseModel):
    """Validate everything and move order to en_produccion."""
    order_id: str
