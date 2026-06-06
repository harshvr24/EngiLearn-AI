"""Teaching orchestration: stream the instructor's next turn and persist it.

Split into ``prepare_turn`` (validates up-front so the API can return clean
4xx codes *before* the SSE stream starts) and ``stream_turn`` (streams tokens
and persists the assembled reply once finished).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import AsyncIterator, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.teaching import END_OF_TURN, Turn, stream_lesson
from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError, ValidationError
from app.db import repositories
from app.services.session_service import get_history, get_syllabus_content

logger = structlog.get_logger(__name__)


@dataclass
class TurnContext:
    session_id: uuid.UUID
    topic: str
    syllabus: str
    turns: List[Turn] = field(default_factory=list)


async def prepare_turn(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_message: str,
    settings: Settings | None = None,
) -> TurnContext:
    """Validate the request and persist the learner's message.

    Raises ``NotFoundError`` / ``ValidationError`` before any streaming begins.
    """
    settings = settings or get_settings()

    session = await repositories.get_session(db, session_id)
    if session is None:
        raise NotFoundError("Session not found.")

    syllabus = await get_syllabus_content(db, session_id)
    if syllabus is None:
        raise NotFoundError("Syllabus not found for this session.")

    user_message = (user_message or "").strip()
    if len(user_message) > settings.max_input_chars:
        raise ValidationError("Message is too long.")

    turns: List[Turn] = await get_history(
        db, session_id, limit=settings.max_history_messages
    )
    if user_message:
        await repositories.add_message(db, session_id, "human", user_message)
        turns.append(("human", user_message))
    elif not turns:
        # First interaction with no input: nudge the instructor to start.
        turns.append(("human", "Please begin the lesson."))

    return TurnContext(
        session_id=session_id,
        topic=session.topic,
        syllabus=syllabus,
        turns=turns,
    )


async def stream_turn(
    db: AsyncSession,
    context: TurnContext,
    settings: Settings | None = None,
) -> AsyncIterator[str]:
    """Stream the instructor reply, persisting it once complete."""
    settings = settings or get_settings()
    collected: List[str] = []

    async for token in stream_lesson(
        context.topic, context.syllabus, context.turns, settings
    ):
        collected.append(token)
        yield token

    reply = "".join(collected).replace(END_OF_TURN, "").strip()
    if reply:
        await repositories.add_message(
            db, context.session_id, "instructor", reply
        )
    logger.info(
        "teaching.turn_completed",
        session_id=str(context.session_id),
        reply_chars=len(reply),
    )
