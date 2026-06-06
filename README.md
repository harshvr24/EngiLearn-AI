# EngiLearn AI

An adaptive AI instructor that turns any topic into a structured course and teaches it to you — with live streaming lessons, quizzes, flashcards, interview prep, a visual toolbox, and a learner dashboard. Built on a multi-agent LangChain backend and a Next.js 15 frontend.

---

## Features

### Home — Interactive Course
- Enter any topic; two CAMEL-style agents collaborate to generate a personalised syllabus
- Instructor agent streams lessons token-by-token via SSE
- Ask follow-up questions mid-lesson; session history is preserved

### Tools — Study Aids
| Tab | What it does |
|-----|-------------|
| **Upload** | Parse PDF / DOCX / PPTX and use it as course content |
| **Flashcards** | AI-generated decks with SM-2 spaced-repetition scheduling |
| **Quiz** | Adaptive multiple-choice questions with per-question difficulty |
| **Visual** | Mind map, chronological timeline, and step-by-step code tracer generated from any topic |

### Interview — Prep Mode
- Upload your résumé (PDF/DOCX); the system builds a structured candidate profile
- Four question modes: **Project deep-dive · DSA · System design · HR behavioral**
- Per-answer feedback streamed live

### Dashboard — Progress Tracker
- KPI cards (lessons, sessions, quiz accuracy, streak)
- 20-week activity heatmap and per-topic mastery grid
- Adaptive quiz endpoint adjusts difficulty based on past scores

---

## Tech Stack

**Frontend**
- Next.js 15 (App Router) · TypeScript · Tailwind CSS
- Framer Motion — animated 3-D scroll book on the landing page, card flips
- shadcn/ui component library

**Backend**
- FastAPI · async SQLAlchemy · Alembic · Postgres · Redis
- LangChain (`langchain-core` + provider packages) multi-agent orchestration
- Server-Sent Events (SSE) for real-time token streaming
- Structured logging (structlog), per-IP rate limiting, Docker Compose

**LLM Providers** (config-only switch, no code change needed)
- **Groq** — Llama 3.3 70B (default, free tier)
- **Google Gemini** — free tier
- **Ollama** — fully offline, no API key
- **OpenAI** — drop-in

---

## Project Structure

```
EngiLearn-AI/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangChain agents
│   │   │   ├── syllabus.py          CAMEL role-play → course outline
│   │   │   ├── teaching.py          streaming instructor
│   │   │   ├── flashcard_agent.py
│   │   │   ├── question_agent.py    adaptive quiz generation
│   │   │   ├── interview_agent.py   4-mode interview questions + feedback
│   │   │   ├── mindmap_agent.py
│   │   │   ├── timeline_agent.py
│   │   │   └── codestep_agent.py
│   │   ├── api/v1/          # FastAPI routers
│   │   │   ├── routes_syllabus.py
│   │   │   ├── routes_chat.py
│   │   │   ├── routes_documents.py
│   │   │   ├── routes_flashcards.py
│   │   │   ├── routes_questions.py
│   │   │   ├── routes_interview.py
│   │   │   └── routes_visual.py
│   │   ├── services/        # Business logic + parsers
│   │   ├── db/              # SQLAlchemy models + repositories
│   │   ├── cache/           # Redis client
│   │   ├── core/            # Config, rate limiting, logging
│   │   └── llm/             # LLM client + prompt templates
│   ├── tests/
│   ├── alembic/
│   ├── docker-compose.yml
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx             Home / course page
    │   ├── tools/page.tsx       Upload · Flashcards · Quiz · Visual
    │   ├── interview/page.tsx   4-step interview wizard
    │   └── dashboard/page.tsx   Progress & analytics
    └── components/
        ├── ScrollBook.tsx       Animated landing-page book
        ├── flashcards/
        ├── quiz/
        ├── dashboard/
        └── visual/              MindMap · Timeline · CodeStepper
```

---

## Quick Start

### 1 — Backend (Docker, recommended)

```bash
cd backend
cp .env.example .env        # add GROQ_API_KEY (free at console.groq.com)
docker compose up --build
```

The API is available at **http://localhost:8000** — open **http://localhost:8000/docs** for the interactive OpenAPI UI. Alembic migrations run automatically on startup.

**Zero-key / offline option:** set `LLM_PROVIDER=ollama` and `LLM_MODEL=llama3.1` in `.env`, run `ollama serve` on the host, and no API key is required.

### 2 — Backend (local dev)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -e ".[dev]"
cp .env.example .env

docker compose up -d postgres redis   # datastores only
alembic upgrade head
uvicorn app.main:app --reload
```

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

> The frontend makes API calls to `http://localhost:8000` by default.  
> Override with `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if needed.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness (checks Postgres + Redis) |
| POST | `/api/v1/syllabus` | `{ "topic" }` → session + syllabus |
| POST | `/api/v1/chat` | `{ "session_id", "message" }` → **SSE** lesson stream |
| GET | `/api/v1/chat/{session_id}/history` | Conversation history |
| POST | `/api/v1/documents/upload` | Multipart file upload (PDF/DOCX/PPTX) |
| POST | `/api/v1/flashcards/generate` | Generate flashcard deck from text |
| POST | `/api/v1/questions/generate` | Generate adaptive quiz questions |
| POST | `/api/v1/interview/parse-resume` | Extract candidate profile from résumé |
| POST | `/api/v1/interview/question` | Generate interview question |
| POST | `/api/v1/interview/feedback` | **SSE** feedback stream for an answer |
| POST | `/api/v1/visual/mindmap` | Radial mind-map JSON |
| POST | `/api/v1/visual/timeline` | Chronological event timeline JSON |
| POST | `/api/v1/visual/code-steps` | Step-by-step algorithm trace JSON |

---

## Configuration

All settings are environment variables (see `backend/.env.example`):

| Variable | Default | Notes |
|----------|---------|-------|
| `LLM_PROVIDER` | `groq` | `groq` · `google_genai` · `ollama` · `openai` |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Provider-specific model ID |
| `GROQ_API_KEY` | — | Required when `LLM_PROVIDER=groq` |
| `GOOGLE_API_KEY` | — | Required when `LLM_PROVIDER=google_genai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Required when `LLM_PROVIDER=ollama` |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async driver required |
| `REDIS_URL` | `redis://localhost:6379/0` | |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated list |
| `RATE_LIMIT_CHAT` | `30/minute` | Per client IP |
| `RATE_LIMIT_SYLLABUS` | `10/minute` | Per client IP |

---

## Running Tests

```bash
cd backend
pytest                              # offline: SQLite + fakeredis + fake LLM
mypy app
black --check . && isort --check-only . && flake8 app tests
```

```bash
cd frontend
npx tsc --noEmit                    # TypeScript check
```

---

## Architecture

```
Browser ──HTTP/SSE──> Next.js 15 (App Router)
                          │
                          │ fetch / EventSource
                          ▼
                      FastAPI  (app/api/v1)
                          │
         ┌────────────────┼──────────────────┐
         │                │                  │
    services/         agents/            db/ + cache/
  syllabus            syllabus.py        Postgres (sessions,
  teaching            teaching.py          history, docs)
  document            interview_agent    Redis (hot cache,
  resume              flashcard_agent      rate limiting)
                      visual agents
                          │
                      LLM client (LangChain)
                          │
               Groq · Gemini · Ollama · OpenAI
```

Sessions use anonymous UUIDs. Every user-owned table has a `user_id` column prepared for JWT auth when needed.
