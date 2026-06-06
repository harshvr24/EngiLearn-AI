"""Interview preparation endpoints.

Three routes:
  POST /api/v1/interview/parse-resume  — upload a resume, get a structured profile
  POST /api/v1/interview/question      — generate the next interview question (stateless)
  POST /api/v1/interview/feedback      — stream evaluative feedback for an answer (SSE)
"""

from __future__ import annotations

from typing import Any, AsyncIterator, Dict, List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sse_starlette.sse import EventSourceResponse

from app.agents.interview_agent import generate_question, stream_feedback
from app.api.v1.schemas import (
    InterviewFeedbackRequest,
    InterviewQuestionRequest,
    InterviewQuestionResponse,
    ResumeProfile,
    ResumeProject,
)
from app.core.config import Settings, get_settings
from app.services.resume_service import parse_resume

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["interview"])

MAX_RESUME_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MODES = {
    "project_deep_dive",
    "dsa",
    "system_design",
    "hr_behavioral",
}


def _dict_to_profile(raw: dict[str, Any]) -> ResumeProfile:
    projects = [
        ResumeProject(
            name=str(p.get("name", "")),
            tech=[str(t) for t in p.get("tech", [])],
            description=str(p.get("description", "")),
        )
        for p in raw.get("projects", [])
        if isinstance(p, dict)
    ]
    return ResumeProfile(
        name=str(raw.get("name", "")),
        skills=[str(s) for s in raw.get("skills", [])],
        projects=projects,
        experience=[str(e) for e in raw.get("experience", [])],
        education=[str(e) for e in raw.get("education", [])],
    )


@router.post(
    "/interview/parse-resume",
    response_model=ResumeProfile,
    summary="Upload a resume (PDF/DOCX) and extract a structured profile",
)
async def parse_resume_endpoint(
    file: UploadFile,
    settings: Settings = Depends(get_settings),
) -> ResumeProfile:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No filename."
        )
    content = await file.read()
    if len(content) > MAX_RESUME_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Resume file exceeds 5 MB limit.",
        )
    try:
        raw = await parse_resume(content, file.filename, settings)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resume parsing failed: {exc}",
        ) from exc
    return _dict_to_profile(raw)


@router.post(
    "/interview/question",
    response_model=InterviewQuestionResponse,
    summary="Generate the next interview question",
)
async def next_question(
    payload: InterviewQuestionRequest,
    settings: Settings = Depends(get_settings),
) -> InterviewQuestionResponse:
    if payload.mode not in ALLOWED_MODES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid mode. Allowed: {sorted(ALLOWED_MODES)}",
        )
    history = [{"question": qa.question, "answer": qa.answer} for qa in payload.history]
    try:
        question = await generate_question(
            profile=payload.profile.model_dump(),
            mode=payload.mode,
            history=history,
            settings=settings,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Question generation failed: {exc}",
        ) from exc
    return InterviewQuestionResponse(question=question)


@router.post(
    "/interview/feedback",
    summary="Stream evaluative feedback for a candidate's answer (SSE)",
)
async def feedback_stream(
    payload: InterviewFeedbackRequest,
    settings: Settings = Depends(get_settings),
) -> EventSourceResponse:
    if payload.mode not in ALLOWED_MODES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid mode. Allowed: {sorted(ALLOWED_MODES)}",
        )

    async def event_gen() -> AsyncIterator[Dict[str, str]]:
        try:
            gen = await stream_feedback(
                profile=payload.profile.model_dump(),
                mode=payload.mode,
                question=payload.question,
                answer=payload.answer,
                settings=settings,
            )
            async for token in gen:
                yield {"event": "token", "data": token}
        except Exception:
            logger.exception("interview.feedback_failed")
            yield {"event": "error", "data": "stream_error"}
            return
        yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_gen())
