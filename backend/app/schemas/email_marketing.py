from typing import Literal
from pydantic import BaseModel


SegmentType = Literal["all", "customers", "abandoned_carts", "payment_failed", "pending_payment"]


class SendCampaignRequest(BaseModel):
    template_id: str
    segment: SegmentType = "all"
    product_filter: str | None = None  # "rgb" | "madera" | None = all
    subject: str
    title: str
    body_html: str
    cta_text: str | None = None
    cta_url_template: str | None = None
    recipient_override: list[str] | None = None  # If set, ignore segment and send only to these


class SendTrackingRequest(BaseModel):
    tracking_number: str
