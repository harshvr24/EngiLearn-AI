"""Interview agent.

Two capabilities:
  1. ``generate_question`` — given a resume profile, interview mode, and the
     conversation history so far, produce ONE targeted question.
  2. ``stream_feedback`` — given the question and the candidate's answer,
     stream a structured evaluation (score, strengths, improvements).

The agent is stateless: the caller supplies the full history each time.
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Sequence

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import Settings, get_settings
from app.llm.client import build_chat_model

logger = structlog.get_logger(__name__)

# ── Mode configurations ───────────────────────────────────────────────────────

_MODE_DESCRIPTIONS = {
    "project_deep_dive": (
        "Focus on the candidate's listed projects and work experience. "
        "Probe design decisions, technical challenges, what they would do differently, "
        "and the impact of their work. Reference specific details from their resume."
    ),
    "dsa": (
        "Ask Data Structures & Algorithms questions relevant to software engineering roles. "
        "Cover arrays, linked lists, trees, graphs, sorting, searching, dynamic programming, "
        "and time/space complexity analysis. Start at medium difficulty and adjust."
    ),
    "system_design": (
        "Ask system design questions: design scalable distributed systems, APIs, databases, "
        "caching strategies, load balancing. Evaluate the candidate's ability to think through "
        "trade-offs, scalability, and reliability."
    ),
    "hr_behavioral": (
        "Ask behavioral/situational questions using the STAR method. Cover teamwork, leadership, "
        "handling failure, conflict resolution, motivation, and career goals. "
        "Reference the candidate's background where relevant."
    ),
}

# ── Prompts ───────────────────────────────────────────────────────────────────

_QUESTION_SYSTEM = SystemMessage(
    content=(
        "You are an expert technical interviewer at a top-tier tech company. "
        "Your job is to generate exactly ONE interview question. "
        "Output ONLY the question text — no preamble, no numbering, no explanation."
    )
)

_FEEDBACK_SYSTEM = SystemMessage(
    content=(
        "You are an expert technical interviewer giving constructive feedback. "
        "Evaluate the candidate's answer and respond with this exact format:\n\n"
        "**Score: X/10**\n\n"
        "**Strengths:**\n"
        "- [strength 1]\n"
        "- [strength 2]\n\n"
        "**Areas to Improve:**\n"
        "- [improvement 1]\n"
        "- [improvement 2]\n\n"
        "**Insight:** [1–2 sentences of expert commentary or what a great answer would include]\n\n"
        "Be specific, honest, and constructive. Reference details from the answer."
    )
)


def _profile_summary(profile: dict[str, Any]) -> str:
    skills = ", ".join(profile.get("skills", [])[:15]) or "not specified"
    projects = profile.get("projects", [])
    proj_lines = "\n".join(
        f"  - {p.get('name', '')}: {p.get('description', '')} "
        f"[{', '.join(p.get('tech', [])[:5])}]"
        for p in projects[:5]
    )
    exp = "\n".join(f"  - {e}" for e in profile.get("experience", [])[:4])
    edu = "\n".join(f"  - {e}" for e in profile.get("education", [])[:3])
    return (
        f"Candidate: {profile.get('name', 'Unknown')}\n"
        f"Skills: {skills}\n"
        f"Projects:\n{proj_lines or '  none listed'}\n"
        f"Experience:\n{exp or '  none listed'}\n"
        f"Education:\n{edu or '  none listed'}"
    )


def _history_text(history: Sequence[dict[str, str]]) -> str:
    if not history:
        return "(no previous questions)"
    lines = []
    for i, qa in enumerate(history, 1):
        lines.append(f"Q{i}: {qa.get('question', '')}")
        lines.append(f"A{i}: {qa.get('answer', '')[:300]}")
    return "\n".join(lines)


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_question(
    profile: dict[str, Any],
    mode: str,
    history: Sequence[dict[str, str]],
    settings: Settings | None = None,
) -> str:
    """Return a single interview question string."""
    settings = settings or get_settings()
    mode_desc = _MODE_DESCRIPTIONS.get(mode, _MODE_DESCRIPTIONS["project_deep_dive"])

    prompt = (
        f"Interview mode: {mode_desc}\n\n"
        f"Candidate profile:\n{_profile_summary(profile)}\n\n"
        f"Previous Q&A:\n{_history_text(list(history))}\n\n"
        "Generate the next interview question. "
        "Do NOT repeat a question that has already been asked. "
        "Output ONLY the question."
    )

    model = build_chat_model(temperature=0.8, settings=settings)
    result = await model.ainvoke([_QUESTION_SYSTEM, HumanMessage(content=prompt)])
    question = str(result.content).strip().strip('"')
    logger.info("interview.question_generated", mode=mode)
    return question


async def stream_feedback(
    profile: dict[str, Any],
    mode: str,
    question: str,
    answer: str,
    settings: Settings | None = None,
) -> AsyncIterator[str]:
    """Stream structured feedback token by token."""
    settings = settings or get_settings()
    mode_desc = _MODE_DESCRIPTIONS.get(mode, _MODE_DESCRIPTIONS["project_deep_dive"])

    prompt = (
        f"Interview mode: {mode_desc}\n\n"
        f"Candidate profile summary:\n{_profile_summary(profile)}\n\n"
        f"Question asked: {question}\n\n"
        f"Candidate's answer: {answer}\n\n"
        "Evaluate the answer using the format specified."
    )

    model = build_chat_model(temperature=0.5, settings=settings)

    async def _gen() -> AsyncIterator[str]:
        async for chunk in model.astream(
            [_FEEDBACK_SYSTEM, HumanMessage(content=prompt)]
        ):
            text = chunk.content
            if isinstance(text, str) and text:
                yield text

    return _gen()
