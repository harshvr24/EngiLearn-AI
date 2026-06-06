"""Syllabus endpoint: create a session and generate its syllabus."""

from __future__ import annotations

from typing import Optional

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import SyllabusRequest, SyllabusResponse
from app.core.config import Settings, get_settings
from app.core.rate_limit import RateLimiter
from app.core.security import get_current_user
from app.db.base import get_db
from app.services.syllabus_service import create_session_with_syllabus

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["syllabus"])

_rate_limit = RateLimiter(get_settings().rate_limit_syllabus)


@router.post(
    "/syllabus",
    response_model=SyllabusResponse,
    dependencies=[Depends(_rate_limit)],
)
async def create_syllabus(
    payload: SyllabusRequest,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _user: Optional[str] = Depends(get_current_user),
) -> SyllabusResponse:
    session, content = await create_session_with_syllabus(
        db, payload.topic, settings
    )
    return SyllabusResponse(
        session_id=session.id, topic=session.topic, syllabus=content
    )
