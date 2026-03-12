from pydantic import BaseModel


# ── Payments ───────────────────────────────────────────────────────────────────

class CreatePaymentLinkRequest(BaseModel):
    amount: float
    concept: str
    order_id: str
    expiration_hours: int = 24
    whatsapp_phone: str | None = None
    session_id: str | None = None
    channel_id: str | None = None


class CreateTransferPaymentRequest(BaseModel):
    amount: float
    concept: str
    order_id: str
    proof_url: str          # URL of the transfer receipt photo
    whatsapp_phone: str | None = None
    session_id: str | None = None
    channel_id: str | None = None


# ── Designs ────────────────────────────────────────────────────────────────────

class CreateDesignRequest(BaseModel):
    order_id: str
    photo_url: str
    whatsapp_phone: str | None = None
    session_id: str | None = None
    channel_id: str | None = None


class RevisionDesignRequest(BaseModel):
    design_id: str
    change_notes: str


class ApproveDesignRequest(BaseModel):
    design_id: str


# ── Orders ─────────────────────────────────────────────────────────────────────

class CreateAgentOrderRequest(BaseModel):
    """Minimal order creation: only whatsapp number. Everything else is updated via PATCH."""
    whatsapp_phone: str


class UpdateAgentOrderRequest(BaseModel):
    """Patch any order fields after creation."""
    order_id: str
    product_id: str | None = None          # rgb | madera
    design_id: str | None = None
    full_name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    engraving_text: str | None = None
    spotify_url: str | None = None
    email: str | None = None


class ConfirmAgentOrderRequest(BaseModel):
    """Validate everything and move order to en_produccion."""
    order_id: str
