from pydantic import BaseModel


class ShippingInfo(BaseModel):
    full_name: str
    address: str
    city: str
    state: str
    zip_code: str
    country: str
    phone: str


class CreateOrderRequest(BaseModel):
    photo_id: str
    engraving_text: str | None = None   # optional text engraved below the design
    spotify_url: str | None = None      # Spotify track name or URL for code engraving
    shipping: ShippingInfo
    product_name: str = "Lámpara personalizada LED"
    quantity: int = 1
    unit_price: float = 598  # MXN

    # ── Attribution (UTMs + Facebook click ID) ─────────────────
    # Sent by the frontend from localStorage; stored in DynamoDB for internal
    # reporting and forwarded to CAPI for better attribution.
    checkout_event_id: str | None = None  # dedup key for InitiateCheckout CAPI event
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    utm_term: str | None = None
    fbclid: str | None = None   # Facebook click ID (from ?fbclid= URL param)
    fbp: str | None = None      # _fbp cookie value
