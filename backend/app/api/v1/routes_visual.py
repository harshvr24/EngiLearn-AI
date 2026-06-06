"""Visual learning tools endpoints.

POST /api/v1/visual/mindmap      → MindmapResponse
POST /api/v1/visual/timeline     → TimelineResponse
POST /api/v1/visual/code-steps   → CodeStepsResponse
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException

from app.agents.codestep_agent import generate_code_steps
from app.agents.mindmap_agent import generate_mindmap
from app.agents.timeline_agent import generate_timeline
from app.api.v1.schemas import (
    CodeStepsRequest,
    CodeStepsResponse,
    MindmapResponse,
    TimelineRequest,
    TimelineResponse,
    VisualRequest,
)
from app.core.config import get_settings

router = APIRouter(prefix="/visual", tags=["visual"])
logger = structlog.get_logger(__name__)


@router.post("/mindmap", response_model=MindmapResponse)
async def mindmap(req: VisualRequest) -> MindmapResponse:
    if not req.topic and not req.text:
        raise HTTPException(
            status_code=422, detail="Provide at least one of 'topic' or 'text'."
        )
    settings = get_settings()
    data = await generate_mindmap(topic=req.topic, text=req.text, settings=settings)
    return MindmapResponse(**data)


@router.post("/timeline", response_model=TimelineResponse)
async def timeline(req: TimelineRequest) -> TimelineResponse:
    settings = get_settings()
    data = await generate_timeline(req.topic, settings=settings)
    return TimelineResponse(**data)


@router.post("/code-steps", response_model=CodeStepsResponse)
async def code_steps(req: CodeStepsRequest) -> CodeStepsResponse:
    if not req.algorithm and not req.code:
        raise HTTPException(
            status_code=422, detail="Provide at least one of 'algorithm' or 'code'."
        )
    settings = get_settings()
    data = await generate_code_steps(
        algorithm=req.algorithm, code=req.code, settings=settings
    )
    return CodeStepsResponse(**data)
