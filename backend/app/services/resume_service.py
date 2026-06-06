"""Resume parsing service.

Extracts plain text from a resume file (PDF/DOCX) and then uses an LLM
to distil the raw text into a structured ``ResumeProfile``.
"""

from __future__ import annotations

from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import Settings, get_settings
from app.llm.client import build_chat_model
from app.services.document_service import parse_upload

logger = structlog.get_logger(__name__)

_SYSTEM = SystemMessage(
    content=(
        "You are an expert resume parser. Extract structured information from the "
        "resume text below and return ONLY a valid JSON object with these keys:\n"
        '  "name": string — candidate full name (or "" if not found)\n'
        '  "skills": string[] — list of technical skills/languages/tools\n'
        '  "projects": array of {name: string, tech: string[], description: string}\n'
        '  "experience": string[] — list of job titles / company summaries (1 line each)\n'
        '  "education": string[] — list of degrees / institutions (1 line each)\n'
        "Do NOT include any text outside the JSON object."
    )
)


async def parse_resume(
    content: bytes,
    filename: str,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Parse a resume file and return a structured profile dict."""
    settings = settings or get_settings()

    extract = await parse_upload(filename=filename, content=content)
    logger.info("resume.extracted", chars=len(extract.text))

    model = build_chat_model(temperature=0.1, settings=settings)
    parser = JsonOutputParser()
    chain = model | parser

    prompt = (
        f"Parse this resume and return the JSON profile:\n\n{extract.text[:8000]}"
    )
    profile: dict[str, Any] = await chain.ainvoke(
        [_SYSTEM, HumanMessage(content=prompt)]
    )

    # Ensure required keys exist
    profile.setdefault("name", "")
    profile.setdefault("skills", [])
    profile.setdefault("projects", [])
    profile.setdefault("experience", [])
    profile.setdefault("education", [])

    logger.info(
        "resume.parsed",
        name=profile.get("name"),
        skills=len(profile.get("skills", [])),
        projects=len(profile.get("projects", [])),
    )
    return profile
