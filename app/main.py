from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.items import router as teas_router


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

# main.py лежит в prac1/backend/app/main.py
# поднимаемся до prac1 и находим frontend
PROJECT_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"

app.mount(
    "/",
    StaticFiles(directory=str(FRONTEND_DIR), html=True),
    name="frontend"
)
