"""Syllabus generation via CAMEL-style role-play.

Migrated from the prototype ``generate_syllabus`` (``generating_syllabus``):
a task-specifier sharpens the goal, an Instructor/Teaching-Assistant pair
role-plays for a few turns, then a summarizer condenses the transcript into a
structured syllabus. Now fully async and parameterised by ``Settings``.
"""

from __future__ import annotations

from typing import List, Tuple

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.discuss_agent import DiscussAgent
from app.core.config import Settings, get_settings
from app.llm import prompts
from app.llm.client import build_chat_model

logger = structlog.get_logger(__name__)


def _system_messages(task: str) -> Tuple[SystemMessage, SystemMessage]:
    """Build the assistant and user role-play system messages."""
    assistant = SystemMessage(
        content=prompts.ASSISTANT_INCEPTION_PROMPT.format(
            assistant_role_name=prompts.ASSISTANT_ROLE_NAME,
            user_role_name=prompts.USER_ROLE_NAME,
            task=task,
        )
    )
    user = SystemMessage(
        content=prompts.USER_INCEPTION_PROMPT.format(
            assistant_role_name=prompts.ASSISTANT_ROLE_NAME,
            user_role_name=prompts.USER_ROLE_NAME,
            task=task,
        )
    )
    return assistant, user


async def _specify_task(topic: str, task: str, settings: Settings) -> str:
    """Use the task-specifier agent to make the goal more concrete."""
    specifier = DiscussAgent(
        SystemMessage(content="You can make a task more specific."),
        build_chat_model(temperature=1.0, settings=settings),
    )
    prompt = prompts.TASK_SPECIFIER_PROMPT.format(
        assistant_role_name=prompts.ASSISTANT_ROLE_NAME,
        user_role_name=prompts.USER_ROLE_NAME,
        task=task,
        word_limit=prompts.TASK_WORD_LIMIT,
    )
    result = await specifier.astep(HumanMessage(content=prompt))
    return str(result.content)


async def generate_syllabus(
    topic: str, settings: Settings | None = None
) -> str:
    """Generate a course syllabus for ``topic``.

    Returns the syllabus as a markdown-ish string.
    """
    settings = settings or get_settings()
    task = f"Generate a course syllabus to teach the topic: {topic}"

    specified_task = await _specify_task(topic, task, settings)
    logger.info("syllabus.task_specified", topic=topic, task=specified_task)

    assistant_sys, user_sys = _system_messages(specified_task)
    assistant_agent = DiscussAgent(
        assistant_sys, build_chat_model(temperature=0.2, settings=settings)
    )
    user_agent = DiscussAgent(
        user_sys, build_chat_model(temperature=0.2, settings=settings)
    )

    # Prime the assistant so the user agent starts instructing.
    assistant_msg = HumanMessage(
        content=(
            f"{user_sys.content}. Now start to give me introductions one by "
            "one. Only reply with Instruction and Input."
        )
    )
    await assistant_agent.astep(HumanMessage(content=assistant_sys.content))

    conversation_history: List[str] = []
    for _ in range(settings.syllabus_turn_limit):
        user_ai_msg = await user_agent.astep(assistant_msg)
        user_msg = HumanMessage(content=user_ai_msg.content)
        conversation_history.append(f"AI User: {user_msg.content}")

        assistant_ai_msg = await assistant_agent.astep(user_msg)
        assistant_msg = HumanMessage(content=assistant_ai_msg.content)
        conversation_history.append(f"AI Assistant: {assistant_msg.content}")

        if "<TASK_DONE>" in str(user_msg.content):
            break

    return await _summarize(topic, conversation_history, settings)


async def _summarize(
    topic: str, conversation_history: List[str], settings: Settings
) -> str:
    """Condense the role-play transcript into a syllabus."""
    summarizer = DiscussAgent(
        SystemMessage(
            content="Summarize the conversation into a course syllabus."
        ),
        build_chat_model(temperature=0.7, settings=settings),
    )
    prompt = prompts.SUMMARIZER_PROMPT.format(
        assistant_role_name=prompts.ASSISTANT_ROLE_NAME,
        user_role_name=prompts.USER_ROLE_NAME,
        conversation_history="\n".join(conversation_history),
        topic=topic,
    )
    result = await summarizer.astep(HumanMessage(content=prompt))
    return str(result.content)
