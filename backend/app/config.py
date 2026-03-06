import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Secrets (required in .env) ────────────────────────────────
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
MP_ACCESS_TOKEN = os.environ["MP_ACCESS_TOKEN"]
MP_PUBLIC_KEY = os.environ["MP_PUBLIC_KEY"]

# ── AWS / infra (hardcoded, override via env if needed) ───────
AWS_REGION = "us-east-1"
S3_BUCKET = "lamps-ai"

# ── DynamoDB table names ──────────────────────────────────────
DYNAMO_TABLE_USERS = "lamps_users"
DYNAMO_TABLE_PHOTOS = "lamps_photos"
DYNAMO_TABLE_PREVIEWS = "lamps_previews"
DYNAMO_TABLE_ORDERS = "lamps_orders"

# ── JWT ───────────────────────────────────────────────────────
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# ── Admin ─────────────────────────────────────────────────────
ADMIN_EMAIL = "admin@lamps.ai"

# ── App ───────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Comma-separated extra origins (e.g. for LAN testing from mobile)
_extra = os.getenv("EXTRA_ORIGINS", "")
EXTRA_ORIGINS: list[str] = [o.strip() for o in _extra.split(",") if o.strip()]

# ── Meta Conversions API ─────────────────────────────────────
META_PIXEL_ID = os.getenv("META_PIXEL_ID", "")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")

# ── Dev flags ─────────────────────────────────────────────────
# Set MOCK_AI=true in .env to skip OpenAI and return a placeholder image
MOCK_AI = os.getenv("MOCK_AI", "false").lower() in ("1", "true", "yes")

# ── AI prompts ───────────────────────────────────────────────
DIRECT_RENDER_PROMPT = (
    "The first image is a photo of one or more people. "
    "The second image is a reference photo of a finished acrylic LED lamp product. "
    "Using the people in the first photo as the subject, create a beautiful wide lifestyle photo of a finished acrylic LED lamp "
    "placed on a wooden nightstand beside a cozy, neatly made bed in a warmly lit bedroom. "
    "The lamp is small in the frame — shoot from far away so the entire bedroom scene is clearly visible, "
    "with the bed, the nightstand and the lamp all fitting comfortably in the wide shot. "
    "The acrylic panel features a minimalist black and white line art engraving of the people from the first photo, "
    "keeping their pose, expressions, hair and body outlines faithfully. "
    "The panel has NO text, NO letters, NO words — only the silhouette line art of the people. "
    "Match the visual style, size and LED base shown in the reference image as closely as possible. "
    "The LED base glows with a soft light purple / lavender light that gently illuminates the acrylic panel. "
    "The purple glow casts a subtle lilac hue on the nightstand surface. "
    "The overall mood is intimate, cozy and inviting — like a real bedroom decoration photo from a lifestyle magazine. "
    "Photorealistic, high quality, deep bokeh background, natural ambient lighting, subtle purple-tinted shadows."
)

REFERENCE_LAMP_PATH = str(Path(__file__).parent.parent / "lampara_referencia.jpg")
