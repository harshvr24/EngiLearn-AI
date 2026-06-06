"""Redis-backed rate limiting as a FastAPI dependency.

A small fixed-window limiter (INCR + EXPIRE) keyed by route + client IP. Used
as ``Depends(...)`` so it never interferes with request-body parsing, and it
can be disabled wholesale in tests via ``RATE_LIMIT_ENABLED=false``.

Note: this module intentionally does NOT use ``from __future__ import
annotations`` — FastAPI must see ``Request`` as a real type (not a string) to
inject it into this class-based dependency.
"""

from typing import Tuple

from fastapi import HTTPException, Request, status

from app.cache.redis import get_redis
from app.core.config import get_settings

_UNITS = {"second": 1, "minute": 60, "hour": 3600}


def parse_rate(rate: str) -> Tuple[int, int]:
    """Parse ``"30/minute"`` into ``(times, window_seconds)``."""
    times, _, unit = rate.partition("/")
    return int(times), _UNITS[unit.strip().lower()]


class RateLimiter:
    def __init__(self, rate: str) -> None:
        self.times, self.window = parse_rate(rate)

    async def __call__(self, request: Request) -> None:
        if not get_settings().rate_limit_enabled:
            return
        client = request.client.host if request.client else "anonymous"
        key = f"rl:{request.url.path}:{client}"
        redis = get_redis()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, self.window)
        if count > self.times:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please slow down.",
            )
