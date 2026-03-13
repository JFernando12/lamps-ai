from fastapi import APIRouter

from ..services import config_service

router = APIRouter(tags=["config"])


@router.get("/api/config")
def get_public_config():
    """Returns public site configuration (WhatsApp number, default message, etc.)."""
    return config_service.get_config()
