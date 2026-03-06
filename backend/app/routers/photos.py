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
