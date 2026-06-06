"""CAMEL-style conversational agent.

Migrated from the prototype's ``DiscussAgent`` (``generating_syllabus.py``):
a thin wrapper around a chat model that keeps its own message history and
takes one async step at a time.
"""

from __future__ import annotations

from typing import List

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, SystemMessage


class DiscussAgent:
    def __init__(
        self, system_message: SystemMessage, model: BaseChatModel
    ) -> None:
        self.system_message = system_message
        self.model = model
        self.stored_messages: List[BaseMessage] = []
        self.reset()

    def reset(self) -> List[BaseMessage]:
        self.stored_messages = [self.system_message]
        return self.stored_messages

    def update_messages(self, message: BaseMessage) -> List[BaseMessage]:
        self.stored_messages.append(message)
        return self.stored_messages

    async def astep(self, input_message: BaseMessage) -> BaseMessage:
        messages = self.update_messages(input_message)
        output_message = await self.model.ainvoke(messages)
        self.update_messages(output_message)
        return output_message
