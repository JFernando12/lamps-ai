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
    preview_id: str
    shipping: ShippingInfo
    product_name: str = "Lámpara personalizada LED"
    quantity: int = 1
    unit_price: float = 799.00  # MXN
