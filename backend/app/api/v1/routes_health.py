"""Liveness and readiness probes."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import HealthResponse, ReadyResponse
from app.cache.redis import ping as redis_ping
from app.db.base import get_db

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness — the process is up."""
    return HealthResponse(status="ok")


@router.get("/ready", response_model=ReadyResponse)
async def ready(
    response: Response, db: AsyncSession = Depends(get_db)
) -> ReadyResponse:
    """Readiness — dependencies (Postgres, Redis) are reachable."""
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
        logger.warning("readiness.db_unreachable")

    redis_ok = await redis_ping()

    status = "ok" if db_ok and redis_ok else "degraded"
    if status != "ok":
        response.status_code = 503
    return ReadyResponse(status=status, database=db_ok, redis=redis_ok)
