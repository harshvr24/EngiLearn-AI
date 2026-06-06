"""Syllabus orchestration: create a session and generate its syllabus."""

from __future__ import annotations

from typing import Tuple

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.syllabus import generate_syllabus
from app.cache.redis import cache_syllabus
from app.core.config import Settings, get_settings
from app.core.errors import LLMError, ValidationError
from app.db import repositories
from app.db.models import LearningSession

logger = structlog.get_logger(__name__)


async def create_session_with_syllabus(
    db: AsyncSession,
    topic: str,
    settings: Settings | None = None,
) -> Tuple[LearningSession, str]:
    """Create a learning session and generate + persist its syllabus."""
    settings = settings or get_settings()
    topic = (topic or "").strip()
    if not topic:
        raise ValidationError("Topic must not be empty.")
    if len(topic) > settings.max_input_chars:
        raise ValidationError("Topic is too long.")

    session = await repositories.create_session(db, topic)
    logger.info("syllabus.session_created", session_id=str(session.id))

    try:
        content = await generate_syllabus(topic, settings)
    except Exception as exc:  # provider/network failures
        logger.exception("syllabus.generation_failed")
        raise LLMError("Failed to generate the syllabus.") from exc

    await repositories.save_syllabus(db, session.id, topic, content)
    await cache_syllabus(session.id, content)
    return session, content
