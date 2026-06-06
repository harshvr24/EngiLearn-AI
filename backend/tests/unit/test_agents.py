"""Unit tests for the migrated agent logic (fake LLM, no network)."""

from __future__ import annotations

from app.agents.syllabus import generate_syllabus
from app.agents.teaching import stream_lesson


async def test_generate_syllabus_returns_text() -> None:
    result = await generate_syllabus("Reinforcement Learning")
    assert isinstance(result, str)
    assert result == "FAKE_SYLLABUS"


async def test_stream_lesson_yields_tokens() -> None:
    history = [("human", "Please begin.")]
    tokens = [
        token
        async for token in stream_lesson(
            topic="Algorithms",
            syllabus="1. Intro",
            history=history,
        )
    ]
    assert "".join(tokens).startswith("Hello, world")
