"""AI pipeline business logic: photo → render → S3 → DynamoDB."""
import io
import logging
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from PIL import Image, ImageDraw, ImageFont

from .. import config
from .. import database
from .. import s3 as s3_helper
from ..modules.render import generate as generate_render

logger = logging.getLogger(__name__)


def _make_mock_render(source_bytes: bytes) -> bytes:
    """Return a placeholder 800x800 image (no OpenAI call)."""
    base = Image.open(io.BytesIO(source_bytes)).convert("RGB").resize((800, 800))
    overlay = Image.new("RGBA", (800, 800), (0, 0, 0, 160))
    base = base.convert("RGBA")
    base.alpha_composite(overlay)
    draw = ImageDraw.Draw(base)
    text = "MOCK RENDER"
    try:
        font = ImageFont.truetype("arial.ttf", 64)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((800 - tw) // 2, (800 - th) // 2), text, fill=(255, 80, 80), font=font)
    buf = io.BytesIO()
    base.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


async def generate_preview(raw: bytes, content_type: str | None, user_email: str) -> dict:
    """Run the AI pipeline (photo → lamp render) and return presigned URL + preview_id."""
    if not content_type or not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    preview_id = str(uuid.uuid4())

    # Convert upload to PNG for OpenAI
    pil_img = Image.open(io.BytesIO(raw)).convert("RGBA")
    png_buf = io.BytesIO()
    pil_img.save(png_buf, format="PNG")
    png_bytes = png_buf.getvalue()

    # Persist original upload
    s3_helper.upload_upload(png_bytes, preview_id)

    if config.MOCK_AI:
        logger.warning("MOCK_AI=true — skipping OpenAI, returning placeholder render")
        render_bytes = _make_mock_render(png_bytes)
        render_key = s3_helper.upload_preview(render_bytes, preview_id)
    else:
        tmp_dir = Path(tempfile.gettempdir())
        tmp_src = tmp_dir / f"{preview_id}_src.png"
        tmp_src.write_bytes(png_bytes)

        # Single step – generate lamp render directly from the photo + reference
        render_bytes = generate_render(tmp_src, Path(config.REFERENCE_LAMP_PATH), config.DIRECT_RENDER_PROMPT)
        render_key = s3_helper.upload_preview(render_bytes, preview_id)

        tmp_src.unlink(missing_ok=True)

    # Persist preview record
    database.previews_table().put_item(Item={
        "preview_id": preview_id,
        "user_email": user_email,
        "s3_upload_key": f"uploads/{preview_id}_original.png",
        "s3_render_key": render_key,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "purchased": False,
    })

    return {
        "preview_id": preview_id,
        "render_url": s3_helper.get_presigned_url(render_key),
    }
