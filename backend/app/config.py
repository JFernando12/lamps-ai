import os
from dotenv import load_dotenv

load_dotenv()

# ── Secrets (required in .env) ────────────────────────────────
AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
MP_ACCESS_TOKEN = os.environ["MP_ACCESS_TOKEN"]
MP_PUBLIC_KEY = os.environ["MP_PUBLIC_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# ── Agent platform ───────────────────────────────────────────
# Shared secret the AI platform sends in Authorization: Bearer {AGENT_API_KEY}
AGENT_API_KEY = os.getenv("AGENT_API_KEY", "")
# Base URL of the AI platform (for async callbacks)
AI_PLATFORM_BASE_URL = os.getenv("AI_PLATFORM_BASE_URL", "https://fake-ai-platform.example.com")
# Secret sent in X-Webhook-Secret when calling the platform callbacks
AGENT_WEBHOOK_SECRET = os.getenv("AGENT_WEBHOOK_SECRET", "")

# ── AWS / infra (hardcoded, override via env if needed) ───────
AWS_REGION = "us-east-1"
S3_BUCKET = "lamps-ai"

# ── DynamoDB table names ──────────────────────────────────────
DYNAMO_TABLE_USERS = "lamps_users"
DYNAMO_TABLE_PHOTOS = "lamps_photos"
DYNAMO_TABLE_ORDERS = "lamps_orders"
DYNAMO_TABLE_CARTS = "lamps_carts"
DYNAMO_TABLE_EMAIL_CAMPAIGNS = "lamps_email_campaigns"
DYNAMO_TABLE_DESIGNS = "lamps_designs"
DYNAMO_TABLE_PAYMENTS = "lamps_payments"
DYNAMO_TABLE_CONFIG = "lamps_config"

# ── Email (Amazon SES) ────────────────────────────────────────
# Must be a verified sender in SES. Leave empty to disable cart emails.
SES_FROM_EMAIL = os.getenv("SES_FROM_EMAIL", "")

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

