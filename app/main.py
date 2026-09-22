from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.items import router as teas_router
from app.api.v1.auth import router as auth_router  # Импортируем роутер авторизации

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

# Подключаем роутеры API к нашему серверу
app.include_router(teas_router, prefix="/api/v1", tags=["Травяные чаи"])
app.include_router(auth_router, prefix="/api/v1", tags=["Авторизация"])  # Подключение авторизации

# Вычисляем правильный путь к папке frontend
PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"

# Раздаем фронтенд-файлы
app.mount(
    "/",
    StaticFiles(directory=str(FRONTEND_DIR), html=True),
    name="frontend"
)
