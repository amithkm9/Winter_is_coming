# Frontend — Winter is Coming

React + Vite client: cinematic intro, interactive 16-arrondissement tactical map, webcam resistance terminal and sign codex.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` proxies `/api` to the FastAPI task engine (default `http://localhost:8000`, override with `VITE_BACKEND_URL`). Start the backend from `../backend` — see `../backend/README.md`.

## Backend integration

`src/hooks/useMissionSession.js` starts a server-authoritative mission (`POST /api/districts/{id}/missions`) when the terminal opens and submits each completed gesture hold (`POST /api/missions/{sessionId}/attempts`). The server owns step advancement, hold/confidence thresholds, the time limit and the handler/AI narrative.

If the engine is unreachable the hook reports `online: false` and the terminal falls back to the offline district profiles in `src/data/arrondissements.js`, so the game stays playable with no backend.

The backend gesture catalogue (17 narrative signs) is mapped onto the 10 postures the browser MediaPipe classifier recognises in `src/data/signBridge.js`.

## Deploying

`VITE_API_BASE_URL` overrides the API base when the backend is not served from the same origin.
