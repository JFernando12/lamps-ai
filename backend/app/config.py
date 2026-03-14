import os
from dotenv import load_dotenv

load_dotenv()

AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
MP_ACCESS_TOKEN = os.environ["MP_ACCESS_TOKEN"]
MP_WEBHOOK_SECRET = os.environ["MP_WEBHOOK_SECRET"]
APP_ENV = os.environ["APP_ENV"]   # "development" | "production"
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
AGENT_API_KEY = os.environ["AGENT_API_KEY"]
AI_PLATFORM_BASE_URL = os.environ["AI_PLATFORM_BASE_URL"]
AGENT_WEBHOOK_SECRET = os.environ["AGENT_WEBHOOK_SECRET"]
FRONTEND_URL = os.environ["FRONTEND_URL"]
BACKEND_URL = os.environ["BACKEND_URL"]

AWS_REGION = "us-east-1"
S3_BUCKET = "lamps-ai"

DYNAMO_TABLE_USERS = "lamps_users"
DYNAMO_TABLE_PHOTOS = "lamps_photos"
DYNAMO_TABLE_ORDERS = "lamps_orders"
DYNAMO_TABLE_CARTS = "lamps_carts"
DYNAMO_TABLE_EMAIL_CAMPAIGNS = "lamps_email_campaigns"
DYNAMO_TABLE_DESIGNS = "lamps_designs"
DYNAMO_TABLE_PAYMENTS = "lamps_payments"
DYNAMO_TABLE_CONFIG = "lamps_config"

SES_FROM_EMAIL = os.getenv("SES_FROM_EMAIL", "")

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7

ADMIN_EMAIL = "admin@lamps.ai"

META_PIXEL_ID = os.getenv("META_PIXEL_ID", "")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")

