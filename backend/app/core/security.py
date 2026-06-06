"""Authentication stubs.

Auth is intentionally deferred. These dependencies define the *shape* of the
future JWT flow so routes can already declare it: today ``get_current_user``
always returns ``None`` (anonymous), and sessions are identified by their UUID.
When auth lands, only the bodies here change — route signatures stay the same.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Header


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[str]:
    """Return the current user id, or ``None`` for anonymous requests.

    STUB: always anonymous for now. Wire JWT decoding here later and return the
    resolved user id (which maps to ``LearningSession.user_id``).
    """
    return None
