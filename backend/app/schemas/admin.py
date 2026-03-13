from typing import Optional

from pydantic import BaseModel


class UpdateOrderStatusRequest(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    notes: Optional[str] = None


class SiteConfigUpdate(BaseModel):
    whatsapp_number: Optional[str] = None
    whatsapp_message: Optional[str] = None
