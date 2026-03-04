from fastapi import APIRouter, Depends

from ..dependencies import get_current_user
from ..schemas.auth import LoginRequest, RegisterRequest
from ..services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(body: RegisterRequest):
    return auth_service.register(body)


@router.post("/login")
def login(body: LoginRequest):
    return auth_service.login(body)


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return auth_service.get_me(user)
