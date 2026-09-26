# Winter is Coming ❄️🤖

> An interactive AI-powered resistance game set in a dystopian future Paris. Reclaim the city from rogue AI one arrondissement at a time using human sign language.

Developed for the **[{Tech: Europe} AI Gaming Hack](https://hackathons.techeurope.io/dashboard/hackathons/tech-europe-ai-gaming-hack)** in Paris.

---

## 🎮 Concept Overview

- **Setting:** Dystopian Paris under totalitarian AI control.
- **Lore:** Rouge AI monitors digital signals and spoken audio, making electronic resistance impossible. Humanity's secret weapon is **Sign Language** — analog, human physical gestures that bypass AI listening posts.
- **Objective:** Defeat AI across all arrondissements of Paris by performing sign language tasks detected via computer vision.
- **Victory Condition:** Reclaim every sector to shut down the central AI core and restore humanity's freedom.

---

## 🚀 Running the game

```bash
# Terminal 1 — FastAPI task & mission engine
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 2 — React client (proxies /api to the backend)
cd frontend && npm install && npm run dev
```

| Path | Contents |
| :--- | :--- |
| `backend/` | FastAPI task generation engine, mission state, Gemini narrative with offline fallback ([README](./backend/README.md)) |
| `frontend/` | React + Vite client: cinematic intro, tactical Paris map, webcam terminal ([README](./frontend/README.md)) |

The client runs without the backend — missions then come from the built-in offline district profiles.

---

## 📖 Project Documentation

Detailed project architecture, gameplay mechanics, and technical roadmaps are tracked in [`PLAN.md`](./PLAN.md).
