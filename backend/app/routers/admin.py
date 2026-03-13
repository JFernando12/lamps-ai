from fastapi import APIRouter, Depends

from ..dependencies import get_current_admin
from ..schemas.admin import UpdateOrderStatusRequest, SiteConfigUpdate
from ..schemas.email_marketing import SendCampaignRequest, SendTrackingRequest
from ..services import admin_service
from ..services import agent_service
from ..services import config_service
from ..services import email_marketing_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Transfer payment review ───────────────────────────────────────────────────

@router.get("/payments/pending-transfers")
def list_pending_transfers(_admin=Depends(get_current_admin)):
    return agent_service.list_pending_transfers()


@router.post("/payments/{payment_id}/review")
def review_transfer_payment(
    payment_id: str,
    approved: bool,
    note: str | None = None,
    _admin=Depends(get_current_admin),
):
    return agent_service.review_transfer_payment(payment_id, approved, note)


@router.get("/orders")
def list_orders(_admin=Depends(get_current_admin)):
    return admin_service.list_orders()


@router.patch("/orders/{order_id}")
def update_order_status(
    order_id: str,
    body: UpdateOrderStatusRequest,
    _admin=Depends(get_current_admin),
):
    return admin_service.update_order_status(order_id, body)


@router.delete("/orders/{order_id}")
def delete_order(order_id: str, _admin=Depends(get_current_admin)):
    return admin_service.delete_order(order_id)


@router.get("/stats")
def stats(_admin=Depends(get_current_admin)):
    return admin_service.get_stats()


@router.get("/ads/attribution")
def ads_attribution(_admin=Depends(get_current_admin)):
    return admin_service.get_ads_attribution()


@router.get("/ads/config")
def ads_config(_admin=Depends(get_current_admin)):
    return admin_service.get_ads_config()


@router.get("/ads/events")
def ads_events(_admin=Depends(get_current_admin)):
    return admin_service.get_pixel_events()


# ── Email Marketing ───────────────────────────────────────────────────────────

@router.get("/email/templates")
def email_templates(_admin=Depends(get_current_admin)):
    return email_marketing_service.list_templates()


@router.get("/email/audience")
def email_audience(
    segment: str = "all",
    product_filter: str | None = None,
    _admin=Depends(get_current_admin),
):
    return email_marketing_service.get_audience_preview(segment, product_filter)  # type: ignore[arg-type]


@router.get("/email/campaigns")
def email_campaigns(_admin=Depends(get_current_admin)):
    return email_marketing_service.list_campaigns()


@router.post("/email/campaigns/send")
def email_send_campaign(body: SendCampaignRequest, _admin=Depends(get_current_admin)):
    return email_marketing_service.send_campaign(
        template_id=body.template_id,
        segment=body.segment,
        subject=body.subject,
        title=body.title,
        body_html=body.body_html,
        cta_text=body.cta_text,
        cta_url_template=body.cta_url_template,
        product_filter=body.product_filter,
        recipient_override=body.recipient_override,
    )


@router.post("/email/orders/{order_id}/confirmation")
def email_order_confirmation(order_id: str, _admin=Depends(get_current_admin)):
    return email_marketing_service.send_order_confirmation(order_id)


@router.post("/email/orders/{order_id}/tracking")
def email_send_tracking(
    order_id: str,
    body: SendTrackingRequest,
    _admin=Depends(get_current_admin),
):
    return email_marketing_service.send_tracking_email(order_id, body.tracking_number)


# ── Site config ───────────────────────────────────────────────────────────────

@router.get("/config")
def get_site_config(_admin=Depends(get_current_admin)):
    return config_service.get_config()


@router.patch("/config")
def update_site_config(body: SiteConfigUpdate, _admin=Depends(get_current_admin)):
    return config_service.update_config(body.model_dump(exclude_none=True))
