from typing import Optional

from pydantic import BaseModel


class UpdateOrderStatusRequest(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
