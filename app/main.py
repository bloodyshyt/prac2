from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.session import Base, engine

# Импортируем модели ДО create_all,
# чтобы SQLAlchemy знал, какие таблицы создавать
from app.models import item
from app.models import order
from app.models import user

from app.api.v1.items import router as teas_router


# Создаём все таблицы, которых ещё нет
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Травяная Лавка API",
    description="API для сайта лечебных травяных сборов и чаев",
    version="1.0.0"
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API
app.include_router(
    teas_router,
    prefix="/api/v1",
    tags=["Травяные чаи"]
)


# Путь до frontend
PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"


# Фронтенд подключаем ПОСЛЕ API,
# чтобы "/" не перехватывал /api/v1/*
app.mount(
    "/",
    StaticFiles(
        directory=str(FRONTEND_DIR),
        html=True
    ),
    name="frontend"
)