# EngiLearn AI — Backend

Production-grade FastAPI backend for EngiLearn AI. Orchestrates a set of LangChain multi-agent pipelines — from collaborative syllabus generation to live streaming lessons, document-based flashcards, adaptive quizzes, interview prep, and visual learning tools.

## Architecture

```
Client ──HTTP/SSE──> FastAPI (app/api/v1)
                         │
      ┌──────────────────┼──────────────────────┐
      │                  │                       │
 services/           agents/ (LangChain)     db/ + cache/
  syllabus_service     syllabus.py            Postgres (durable)
  teaching_service     teaching.py            Redis (hot cache,
  document_service     flashcard_agent.py       rate limiting)
  resume_service       question_agent.py
                        interview_agent.py
                        mindmap_agent.py
                        timeline_agent.py
                        codestep_agent.py
                        llm/client.py ── Groq | Gemini | Ollama | OpenAI
```

**LLM provider is config-only.** `LLM_PROVIDER` selects the provider; no code changes needed. Sessions are anonymous UUIDs; every user-owned table has a nullable `user_id` and a `get_current_user` stub ready for JWT.

## Quick Start (Docker — recommended)

```bash
cd backend
cp .env.example .env          # set GROQ_API_KEY (free at console.groq.com)
docker compose up --build
```

Open **http://localhost:8000/docs** for the interactive OpenAPI UI. Migrations run automatically on startup.

### Fully offline / zero-key option

Set `LLM_PROVIDER=ollama` and `LLM_MODEL=llama3.1` in `.env`, run `ollama serve` on the host, and no API key is needed.

## Local Development

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -e ".[dev]"
cp .env.example .env

docker compose up -d postgres redis
alembic upgrade head
uvicorn app.main:app --reload
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness (checks Postgres + Redis) |
| POST | `/api/v1/syllabus` | `{ "topic" }` → session + syllabus |
| POST | `/api/v1/chat` | `{ "session_id", "message" }` → **SSE** lesson stream |
| GET | `/api/v1/chat/{session_id}/history` | Conversation history |
| POST | `/api/v1/documents/upload` | Multipart PDF/DOCX/PPTX upload |
| POST | `/api/v1/flashcards/generate` | Generate flashcard deck from text |
| POST | `/api/v1/questions/generate` | Generate adaptive quiz questions |
| POST | `/api/v1/interview/parse-resume` | Extract candidate profile from résumé |
| POST | `/api/v1/interview/question` | Generate interview question (4 modes) |
| POST | `/api/v1/interview/feedback` | **SSE** answer feedback stream |
| POST | `/api/v1/visual/mindmap` | Radial mind-map JSON |
| POST | `/api/v1/visual/timeline` | Chronological timeline JSON |
| POST | `/api/v1/visual/code-steps` | Step-by-step algorithm trace JSON |

### SSE stream format

`/chat` and `/interview/feedback` return `text/event-stream`:

```
event: token
data: "next chunk of text"

event: done
data: "[DONE]"

event: error
data: "error message"
```

### Example

```bash
# 1) generate a syllabus
curl -s localhost:8000/api/v1/syllabus \
  -H 'content-type: application/json' \
  -d '{"topic":"Reinforcement Learning"}'

# 2) stream a lesson (use session_id from step 1)
curl -N localhost:8000/api/v1/chat \
  -H 'content-type: application/json' \
  -d '{"session_id":"<SESSION_ID>","message":""}'
```

## Configuration

All settings from environment variables (see `.env.example`):

| Variable | Default | Notes |
|----------|---------|-------|
| `LLM_PROVIDER` | `groq` | `groq` · `google_genai` · `ollama` · `openai` |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Provider-specific model ID |
| `GROQ_API_KEY` | — | Required for `groq` |
| `GOOGLE_API_KEY` | — | Required for `google_genai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Required for `ollama` |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async driver required |
| `REDIS_URL` | `redis://localhost:6379/0` | |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated |
| `RATE_LIMIT_CHAT` | `30/minute` | Per client IP |
| `RATE_LIMIT_SYLLABUS` | `10/minute` | Per client IP |

## Tests

```bash
cd backend
pytest            # offline: sqlite + fakeredis + fake LLM (no network, no key)
mypy app
black --check . && isort --check-only . && flake8 app tests
```

## Migrations

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
