from typing import List

from pydantic import BaseModel, EmailStr


class CartItem(BaseModel):
    photo_id: str | None = None
    engraving_text: str | None = None
    spotify_url: str | None = None
    product_id: str = "rgb"
    quantity: int = 1


class UpsertCartRequest(BaseModel):
    email: EmailStr | None = None
    cart_id: str | None = None
    items: List[CartItem] = []
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    utm_term: str | None = None
    fbclid: str | None = None
    fbp: str | None = None
