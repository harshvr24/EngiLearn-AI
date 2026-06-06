"""FastAPI application factory."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1 import (
    routes_chat,
    routes_documents,
    routes_flashcards,
    routes_health,
    routes_interview,
    routes_questions,
    routes_syllabus,
    routes_visual,
)
from app.cache.redis import close_redis
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import RequestIdMiddleware, configure_logging
from app.db.base import dispose_engine

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger.info("app.startup", version=__version__)
    yield
    await dispose_engine()
    await close_redis()
    logger.info("app.shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(
        title="EngiLearn AI",
        version=__version__,
        description="Multi-agent AI tutor backend.",
        lifespan=lifespan,
    )

    # CORS for the frontend. Explicit origins plus a localhost/127.0.0.1
    # any-port regex so local dev works regardless of the browser host.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIdMiddleware)

    register_exception_handlers(app)

    app.include_router(routes_health.router)
    app.include_router(routes_syllabus.router, prefix="/api/v1")
    app.include_router(routes_chat.router, prefix="/api/v1")
    app.include_router(routes_documents.router, prefix="/api/v1")
    app.include_router(routes_flashcards.router, prefix="/api/v1")
    app.include_router(routes_questions.router, prefix="/api/v1")
    app.include_router(routes_interview.router, prefix="/api/v1")
    app.include_router(routes_visual.router, prefix="/api/v1")

    return app


app = create_app()
