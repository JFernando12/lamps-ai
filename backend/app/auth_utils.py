"""JWT auth utilities and shared security helpers."""
import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException, Request
from jose import JWTError, jwt
from . import config

logger = logging.getLogger(__name__)


def validate_mp_webhook_signature(request: Request, data_id: str) -> None:
    """Validate the x-signature header sent by MercadoPago on IPN webhooks.

    The signed manifest is: ``id:{data_id};request-id:{x-request-id};ts:{ts};``
    In production, MP_WEBHOOK_SECRET is required. In other environments validation
    is skipped with a warning when the secret is absent.
    """
    if not config.MP_WEBHOOK_SECRET:
        if config.APP_ENV == "production":
            logger.error("MP_WEBHOOK_SECRET not configured — rejecting webhook in production")
            raise HTTPException(status_code=401, detail="Webhook authentication not configured")
        logger.warning("MP_WEBHOOK_SECRET not set — skipping MP webhook signature validation")
        return
    sig_header = request.headers.get("x-signature", "")
    request_id = request.headers.get("x-request-id", "")
    parts = dict(p.split("=", 1) for p in sig_header.split(",") if "=" in p)
    ts = parts.get("ts", "")
    v1 = parts.get("v1", "")
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    computed = hmac.new(
        config.MP_WEBHOOK_SECRET.encode(),
        manifest.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(computed, v1):
        raise HTTPException(status_code=401, detail="Invalid MP webhook signature")
    # Reject replayed webhooks: timestamp must be within 5 minutes
    try:
        ts_dt = datetime.fromtimestamp(int(ts) / 1000, tz=timezone.utc)
        if abs((datetime.now(timezone.utc) - ts_dt).total_seconds()) > 300:
            raise HTTPException(status_code=401, detail="Webhook timestamp expired")
    except HTTPException:
        raise
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid webhook timestamp")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(email: str, is_admin: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": email, "admin": is_admin, "exp": expire},
        config.JWT_SECRET,
        algorithm=config.JWT_ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except JWTError:
        return None
