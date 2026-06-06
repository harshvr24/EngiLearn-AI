"""Live end-to-end demo against the real LLM provider.

Runs the actual API (syllabus generation -> streamed teaching -> history) using
SQLite for persistence and an in-process fake Redis, while calling the *real*
configured LLM (Groq by default). The API key is read from ``.env`` and never
printed.

Usage (from the backend/ directory):
    .venv/Scripts/python.exe scripts/live_demo.py "Binary Search Trees"
"""
import asyncio
import os
import sys

# Overrides for a no-Docker local run. The GROQ_API_KEY is intentionally NOT
# set here — it is loaded from .env by Settings.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("SYLLABUS_TURN_LIMIT", "1")
# Use Groq's fast, high-free-tier-limit model for a snappy, rate-limit-free
# demo. (The .env default of llama-3.3-70b-versatile is higher quality but has
# tighter free limits — override here just for the demo.)
os.environ.setdefault("LLM_MODEL", "llama-3.1-8b-instant")
os.environ.setdefault("LLM_MAX_RETRIES", "2")

import fakeredis.aioredis  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.cache.redis as redis_module  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.db import models  # noqa: F401,E402
from app.db.base import Base, get_db  # noqa: E402
from app.main import create_app  # noqa: E402


def rule(title: str) -> None:
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


async def main(topic: str) -> None:
    settings = get_settings()
    rule("CONFIG")
    print(f"provider = {settings.llm_provider}")
    print(f"model    = {settings.llm_model}")
    print(f"key set  = {bool(settings.groq_api_key)}")

    # Fake Redis (no server needed); real SQLite engine.
    redis_module._redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    app = create_app()

    async def override_get_db():
        async with sessionmaker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://demo", timeout=120.0
    ) as client:
        rule("GET /health  &  GET /ready")
        print("health:", (await client.get("/health")).json())
        print("ready :", (await client.get("/ready")).json())

        rule(f"POST /api/v1/syllabus   topic = {topic!r}")
        print("(calling the real LLM — multi-agent role-play...)\n")
        resp = await client.post(
            "/api/v1/syllabus", json={"topic": topic}
        )
        if resp.status_code != 200:
            print("ERROR", resp.status_code, resp.text)
            return
        data = resp.json()
        session_id = data["session_id"]
        print(f"session_id = {session_id}\n")
        print("----- SYLLABUS -----")
        print(data["syllabus"])

        question = "Start with the first topic and explain it with an example."
        rule(f"POST /api/v1/chat   (SSE stream)   message = {question!r}")
        chunks: list[str] = []
        async with client.stream(
            "POST",
            "/api/v1/chat",
            json={"session_id": session_id, "message": question},
        ) as stream:
            event = None
            async for line in stream.aiter_lines():
                if line.startswith("event:"):
                    event = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    # Strip exactly ONE space (the SSE delimiter), so spaces
                    # that are part of a token are preserved.
                    payload = line[len("data:"):]
                    if payload.startswith(" "):
                        payload = payload[1:]
                    if event == "token":
                        chunks.append(payload)
                        sys.stdout.write(payload)
                        sys.stdout.flush()
                    elif event == "done":
                        print("\n\n[stream complete]")
                    elif event == "error":
                        print("\n[stream error]", payload)

        rule("GET /api/v1/chat/{session_id}/history")
        hist = (
            await client.get(f"/api/v1/chat/{session_id}/history")
        ).json()
        for m in hist["messages"]:
            preview = m["content"][:80].replace("\n", " ")
            print(f"  [{m['position']}] {m['role']:10} ({len(m['content'])} chars): {preview}...")

    await engine.dispose()
    await redis_module.close_redis()
    rule("DONE - real syllabus + streamed lesson + persisted history [OK]")


if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "Binary Search Trees"
    asyncio.run(main(topic))
