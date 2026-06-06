"""Integration tests for the HTTP API (offline: sqlite + fakeredis + fake)."""

from __future__ import annotations

from httpx import AsyncClient


async def test_health(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_ready(client: AsyncClient) -> None:
    resp = await client.get("/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["database"] is True
    assert body["redis"] is True


async def test_syllabus_then_chat_and_history(client: AsyncClient) -> None:
    # 1. Generate a syllabus -> creates a session.
    resp = await client.post(
        "/api/v1/syllabus", json={"topic": "Graph Theory"}
    )
    assert resp.status_code == 200
    data = resp.json()
    session_id = data["session_id"]
    assert data["syllabus"] == "FAKE_SYLLABUS"
    assert data["topic"] == "Graph Theory"

    # 2. Stream a lesson turn over SSE.
    async with client.stream(
        "POST",
        "/api/v1/chat",
        json={"session_id": session_id, "message": "Start please"},
    ) as resp:
        assert resp.status_code == 200
        body = await resp.aread()
    text = body.decode()
    assert "Hello" in text
    assert "world" in text
    assert "[DONE]" in text

    # 3. History persists both messages.
    resp = await client.get(f"/api/v1/chat/{session_id}/history")
    assert resp.status_code == 200
    messages = resp.json()["messages"]
    roles = [m["role"] for m in messages]
    assert "human" in roles
    assert "instructor" in roles
    # The instructor reply should have <END_OF_TURN> stripped.
    instructor = next(m for m in messages if m["role"] == "instructor")
    assert "<END_OF_TURN>" not in instructor["content"]


async def test_chat_unknown_session_returns_404(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/chat",
        json={
            "session_id": "00000000-0000-0000-0000-000000000000",
            "message": "hi",
        },
    )
    assert resp.status_code == 404


async def test_syllabus_rejects_empty_topic(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/syllabus", json={"topic": ""})
    # Pydantic min_length=1 -> 422.
    assert resp.status_code == 422
