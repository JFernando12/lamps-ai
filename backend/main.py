from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.routers.ai import router as ai_router
from app.routers.auth import router as auth_router
from app.routers.photos import router as photos_router
from app.routers.orders import router as orders_router
from app.routers.admin import router as admin_router

app = FastAPI(title="Lamps AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list({config.FRONTEND_URL, "http://localhost:3000", *config.EXTRA_ORIGINS}),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(auth_router)
app.include_router(photos_router)
app.include_router(orders_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
