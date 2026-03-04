"""Auth business logic: register, login, profile."""
from datetime import datetime, timezone

from fastapi import HTTPException

from .. import auth_utils
from .. import config
from .. import database
from ..schemas.auth import LoginRequest, RegisterRequest


def register(body: RegisterRequest) -> dict:
    table = database.users_table()
    if table.get_item(Key={"email": body.email}).get("Item"):
        raise HTTPException(status_code=409, detail="Email already registered")

    table.put_item(Item={
        "email": body.email,
        "name": body.name,
        "password_hash": auth_utils.hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = auth_utils.create_token(body.email)
    return {"token": token, "email": body.email, "name": body.name}


def login(body: LoginRequest) -> dict:
    # Admin shortcut
    if body.email == config.ADMIN_EMAIL and body.password == config.ADMIN_PASSWORD:
        token = auth_utils.create_token(body.email, is_admin=True)
        return {"token": token, "email": body.email, "name": "Admin", "is_admin": True}

    table = database.users_table()
    user = table.get_item(Key={"email": body.email}).get("Item")
    if not user or not auth_utils.verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = auth_utils.create_token(body.email)
    return {"token": token, "email": body.email, "name": user.get("name", ""), "is_admin": False}


def get_me(payload: dict) -> dict:
    record = database.users_table().get_item(Key={"email": payload["sub"]}).get("Item", {})
    return {
        "email": payload["sub"],
        "name": record.get("name", ""),
        "is_admin": payload.get("admin", False),
    }
