"""Pydantic request/response schemas for the v1 API."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SyllabusRequest(BaseModel):
    topic: str = Field(
        ..., min_length=1, max_length=4000, examples=["Reinforcement Learning"]
    )
    source_text: Optional[str] = Field(
        default=None,
        max_length=50000,
        description="Optional: pre-extracted document text to use instead of LLM research.",
    )


class SyllabusResponse(BaseModel):
    session_id: uuid.UUID
    topic: str
    syllabus: str


class ChatRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(default="", max_length=4000)


class MessageOut(BaseModel):
    role: str
    content: str
    position: int
    created_at: datetime


class HistoryResponse(BaseModel):
    session_id: uuid.UUID
    topic: str
    messages: List[MessageOut]


class HealthResponse(BaseModel):
    status: str = "ok"


class ReadyResponse(BaseModel):
    status: str
    database: bool
    redis: bool


# ── Document Intelligence ─────────────────────────────────────────────────────

class DocumentExtractResponse(BaseModel):
    text: str
    title: str
    page_count: int


# ── Flashcards ────────────────────────────────────────────────────────────────

class FlashcardRequest(BaseModel):
    topic: Optional[str] = Field(default=None, max_length=1000)
    text: Optional[str] = Field(default=None, max_length=50000)
    count: int = Field(default=10, ge=1, le=50)


class FlashcardCard(BaseModel):
    front: str
    back: str
    hint: str


class FlashcardsResponse(BaseModel):
    cards: List[FlashcardCard]


# ── Questions / Assessment ────────────────────────────────────────────────────

class QuestionRequest(BaseModel):
    topic: Optional[str] = Field(default=None, max_length=1000)
    text: Optional[str] = Field(default=None, max_length=50000)
    types: List[str] = Field(default=["mcq"])
    count: int = Field(default=10, ge=1, le=50)


class Question(BaseModel):
    id: str
    type: str
    bloom_level: str
    question: str
    options: Optional[List[str]] = None
    answer: str
    explanation: str


class QuestionsResponse(BaseModel):
    questions: List[Question]


# ── Interview Preparation ─────────────────────────────────────────────────────

class ResumeProject(BaseModel):
    name: str
    tech: List[str] = []
    description: str = ""


class ResumeProfile(BaseModel):
    name: str = ""
    skills: List[str] = []
    projects: List[ResumeProject] = []
    experience: List[str] = []
    education: List[str] = []


class InterviewQA(BaseModel):
    question: str
    answer: str


class InterviewQuestionRequest(BaseModel):
    profile: ResumeProfile
    mode: str = "project_deep_dive"
    history: List[InterviewQA] = []


class InterviewQuestionResponse(BaseModel):
    question: str


class InterviewFeedbackRequest(BaseModel):
    profile: ResumeProfile
    mode: str = "project_deep_dive"
    question: str
    answer: str


# ── Adaptive Quiz ─────────────────────────────────────────────────────────────

class PriorResult(BaseModel):
    question_id: str
    correct: bool
    difficulty: str = "medium"


class AdaptiveQuizRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=1000)
    previous_results: List[PriorResult] = []
    count: int = Field(default=3, ge=1, le=10)
    types: List[str] = ["mcq"]


# ── Visual Learning Tools ─────────────────────────────────────────────────────

class VisualRequest(BaseModel):
    topic: Optional[str] = Field(default=None, max_length=1000)
    text: Optional[str] = Field(default=None, max_length=50000)


class MindmapNode(BaseModel):
    id: str
    label: str
    type: str  # "root" | "branch" | "leaf"
    depth: int


class MindmapEdge(BaseModel):
    source: str
    target: str
    label: str = ""


class MindmapResponse(BaseModel):
    nodes: List[MindmapNode]
    edges: List[MindmapEdge]


class TimelineEvent(BaseModel):
    year: str
    title: str
    description: str
    importance: int  # 1 | 2 | 3


class TimelineRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=1000)


class TimelineResponse(BaseModel):
    title: str
    events: List[TimelineEvent]


class CodeStepsRequest(BaseModel):
    algorithm: Optional[str] = Field(default=None, max_length=1000)
    code: Optional[str] = Field(default=None, max_length=10000)


class CodeStep(BaseModel):
    step_num: int
    pseudocode_line: str
    description: str
    variables: Dict[str, Any] = {}


class CodeStepsResponse(BaseModel):
    title: str
    steps: List[CodeStep]
