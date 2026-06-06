"""Flashcard generation agent.

Given a topic string or raw document text, produces N flashcards as
structured JSON.  Uses LangChain's JsonOutputParser so the result is
already a Python list — no manual JSON parsing by callers.
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import Settings, get_settings
from app.llm.client import build_chat_model

logger = structlog.get_logger(__name__)

_SYSTEM = SystemMessage(
    content=(
        "You are a learning-science expert who creates high-quality flashcards. "
        "When asked, you return ONLY a valid JSON array and nothing else. "
        "Each element must have exactly three string keys: "
        '"front" (the question or term), '
        '"back" (the concise answer or definition), '
        '"hint" (a one-sentence clue that helps without giving it away). '
        "Do not include markdown fences or any text outside the JSON array."
    )
)

_PROMPT_TOPIC = (
    "Create {count} flashcards about the topic: {topic}\n\n"
    "Return ONLY the JSON array."
)

_PROMPT_TEXT = (
    "Based on the following text, create {count} flashcards that test "
    "the most important concepts. Cover different sections of the text.\n\n"
    "Text:\n{text}\n\n"
    "Return ONLY the JSON array."
)


async def generate_flashcards(
    *,
    topic: str | None = None,
    text: str | None = None,
    count: int = 10,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    """Return a list of ``{front, back, hint}`` dicts."""
    if not topic and not text:
        raise ValueError("Provide at least one of 'topic' or 'text'.")

    settings = settings or get_settings()
    model = build_chat_model(temperature=0.7, settings=settings)
    parser = JsonOutputParser()
    chain = model | parser

    if text:
        # Truncate to avoid huge token counts; keep first ~6000 chars
        excerpt = text[:6000]
        prompt = _PROMPT_TEXT.format(count=count, text=excerpt)
    else:
        prompt = _PROMPT_TOPIC.format(count=count, topic=topic)

    logger.info("flashcard.generating", count=count, source="text" if text else "topic")

    result = await chain.ainvoke([_SYSTEM, HumanMessage(content=prompt)])

    # Normalise: the parser may return a list or a dict with a list inside
    if isinstance(result, list):
        cards = result
    elif isinstance(result, dict):
        # Try common wrapper keys
        for key in ("flashcards", "cards", "data", "items"):
            if key in result and isinstance(result[key], list):
                cards = result[key]
                break
        else:
            cards = list(result.values())[0] if result else []
    else:
        cards = json.loads(str(result))

    logger.info("flashcard.generated", count=len(cards))
    return cards
