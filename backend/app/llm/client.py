"""LLM client factory.

A single place that turns the env-driven :class:`Settings` into a configured
LangChain chat model. Switching providers (Groq / Gemini / Ollama / OpenAI) is
a config change only — callers never import a provider SDK directly.
"""

from __future__ import annotations

import os
from typing import Any, Dict

from langchain.chat_models import init_chat_model
from langchain_core.language_models.chat_models import BaseChatModel

from app.core.config import Settings, get_settings


def _provider_kwargs(settings: Settings) -> Dict[str, Any]:
    """Provider-specific constructor kwargs (auth, base url, etc.)."""
    provider = settings.llm_provider
    if provider == "groq":
        return {"api_key": settings.groq_api_key}
    if provider == "google_genai":
        return {"google_api_key": settings.google_api_key}
    if provider == "ollama":
        return {"base_url": settings.ollama_base_url}
    if provider == "openai":
        # Reads OPENAI_API_KEY from the environment by default.
        return {}
    return {}


def _configure_tracing(settings: Settings) -> None:
    """Enable LangSmith tracing only when explicitly turned on."""
    if settings.langchain_tracing_v2 and settings.langchain_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key


def build_chat_model(
    *,
    temperature: float | None = None,
    settings: Settings | None = None,
) -> BaseChatModel:
    """Build a chat model for the configured provider.

    ``temperature`` overrides the default when given (the syllabus role-play
    uses different temperatures per agent, mirroring the original design).
    Streaming is requested per-call via ``.astream(...)``, so it is not fixed
    here.
    """
    settings = settings or get_settings()
    _configure_tracing(settings)

    temp = settings.llm_temperature if temperature is None else temperature
    return init_chat_model(
        settings.llm_model,
        model_provider=settings.llm_provider,
        temperature=temp,
        max_retries=settings.llm_max_retries,
        **_provider_kwargs(settings),
    )
