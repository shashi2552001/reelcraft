from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import generations, studio, system
from app.core.config import get_settings
from app.core.logging import setup_logging

setup_logging()
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description=(
        "Modular FastAPI backend for ReelCraft Studio "
        "(PostgreSQL + Alembic + FFmpeg Pipeline + Self-Hosted Cloud GPU Worker)."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-ReelCraft-User"],
)

app.include_router(system.router)
app.include_router(studio.router)
app.include_router(generations.router)
