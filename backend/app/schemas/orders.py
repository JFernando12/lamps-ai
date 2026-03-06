from pydantic import BaseModel, model_validator


class ShippingInfo(BaseModel):
    full_name: str
    address: str
    city: str
    state: str
    zip_code: str
    country: str
    phone: str


class CreateOrderRequest(BaseModel):
    photo_id: str | None = None
    preview_id: str | None = None
    engraving_text: str | None = None   # optional text engraved below the design
    spotify_url: str | None = None      # Spotify track name or URL for code engraving
    shipping: ShippingInfo
    product_name: str = "Lámpara personalizada LED"
    quantity: int = 1
    unit_price: float = 799.00  # MXN

    @model_validator(mode='after')
    def check_source(self):
        if not self.photo_id and not self.preview_id:
            raise ValueError('Either photo_id or preview_id is required')
        return self
