"""Mind map generation agent.

Produces a graph of concept nodes and directed edges suitable for
rendering as a radial mind map.  The root node has depth 0; its
direct children have depth 1, and so on.
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

_SYSTEM = SystemMessage(
    content=(
        "You are an expert educator who creates concept mind maps. "
        "Return ONLY a valid JSON object with two keys:\n"
        '  "nodes": array of {id, label, type, depth} where type is one of '
        '"root", "branch", "leaf" and depth starts at 0 for the root.\n'
        '  "edges": array of {source, target, label} where source/target are node ids.\n'
        "Rules:\n"
        "  - Exactly ONE node with depth 0 (the root topic).\n"
        "  - 4–8 branch nodes at depth 1 covering the main sub-topics.\n"
        "  - 2–4 leaf nodes per branch at depth 2 (key concepts).\n"
        "  - Node ids must be short snake_case strings.\n"
        "  - Edge labels are very short (1–3 words) or empty.\n"
        "Do NOT include markdown fences or any text outside the JSON object."
    )
)

_PROMPT_TOPIC = (
    "Create a mind map for the topic: {topic}\n\n"
    "Return ONLY the JSON object."
)

_PROMPT_TEXT = (
    "Based on the following text, create a mind map of its key concepts:\n\n"
    "{text}\n\n"
    "Return ONLY the JSON object."
)


def _ensure_ids(data: dict[str, Any]) -> dict[str, Any]:
    nodes = data.get("nodes", [])
    for node in nodes:
        if not node.get("id"):
            node["id"] = f"n_{uuid.uuid4().hex[:6]}"
    data["nodes"] = nodes
    data.setdefault("edges", [])
    return data


async def generate_mindmap(
    *,
    topic: str | None = None,
    text: str | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Return ``{nodes: [...], edges: [...]}`` for a mind map."""
    if not topic and not text:
        raise ValueError("Provide at least one of 'topic' or 'text'.")

    settings = settings or get_settings()
    model = build_chat_model(temperature=0.5, settings=settings)
    parser = JsonOutputParser()
    chain = model | parser

    prompt = (
        _PROMPT_TEXT.format(text=text[:5000]) if text
        else _PROMPT_TOPIC.format(topic=topic)
    )

    logger.info("mindmap.generating", topic=topic)
    result = await chain.ainvoke([_SYSTEM, HumanMessage(content=prompt)])

    if not isinstance(result, dict):
        result = json.loads(str(result))

    result = _ensure_ids(result)
    logger.info(
        "mindmap.generated",
        nodes=len(result.get("nodes", [])),
        edges=len(result.get("edges", [])),
    )
    return result
