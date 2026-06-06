"""Assessment question generation endpoints (standard + adaptive)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.agents.question_agent import generate_questions
from app.api.v1.schemas import (
    AdaptiveQuizRequest,
    Question,
    QuestionRequest,
    QuestionsResponse,
)
from app.core.config import Settings, get_settings

router = APIRouter(tags=["questions"])

_ALLOWED_TYPES = {"mcq", "short", "long"}


def _pick_difficulty(previous_results: list) -> str:
    """Choose next difficulty from rolling accuracy."""
    if not previous_results:
        return "medium"
    recent = previous_results[-5:]  # last 5 questions
    accuracy = sum(1 for r in recent if r.correct) / len(recent)
    if accuracy >= 0.8:
        return "hard"
    if accuracy >= 0.5:
        return "medium"
    return "easy"


@router.post(
    "/questions/generate",
    response_model=QuestionsResponse,
    summary="Generate assessment questions from a topic or document text",
)
async def create_questions(
    payload: QuestionRequest,
    settings: Settings = Depends(get_settings),
) -> QuestionsResponse:
    if not payload.topic and not payload.text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one of 'topic' or 'text'.",
        )

    invalid = set(payload.types) - _ALLOWED_TYPES
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid question types: {invalid}. Allowed: {_ALLOWED_TYPES}",
        )

    try:
        raw_qs = await generate_questions(
            topic=payload.topic,
            text=payload.text,
            types=payload.types,
            count=payload.count,
            settings=settings,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Question generation failed: {exc}",
        ) from exc

    questions = [
        Question(
            id=str(q.get("id", "")),
            type=str(q.get("type", "mcq")),
            bloom_level=str(q.get("bloom_level", "understand")),
            question=str(q.get("question", "")),
            options=q.get("options"),
            answer=str(q.get("answer", "")),
            explanation=str(q.get("explanation", "")),
        )
        for q in raw_qs
        if isinstance(q, dict)
    ]
    return QuestionsResponse(questions=questions)


@router.post(
    "/questions/adaptive",
    response_model=QuestionsResponse,
    summary="Generate questions whose difficulty adapts to prior performance",
)
async def adaptive_questions(
    payload: AdaptiveQuizRequest,
    settings: Settings = Depends(get_settings),
) -> QuestionsResponse:
    invalid = set(payload.types) - _ALLOWED_TYPES
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid question types: {invalid}.",
        )

    difficulty = _pick_difficulty(payload.previous_results)

    try:
        raw_qs = await generate_questions(
            topic=payload.topic,
            types=payload.types,
            count=payload.count,
            difficulty=difficulty,
            settings=settings,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Adaptive question generation failed: {exc}",
        ) from exc

    questions = [
        Question(
            id=str(q.get("id", "")),
            type=str(q.get("type", "mcq")),
            bloom_level=str(q.get("bloom_level", "understand")),
            question=str(q.get("question", "")),
            options=q.get("options"),
            answer=str(q.get("answer", "")),
            explanation=str(q.get("explanation", "")),
        )
        for q in raw_qs
        if isinstance(q, dict)
    ]
    return QuestionsResponse(questions=questions)
