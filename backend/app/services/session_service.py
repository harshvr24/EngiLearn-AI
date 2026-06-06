"""Session-state helpers shared by the syllabus and teaching services.

Reconciles the Redis hot tier with the Postgres durable tier.
"""

from __future__ import annotations

import uuid
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import cache_syllabus, get_cached_syllabus
from app.db import repositories

Turn = Tuple[str, str]


async def get_syllabus_content(
    db: AsyncSession, session_id: uuid.UUID
) -> Optional[str]:
    """Return the syllabus text, preferring the Redis cache."""
    cached = await get_cached_syllabus(session_id)
    if cached is not None:
        return cached
    syllabus = await repositories.get_syllabus(db, session_id)
    if syllabus is None:
        return None
    await cache_syllabus(session_id, syllabus.content)
    return syllabus.content


async def get_history(
    db: AsyncSession, session_id: uuid.UUID, limit: Optional[int] = None
) -> List[Turn]:
    """Return conversation turns as ``(role, content)`` pairs."""
    messages = await repositories.get_messages(db, session_id, limit=limit)
    return [(m.role, m.content) for m in messages]
