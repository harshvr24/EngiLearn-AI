"""Application configuration.

All settings come from environment variables (or a local ``.env`` file).
Loaded once and cached via :func:`get_settings` — no import-time file reads,
no hand-rolled parsing.
"""

from functools import lru_cache
from typing import Annotated, List, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

LLMProvider = Literal["groq", "google_genai", "ollama", "openai"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ----
    app_env: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"
    cors_origins: Annotated[List[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    # Also accept any localhost / 127.0.0.1 origin (any port) for local dev,
    # so the browser host (localhost vs 127.0.0.1) never causes a CORS block.
    # Tighten or blank this in production.
    cors_origin_regex: str = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

    # ---- LLM ----
    llm_provider: LLMProvider = "groq"
    llm_model: str = "llama-3.3-70b-versatile"
    llm_temperature: float = 0.7
    llm_request_timeout: int = 60
    llm_max_retries: int = 3

    groq_api_key: str = ""
    google_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"

    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""

    # ---- Datastores ----
    database_url: str = (
        "postgresql+asyncpg://engilearn:engilearn@localhost:5432/engilearn"
    )
    redis_url: str = "redis://localhost:6379/0"

    # ---- Agent limits ----
    syllabus_turn_limit: int = 5
    max_input_chars: int = 4000
    max_history_messages: int = 40

    # ---- Rate limiting ----
    rate_limit_enabled: bool = True
    rate_limit_chat: str = "30/minute"
    rate_limit_syllabus: str = "10/minute"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Allow CORS_ORIGINS to be a comma-separated string."""
        if isinstance(value, str):
            return [o.strip() for o in value.split(",") if o.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings."""
    return Settings()
