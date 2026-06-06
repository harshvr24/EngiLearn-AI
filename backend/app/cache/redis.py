"""Redis client and hot-path caching.

Redis is the "hot" tier in front of Postgres. We cache the (immutable) syllabus
per session so streaming a lesson doesn't re-read it from the database on every
request. It also backs rate limiting (configured in the API layer).
"""

from __future__ import annotations

import uuid
from typing import Optional

import redis.asyncio as aioredis

from app.core.config import get_settings

_SYLLABUS_TTL_SECONDS = 60 * 60 * 24  # 24h
_redis: Optional[aioredis.Redis] = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def ping() -> bool:
    try:
        return bool(await get_redis().ping())
    except Exception:
        return False


def _syllabus_key(session_id: uuid.UUID) -> str:
    return f"syllabus:{session_id}"


async def cache_syllabus(session_id: uuid.UUID, content: str) -> None:
    await get_redis().set(
        _syllabus_key(session_id), content, ex=_SYLLABUS_TTL_SECONDS
    )


async def get_cached_syllabus(session_id: uuid.UUID) -> Optional[str]:
    return await get_redis().get(_syllabus_key(session_id))


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()  # type: ignore[attr-defined]
    _redis = None
