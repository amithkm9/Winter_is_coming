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

The independent Three.js game is in [`game/`](./game/README.md), alongside the existing React client and mission engine. It includes three selectable students, a safe training chapter and five playable sectors: Louvre, Canal, Glasshouse, Observatory and Spire. Each sector has sign-input terminals, exploration, hazards, collectibles, an ending and a separate browser save. First-person and third-person views, sound, restoration effects and sequential chapter unlocks connect the adventure.

```bash
cd game
npm ci
npm run dev
# Open http://localhost:5173/winter.html
```

For webcam recognition, follow [`game/backend/README.md`](./game/backend/README.md) to run its separate FastAPI service on port **8100** and configure your trusted H5 model path. The 3D client proxies `/api` to that service; the existing root backend continues to use port **8000**. Run either frontend on port 5173, or choose another port when running both.

The game is fully playable with keyboard inputs or mobile touch controls. Phones have a joystick, drag-to-look, action buttons, six simulated sign inputs and reduced rendering cost by default. See the [mobile and itch.io guide](./game/docs/MOBILE_ITCH.md); physical-device performance and the deployed iframe still require testing. Camera classification uses the supplied six-class model experimentally; label order and real-hand accuracy remain unverified. Gemini and Gradium need valid provider credentials for live use. See the [player guide](./game/docs/PLAYER_FLOW.md) and [model validation notes](./game/backend/MODEL_STATUS.md).

```bash
cd game
npm test
npm run build
npm run package:winter
```


## Root game and camera startup

The current root game also runs with `npm ci` and `npm run dev` from the repository root. Open `http://127.0.0.1:5173/`. Its ASL reference images, subtitled intro, Enter interaction and reset flow remain available; the separately maintained `game/` version above is also preserved.

Both camera controllers request permission immediately and show a live preview before loading recognition. If recognition fails, the preview stays visible with a specific error and retry action. Closing a pending camera request releases retry controls.

For the root game's sign model service, install `backend/requirements-model.txt`, configure `LEARNSIGN_MODEL_PATH` in local `backend/.env`, and run:

```sh
backend/.venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8100
```

The port **8000** task engine above is a different service. Static itch.io uploads need a separately hosted HTTPS recognition backend configured with `VITE_API_URL`; pushing source code alone does not deploy that backend. Camera label mapping and real-hand accuracy remain unverified.
