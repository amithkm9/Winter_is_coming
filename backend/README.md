# Backend — Task & Mission Generation Engine (Phase 3)

FastAPI service that turns a Paris district into a validated mission payload:
procedural gesture sequence + difficulty tier, narrative from Gemini with a
deterministic offline fallback, and real-time step validation over REST or
WebSocket.

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

## Configuration

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | unset | Enables Gemini narrative generation. Without it the engine runs fully offline. |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model used for briefings, taunts and riddles. |
| `GEMINI_TIMEOUT_SECONDS` | `3.0` | Any timeout or error falls back to the built-in narrative. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS origins. |

## API

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Status and active narrative engine (`gemini` / `fallback`). |
| `GET` | `/api/districts` | The 16 districts, AI nodes and sign pools. |
| `GET` | `/api/districts/{id}/task` | Generate a mission payload (stateless preview). |
| `POST` | `/api/districts/{id}/missions` | Start a mission session and return its state. |
| `GET` | `/api/missions/{sessionId}` | Current session state. |
| `POST` | `/api/missions/{sessionId}/attempts` | Validate a gesture attempt, advance the step. |
| `WS` | `/api/ws/missions/{sessionId}` | Streams `MISSION_STARTED`, `STEP_RESULT`, `DISTRICT_LIBERATED`, `MISSION_FAILED`. |

A gesture attempt is accepted only when the gesture key matches the expected
step and both the confidence and hold duration meet the tier thresholds, so the
vision pipeline (Phase 2) can push raw classifications without duplicating the
rules.

## Difficulty tiers

| Tier | Districts | Signs | Hold | Confidence | Time | Counter-measure |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | 1–4 | 1 | 1.0s | 0.85 | 30s | none |
| 2 | 5–8 | 2 | 1.5s | 0.85 | 20s | none |
| 3 | 9–12 | 3 | 1.5s | 0.87 | 18s | visual static |
| 4 | 13–16 | 3 | 1.0s | 0.90 | 15s | core overclock |

## Tests and lint

```bash
pytest -q
ruff check .
```
