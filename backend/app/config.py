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

# ── Dev flags ─────────────────────────────────────────────────
# Set MOCK_AI=true in .env to skip OpenAI and return a placeholder image
MOCK_AI = os.getenv("MOCK_AI", "false").lower() in ("1", "true", "yes")

# ── AI prompts ───────────────────────────────────────────────
DIRECT_RENDER_PROMPT = (
    "The first image is a photo of one or more people. "
    "The second image is a reference photo of a finished acrylic LED lamp product. "
    "Using the people in the first photo as the subject, create a photorealistic product render of a finished acrylic LED lamp. "
    "The acrylic panel should feature a minimalist black and white line art engraving of the people, "
    "keeping their pose, expressions, hair and body outlines faithfully. "
    "The acrylic panel shape should follow the organic silhouette of the figures. "
    "Match the visual style, size and LED base shown in the reference image as closely as possible. "
    "The lamp is placed naturally on a wooden desk or table, with soft ambient room lighting. "
    "The LED base glows with soft blue-white light that illuminates the engraved lines on the acrylic. "
    "The scene feels warm and cozy, like a bedroom shelf or nightstand. "
    "Photorealistic, high quality, natural lighting, subtle reflections on the table surface."
)

REFERENCE_LAMP_PATH = str(Path(__file__).parent.parent / "lampara_referencia.jpg")
