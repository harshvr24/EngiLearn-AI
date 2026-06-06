"""Code step visualiser agent.

Breaks an algorithm or code snippet into discrete, annotated steps
with pseudocode, a plain-language description, and a snapshot of
key variable values so learners can trace execution.
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
        "You are an expert computer science educator. "
        "Break an algorithm into clearly numbered steps for a learner. "
        "Return ONLY a valid JSON object with two keys:\n"
        '  "title": string — the algorithm name.\n'
        '  "steps": array of objects, each with:\n'
        '    "step_num": integer starting at 1\n'
        '    "pseudocode_line": string — the ONE line of pseudocode for this step '
        "(use proper indentation with spaces, not tabs)\n"
        '    "description": string — plain-English explanation of what this step does\n'
        '    "variables": object — key/value pairs showing important variable '
        "values AT THIS STEP (use example values like n=8, i=3, etc.)\n"
        "Aim for 6–14 steps. Show how variables change across steps.\n"
        "Do NOT include markdown fences or any text outside the JSON object."
    )
)

_PROMPT_ALGO = (
    "Create a step-by-step trace for the algorithm: {algorithm}\n\n"
    "Return ONLY the JSON object."
)

_PROMPT_CODE = (
    "Create a step-by-step trace for the following code:\n\n"
    "{code}\n\n"
    "Return ONLY the JSON object."
)


async def generate_code_steps(
    *,
    algorithm: str | None = None,
    code: str | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Return ``{title: str, steps: [...]}`` for a code step visualiser."""
    if not algorithm and not code:
        raise ValueError("Provide at least one of 'algorithm' or 'code'.")

    settings = settings or get_settings()
    model = build_chat_model(temperature=0.4, settings=settings)
    parser = JsonOutputParser()
    chain = model | parser

    prompt = (
        _PROMPT_CODE.format(code=code[:3000]) if code
        else _PROMPT_ALGO.format(algorithm=algorithm)
    )

    logger.info("codesteps.generating", algorithm=algorithm)
    result = await chain.ainvoke([_SYSTEM, HumanMessage(content=prompt)])

    if not isinstance(result, dict):
        result = json.loads(str(result))

    result.setdefault("title", algorithm or "Algorithm")
    result.setdefault("steps", [])

    # Ensure step_num is int and variables is a dict
    for i, step in enumerate(result["steps"], 1):
        try:
            step["step_num"] = int(step.get("step_num", i))
        except (ValueError, TypeError):
            step["step_num"] = i
        if not isinstance(step.get("variables"), dict):
            step["variables"] = {}

    logger.info("codesteps.generated", steps=len(result["steps"]))
    return result
