"""Instructor agent.

Migrated from the prototype's ``TeachingGPT`` / ``InstructorConversationChain``
(``teaching_agent.py``). Key changes for production:

* No module-level singleton — every call is driven by explicit, per-session
  state, so concurrent learners never share history.
* The persona is parameterised by ``topic`` (the prototype hardcoded
  "Machine Learning").
* Real token streaming via ``.astream`` instead of faked ``time.sleep`` output.
"""

from __future__ import annotations

from typing import AsyncIterator, Sequence, Tuple

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)

from app.core.config import Settings, get_settings
from app.llm import prompts
from app.llm.client import build_chat_model

END_OF_TURN = "<END_OF_TURN>"

# A conversation turn is a (role, content) pair where role is "human" or
# "instructor".
Turn = Tuple[str, str]


def _build_messages(
    topic: str, syllabus: str, history: Sequence[Turn]
) -> list[BaseMessage]:
    system = SystemMessage(
        content=prompts.INSTRUCTOR_SYSTEM_PROMPT.format(
            topic=topic, syllabus=syllabus
        )
    )
    messages: list[BaseMessage] = [system]
    for role, content in history:
        if role == "human":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    return messages


async def stream_lesson(
    topic: str,
    syllabus: str,
    history: Sequence[Turn],
    settings: Settings | None = None,
) -> AsyncIterator[str]:
    """Stream the instructor's next turn token-by-token.

    ``history`` should already include the learner's latest message as the
    final ``("human", ...)`` turn.
    """
    settings = settings or get_settings()
    model = build_chat_model(settings=settings)
    messages = _build_messages(topic, syllabus, history)

    async for chunk in model.astream(messages):
        text = chunk.content
        if isinstance(text, str) and text:
            yield text
