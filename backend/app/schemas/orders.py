from pydantic import BaseModel


class ShippingInfo(BaseModel):
    full_name: str
    address: str
    colonia: str
    city: str
    state: str
    zip_code: str
    country: str
    phone: str


class CreateOrderRequest(BaseModel):
    cart_id: str
    shipping: ShippingInfo
    checkout_event_id: str
