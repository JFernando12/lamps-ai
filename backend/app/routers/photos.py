from fastapi import APIRouter, Depends, File, UploadFile

from ..dependencies import optional_user
from ..services import photos_service

router = APIRouter(prefix="/api/photos", tags=["photos"])


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    user: dict | None = Depends(optional_user),
):
    """Accept a customer photo, store in S3, return photo_id. No AI processing."""
    raw = await file.read()
    user_email = user["sub"] if user else "anonymous"
    return photos_service.save_photo(raw, file.content_type, user_email)


@router.get("/{photo_id}/url")
async def get_photo_url(photo_id: str):
    """Return a short-lived presigned S3 URL for a photo (used to restore cart preview)."""
    return photos_service.get_photo_url(photo_id)
