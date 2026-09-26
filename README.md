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


## Playable 3D adventure

The independent Three.js game is in [`game/`](./game/README.md), alongside the existing React client and mission engine. It includes three selectable students, a safe training chapter, the playable Louvre mission, first-person and third-person views, sign-input terminals, sound, collectibles and browser saves. Chapters 2–5 are planned, not implemented in this PR.

```bash
cd game
npm ci
npm run dev
# Open http://localhost:5173/winter.html
```

For webcam recognition, follow [`game/backend/README.md`](./game/backend/README.md) to run its separate FastAPI service on port **8100** and configure your trusted H5 model path. The 3D client proxies `/api` to that service; the existing root backend continues to use port **8000**. Run either frontend on port 5173, or choose another port when running both.

The game is fully playable with keyboard inputs. Camera classification uses the supplied six-class model experimentally; label order and real-hand accuracy remain unverified. Gemini and Gradium need valid provider credentials for live use. See the [player guide](./game/docs/PLAYER_FLOW.md) and [model validation notes](./game/backend/MODEL_STATUS.md).

```bash
cd game
npm test
npm run build
npm run package:winter
```
