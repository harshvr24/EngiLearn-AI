"""Repository layer.

A thin storage abstraction over the ORM models so services never embed raw
queries. Swapping the persistence backend later only touches this module.
"""

from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import LearningSession, Message, Syllabus


async def create_session(
    db: AsyncSession,
    topic: str,
    user_id: Optional[uuid.UUID] = None,
) -> LearningSession:
    session = LearningSession(topic=topic, user_id=user_id)
    db.add(session)
    await db.flush()
    return session


async def get_session(
    db: AsyncSession, session_id: uuid.UUID
) -> Optional[LearningSession]:
    return await db.get(LearningSession, session_id)


async def save_syllabus(
    db: AsyncSession, session_id: uuid.UUID, topic: str, content: str
) -> Syllabus:
    syllabus = Syllabus(session_id=session_id, topic=topic, content=content)
    db.add(syllabus)
    await db.flush()
    return syllabus


async def get_syllabus(
    db: AsyncSession, session_id: uuid.UUID
) -> Optional[Syllabus]:
    result = await db.execute(
        select(Syllabus).where(Syllabus.session_id == session_id)
    )
    return result.scalar_one_or_none()


async def _next_position(db: AsyncSession, session_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(Message.position), -1)).where(
            Message.session_id == session_id
        )
    )
    return int(result.scalar_one()) + 1


async def add_message(
    db: AsyncSession, session_id: uuid.UUID, role: str, content: str
) -> Message:
    position = await _next_position(db, session_id)
    message = Message(
        session_id=session_id,
        role=role,
        content=content,
        position=position,
    )
    db.add(message)
    await db.flush()
    return message


async def get_messages(
    db: AsyncSession, session_id: uuid.UUID, limit: Optional[int] = None
) -> List[Message]:
    stmt = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.position)
    )
    if limit is not None:
        # Take the most recent ``limit`` messages, preserving order.
        stmt = (
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.position.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        rows = list(result.scalars().all())
        return list(reversed(rows))
    result = await db.execute(stmt)
    return list(result.scalars().all())
