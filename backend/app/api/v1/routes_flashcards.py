"""Flashcard generation endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.agents.flashcard_agent import generate_flashcards
from app.api.v1.schemas import FlashcardCard, FlashcardRequest, FlashcardsResponse
from app.core.config import Settings, get_settings
from fastapi import Depends

router = APIRouter(tags=["flashcards"])


@router.post(
    "/flashcards/generate",
    response_model=FlashcardsResponse,
    summary="Generate flashcards from a topic or document text",
)
async def create_flashcards(
    payload: FlashcardRequest,
    settings: Settings = Depends(get_settings),
) -> FlashcardsResponse:
    if not payload.topic and not payload.text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one of 'topic' or 'text'.",
        )

    try:
        raw_cards = await generate_flashcards(
            topic=payload.topic,
            text=payload.text,
            count=payload.count,
            settings=settings,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Flashcard generation failed: {exc}",
        ) from exc

    cards = [
        FlashcardCard(
            front=str(c.get("front", "")),
            back=str(c.get("back", "")),
            hint=str(c.get("hint", "")),
        )
        for c in raw_cards
        if isinstance(c, dict)
    ]
    return FlashcardsResponse(cards=cards)
