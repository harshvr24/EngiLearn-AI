"""Chat endpoints: streamed instructor turns (SSE) and history."""

from __future__ import annotations

import uuid
from typing import AsyncIterator, Dict, Optional

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.api.v1.schemas import ChatRequest, HistoryResponse, MessageOut
from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError
from app.core.rate_limit import RateLimiter
from app.core.security import get_current_user
from app.db import repositories
from app.db.base import get_db
from app.services.teaching_service import prepare_turn, stream_turn

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["chat"])

_rate_limit = RateLimiter(get_settings().rate_limit_chat)


@router.post("/chat", dependencies=[Depends(_rate_limit)])
async def chat(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _user: Optional[str] = Depends(get_current_user),
) -> EventSourceResponse:
    # Validate + persist the learner message up-front so errors surface as
    # clean HTTP codes before the stream opens.
    context = await prepare_turn(
        db, payload.session_id, payload.message, settings
    )

    async def event_gen() -> AsyncIterator[Dict[str, str]]:
        try:
            async for token in stream_turn(db, context, settings):
                yield {"event": "token", "data": token}
        except Exception:
            logger.exception("chat.stream_failed")
            yield {"event": "error", "data": "stream_error"}
            return
        yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_gen())


@router.get("/chat/{session_id}/history", response_model=HistoryResponse)
async def history(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> HistoryResponse:
    session = await repositories.get_session(db, session_id)
    if session is None:
        raise NotFoundError("Session not found.")
    messages = await repositories.get_messages(db, session_id)
    return HistoryResponse(
        session_id=session_id,
        topic=session.topic,
        messages=[
            MessageOut(
                role=m.role,
                content=m.content,
                position=m.position,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )
