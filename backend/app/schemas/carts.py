from pydantic import BaseModel, EmailStr


class UpsertCartRequest(BaseModel):
    email: EmailStr
    cart_id: str | None = None       # send back existing cart_id to update instead of create
    photo_id: str | None = None
    engraving_text: str | None = None
    spotify_url: str | None = None
    product_id: str = "rgb"
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    fbclid: str | None = None
    fbp: str | None = None
