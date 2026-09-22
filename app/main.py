from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse, Response

from app.database.session import Base, engine

from app.models.user import UserModel
from app.models.order import OrderModel
from app.models.item import TeaModel

from app.api.v1.items import router as teas_router
from app.api.v1.auth import router as auth_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Травяная Лавка API",
    description="API для сайта лечебных травяных сборов и чаев",
    version="1.2.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"

    path = request.url.path.lower()
    if path.endswith((".css", ".js", ".jpg", ".jpeg", ".png",
                       ".svg", ".webp", ".ico", ".woff", ".woff2")):
        response.headers["Cache-Control"] = "public, max-age=604800, immutable"
    elif path.endswith(".html") or path == "/":
        response.headers["Cache-Control"] = "no-cache, must-revalidate"

    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(f"⚠️ Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера"},
    )


app.include_router(teas_router, prefix="/api/v1", tags=["Травяные чаи"])
app.include_router(auth_router, prefix="/api/v1", tags=["Авторизация"])


# ═══════════════════════════════════════════════════════════
# СТАТИКА
# ═══════════════════════════════════════════════════════════
PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"


@app.get("/robots.txt", include_in_schema=False)
async def robots_txt():
    f = FRONTEND_DIR / "robots.txt"
    if f.exists():
        return FileResponse(f, media_type="text/plain")
    return JSONResponse(status_code=404, content={"detail": "not found"})


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    f = FRONTEND_DIR / "sitemap.xml"
    if f.exists():
        return FileResponse(f, media_type="application/xml")
    return JSONResponse(status_code=404, content={"detail": "not found"})


def serve_static_gzip(request: Request, filename: str, media_type: str):
    original = FRONTEND_DIR / filename
    compressed = FRONTEND_DIR / f"{filename}.gz"

    if not original.exists():
        return JSONResponse(
            status_code=404,
            content={"detail": f"{filename} not found"},
        )

    accept_encoding = request.headers.get("accept-encoding", "").lower()
    use_gzip = "gzip" in accept_encoding and compressed.exists()

    if use_gzip:
        return Response(
            content=compressed.read_bytes(),
            media_type=media_type,
            headers={
                "Content-Encoding": "gzip",
                "Cache-Control": "public, max-age=604800, immutable",
                "Vary": "Accept-Encoding",
            },
        )

    return Response(
        content=original.read_bytes(),
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=604800, immutable",
            "Vary": "Accept-Encoding",
        },
    )


@app.get("/styles.css", include_in_schema=False)
async def styles_css(request: Request):
    return serve_static_gzip(request, "styles.css", "text/css; charset=utf-8")


@app.get("/script.js", include_in_schema=False)
async def script_js(request: Request):
    return serve_static_gzip(
        request, "script.js", "application/javascript; charset=utf-8"
    )


# ⚠️ Mount — В САМОМ КОНЦЕ
app.mount(
    "/",
    StaticFiles(directory=str(FRONTEND_DIR), html=True),
    name="frontend",
)