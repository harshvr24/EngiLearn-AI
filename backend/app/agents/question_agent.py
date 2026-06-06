"""Assessment question generation agent.

Generates MCQ, short-answer, and long-answer questions annotated with
Bloom's Taxonomy levels.  Returns structured JSON ready for the API.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import Settings, get_settings
from app.llm.client import build_chat_model

logger = structlog.get_logger(__name__)

BLOOM_LEVELS = (
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
)

_SYSTEM = SystemMessage(
    content=(
        "You are an expert educator who writes high-quality assessment questions. "
        "You return ONLY a valid JSON object with a single key 'questions' whose "
        "value is an array. Each element must have these fields:\n"
        '  "type": one of "mcq", "short", "long"\n'
        '  "bloom_level": one of "remember","understand","apply","analyze","evaluate","create"\n'
        '  "question": the question text\n'
        '  "options": array of 4 strings (only present when type is "mcq")\n'
        '  "answer": the correct answer (for mcq: the correct option text)\n'
        '  "explanation": why this answer is correct\n'
        "Do not include markdown fences or any text outside the JSON object."
    )
)

_DIFFICULTY_HINTS = {
    "easy": (
        "Use Bloom's levels: remember and understand. "
        "Questions should test basic recall and comprehension."
    ),
    "medium": (
        "Use Bloom's levels: apply and analyze. "
        "Questions should require applying knowledge to new situations."
    ),
    "hard": (
        "Use Bloom's levels: evaluate and create. "
        "Questions should require critical thinking, synthesis, and judgment."
    ),
}

_PROMPT_TOPIC = (
    "Generate {count} assessment question(s) about the topic: {topic}\n"
    "Question types to include: {types}\n"
    "{difficulty_hint}"
    "Spread across different Bloom's Taxonomy levels.\n\n"
    "Return ONLY the JSON object."
)

_PROMPT_TEXT = (
    "Based on the following text, generate {count} assessment question(s) "
    "that test understanding of key concepts.\n"
    "Question types to include: {types}\n"
    "{difficulty_hint}"
    "Spread across different Bloom's Taxonomy levels.\n\n"
    "Text:\n{text}\n\n"
    "Return ONLY the JSON object."
)


def _tag_ids(questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ensure every question has a stable id."""
    for q in questions:
        if not q.get("id"):
            q["id"] = str(uuid.uuid4())
    return questions


async def generate_questions(
    *,
    topic: str | None = None,
    text: str | None = None,
    types: list[str] | None = None,
    count: int = 10,
    difficulty: str | None = None,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    """Return a list of question dicts (see schema for shape).

    ``difficulty`` is one of ``"easy"``, ``"medium"``, ``"hard"`` (or ``None``
    for auto / spread-across-levels behaviour).
    """
    if not topic and not text:
        raise ValueError("Provide at least one of 'topic' or 'text'.")

    types = types or ["mcq"]
    types_str = ", ".join(types)
    difficulty_hint = (
        _DIFFICULTY_HINTS.get(difficulty, "") + "\n" if difficulty else ""
    )
    settings = settings or get_settings()
    model = build_chat_model(temperature=0.6, settings=settings)
    parser = JsonOutputParser()
    chain = model | parser

    if text:
        excerpt = text[:6000]
        prompt = _PROMPT_TEXT.format(
            count=count,
            types=types_str,
            difficulty_hint=difficulty_hint,
            text=excerpt,
        )
    else:
        prompt = _PROMPT_TOPIC.format(
            count=count,
            types=types_str,
            difficulty_hint=difficulty_hint,
            topic=topic,
        )

    logger.info("questions.generating", count=count, types=types, difficulty=difficulty)

    result = await chain.ainvoke([_SYSTEM, HumanMessage(content=prompt)])

    if isinstance(result, dict) and "questions" in result:
        questions = result["questions"]
    elif isinstance(result, list):
        questions = result
    else:
        questions = json.loads(str(result))
        if isinstance(questions, dict):
            questions = questions.get("questions", [])

    questions = _tag_ids(questions)
    logger.info("questions.generated", count=len(questions))
    return questions
