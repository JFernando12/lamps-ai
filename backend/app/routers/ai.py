from fastapi import APIRouter, Depends, File, UploadFile

from ..dependencies import optional_user
from ..services import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/preview")
async def generate_preview(
    file: UploadFile = File(...),
    user: dict | None = Depends(optional_user),
):
    """Accept a user photo and return a photorealistic lamp render preview."""
    raw = await file.read()
    user_email = user["sub"] if user else "anonymous"
    return await ai_service.generate_preview(raw, file.content_type, user_email)
