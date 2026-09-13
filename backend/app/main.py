import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import BASE_DIR, settings
from .inference import ModelNotLoadedError, load_model
from .mongo_client import MongoNotConfiguredError, get_mongo_client
from .routers import chat, detect, history

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


import asyncio

def _warmup_model_background():
    try:
        load_model()
        logger.info("RT-DETR model loaded and warmed up successfully.")
    except ModelNotLoadedError as e:
        logger.warning("Model not loaded at startup (uploads will fail until fixed): %s", e)
    except Exception as e:
        logger.warning("Unexpected error during model warmup: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Asynchronously warmup model so the server binds to $PORT immediately (prevents Render 502 timeouts)
    asyncio.create_task(asyncio.to_thread(_warmup_model_background))

    try:
        get_mongo_client()
        logger.info("MongoDB connected successfully.")
    except MongoNotConfiguredError as e:
        logger.warning("MongoDB not available at startup (chat history will fail until fixed): %s", e)
    yield


app = FastAPI(title="Pothole Detection API", lifespan=lifespan)

cors_origins = list(settings.cors_origins) if isinstance(settings.cors_origins, list) else [settings.cors_origins]
for extra_origin in [
    "https://pothole-chatbot.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]:
    if extra_origin not in cors_origins:
        cors_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(settings.upload_dir.parent)), name="static")

app.include_router(detect.router)
app.include_router(chat.router)
app.include_router(history.router)


@app.get("/api/health")
def health():
    db_status = "connected"
    try:
        get_mongo_client().admin.command("ping")
    except Exception:
        db_status = "disconnected"

    from .inference import _model
    model_status = "ready" if _model is not None else "warming_up"

    return {
        "status": "ok",
        "backend": "healthy",
        "database": db_status,
        "model": model_status,
        "vision_model": "RT-DETR-L",
        "llm_model": settings.groq_model,
    }


# Serve built frontend SPA if available (for complete full-stack deployment)
frontend_dist = BASE_DIR.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    logger.info("Serving frontend build from %s", frontend_dist)
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend_assets")

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("static/"):
            return JSONResponse(status_code=404, content={"detail": "Endpoint not found."})
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "status": "online",
            "message": "Pothole Detection & Chatbot API is running.",
            "docs": "/docs",
            "health": "/api/health",
        }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})
