"""Timeline generation agent.

Produces an ordered list of historical or conceptual events suitable
for rendering as a horizontal timeline.
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
        "You are an expert educator who creates educational timelines. "
        "Return ONLY a valid JSON object with two keys:\n"
        '  "title": string — a short descriptive title for the timeline.\n'
        '  "events": array of objects, each with:\n'
        '    "year": string — the year or era (e.g. "1969", "~3000 BCE", "2024")\n'
        '    "title": string — short event name (max 8 words)\n'
        '    "description": string — 1–2 sentence explanation\n'
        '    "importance": integer 1, 2, or 3 '
        "(1=minor milestone, 2=significant, 3=major breakthrough)\n"
        "Include 8–15 events, ordered chronologically.\n"
        "Do NOT include markdown fences or any text outside the JSON object."
    )
)

_PROMPT = (
    "Create a historical / conceptual timeline for the topic: {topic}\n\n"
    "Return ONLY the JSON object."
)


async def generate_timeline(
    topic: str,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Return ``{title: str, events: [...]}`` for a timeline."""
    settings = settings or get_settings()
    model = build_chat_model(temperature=0.5, settings=settings)
    parser = JsonOutputParser()
    chain = model | parser

    logger.info("timeline.generating", topic=topic)
    result = await chain.ainvoke(
        [_SYSTEM, HumanMessage(content=_PROMPT.format(topic=topic))]
    )

    if not isinstance(result, dict):
        result = json.loads(str(result))

    result.setdefault("title", topic)
    result.setdefault("events", [])

    # Normalise importance to int 1–3
    for event in result["events"]:
        try:
            event["importance"] = max(1, min(3, int(event.get("importance", 2))))
        except (ValueError, TypeError):
            event["importance"] = 2

    logger.info("timeline.generated", events=len(result["events"]))
    return result
