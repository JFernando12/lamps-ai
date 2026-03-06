"""Photos service: save customer-uploaded photos (no AI processing)."""
import io
import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from PIL import Image

from .. import database
from .. import s3 as s3_helper

logger = logging.getLogger(__name__)


def save_photo(raw: bytes, content_type: str | None, user_email: str) -> dict:
    """Resize and upload a customer photo to S3, persist metadata, return photo_id."""
    if not content_type or not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    photo_id = str(uuid.uuid4())

    pil_img = Image.open(io.BytesIO(raw)).convert("RGB")
    pil_img.thumbnail((1024, 1024), Image.LANCZOS)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=90)
    jpeg_bytes = buf.getvalue()

    s3_key = f"photos/{photo_id}.jpg"
    s3_helper.upload_bytes(jpeg_bytes, s3_key, content_type="image/jpeg")

    database.photos_table().put_item(Item={
        "photo_id": photo_id,
        "user_email": user_email,
        "s3_key": s3_key,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"photo_id": photo_id}
