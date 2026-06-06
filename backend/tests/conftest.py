"""Test fixtures.

Everything runs offline: an in-memory SQLite DB (StaticPool), fakeredis, a
deterministic fake chat model, and disabled rate limiting. No network, no API
key, no cost.
"""

from __future__ import annotations

import os

# Configure the environment BEFORE importing app modules (settings are cached,
# and some modules read settings at import time).
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("LLM_PROVIDER", "groq")
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SYLLABUS_TURN_LIMIT", "1")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

from typing import AsyncIterator  # noqa: E402

import fakeredis.aioredis  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from langchain_core.messages import AIMessage, AIMessageChunk  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.cache.redis as redis_module  # noqa: E402
from app.db import models  # noqa: F401,E402  (register tables)
from app.db.base import Base, get_db  # noqa: E402
from app.main import create_app  # noqa: E402


class FakeChatModel:
    """Stands in for a LangChain chat model in tests."""

    STREAM_TOKENS = ["Hello", ", ", "world", "<END_OF_TURN>"]

    async def ainvoke(self, messages: object, **kwargs: object) -> AIMessage:
        return AIMessage(content="FAKE_SYLLABUS")

    async def astream(
        self, messages: object, **kwargs: object
    ) -> AsyncIterator[AIMessageChunk]:
        for token in self.STREAM_TOKENS:
            yield AIMessageChunk(content=token)


@pytest.fixture(autouse=True)
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    def factory(*args: object, **kwargs: object) -> FakeChatModel:
        return FakeChatModel()

    monkeypatch.setattr("app.agents.syllabus.build_chat_model", factory)
    monkeypatch.setattr("app.agents.teaching.build_chat_model", factory)


@pytest_asyncio.fixture
async def sessionmaker_() -> AsyncIterator[async_sessionmaker]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(
    sessionmaker_: async_sessionmaker,
) -> AsyncIterator[AsyncClient]:
    redis_module._redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app = create_app()

    async def override_get_db() -> AsyncIterator[object]:
        async with sessionmaker_() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://test"
    ) as http_client:
        yield http_client

    await redis_module.close_redis()
