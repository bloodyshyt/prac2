from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.session import Base, engine

# ВАЖНО: импортируем модели до create_all
from app.models.user import UserModel
from app.models.order import OrderModel

from app.api.v1.items import router as teas_router
from app.api.v1.auth import router as auth_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Травяная Лавка API",
    description="API для сайта лечебных травяных сборов и чаев",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    teas_router,
    prefix="/api/v1",
    tags=["Травяные чаи"]
)

app.include_router(
    auth_router,
    prefix="/api/v1",
    tags=["Авторизация"]
)


PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"


app.mount(
    "/",
    StaticFiles(
        directory=str(FRONTEND_DIR),
        html=True
    ),
    name="frontend"
)