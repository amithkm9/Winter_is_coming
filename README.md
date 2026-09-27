# ❄️ Winter is Coming · The Silent Resistance

*An AI webcam-powered 3D resistance game where hand gestures restore a frozen city.*

Built for the {Tech: Europe} AI Gaming Hack, Paris, September 2026.

---

## 📖 The Story

A rogue super-intelligence called **NEXUS-PARIS** has taken over the city's smart grid and plunged Paris into an eternal **Artificial Winter**. It controls every network, every radio and every microphone. Any word spoken aloud is intercepted instantly.

But the machine has one blind spot: it was never trained to understand human hands.

The last free humans have gone silent and now communicate only through **sign language**. Choose one of three resistance couriers, infiltrate the frozen city, and take back Paris one sector at a time.

## 🎯 The Goal

Explore Paris, liberate all **5 sectors**, and shut down the AI core.

Behind the mission, the real goal of the game is to **teach you the basics of sign language**. Practise six letter/number hand shapes and use increasingly long cipher sequences to restore the city. Local ASL reference images are included; the supplied classifier is experimental and does not certify sign-language accuracy. No prior experience is needed to play.

## ✨ Features

- **Real-time 3D exploration** across 5 Parisian sectors, plus a safe Training Academy to practise your signs.
- **3 unique couriers:** play as Elio, Mira or Noor.
- **Webcam sign recognition:** Google MediaPipe tracks your hand; the Python service classifies landmark sequences using the supplied H5 model. Keyboard/touch simulation also works without the service.
- **Gesture-based relay calibration:** transmit silent ciphers to reclaim each sector.
- **Collectible memories:** find five memory sparks per sector to fill the journal and unlock an explorer scarf.
- **Mobile and desktop support:** play in your browser with keyboard and mouse, or on mobile with on-screen joysticks and touch buttons.

## 🕹️ How to Play

1. **Watch or skip the subtitled intro.** Camera access is optional and requested when you choose Use Camera. Video stays in the browser; the service receives landmark coordinates for inference.
2. **Pick your courier** and start in the Training Academy to learn your first signs.
3. **Explore the sector** and find the frozen communication relays hidden around it. Collect optional memory sparks along the way.
4. **Walk up to a relay and interact.** A guide card shows the required hand shape and how to position your fingers. The ciphers are fictional game inputs, not linguistic meanings.
5. **Perform the sign** in front of your camera. The camera panel shows tracking and recognition status. Hold steady, then lower your hand between inputs; confidence is not an accuracy score.
6. **Watch out for AI drones.** If you stay inside a drone's red scan zone for more than 5 seconds, the run stops at a Caught screen. Retry from a checkpoint with your restored relays and memories preserved.

Calibrate every relay in a sector to liberate it and unlock the next one.

## 🎮 Controls

| Action | Keyboard / Mouse | Mobile |
| :--- | :--- | :--- |
| Move | WASD or Arrow keys | Virtual joystick |
| Look around | Mouse drag | Touch drag |
| Interact / Calibrate | Enter | ENTER button |
| Sprint | Shift | Run toggle |
| Perform a sign | Your hand, in front of the webcam | Your hand, in front of the camera |
| Sign input (fallback) | A / B / C / 1 / 2 / 3 while interacting, or click a sign | Touch the sign buttons |
| Pause | Escape | Pause button |

**Tip:** play in a well-lit room and keep your whole hand inside the camera frame.

## 🗺️ Why Different Sectors?

Each level is a real corner of Paris taken over by the AI: the **Louvre Courtyard**, **Canal Saint-Martin**, the **Botanical Glasshouse**, the **Paris Observatory**, and finally **the Spire**, where the AI core waits.

The sectors form a learning path:

- **New sector, new sequences.** Later missions combine the six supported inputs in longer patterns.
- **Rising difficulty.** Early relays need a single sign; later ones ask for sequences of signs, under heavier drone patrols.
- **The final test.** At the Spire, you must combine everything you have learned to shut down NEXUS-PARIS for good.

Liberate every sector and Paris sees the sun again. ☀️

---

## 🛠️ Tech

TypeScript + Vite + Three.js, Python FastAPI, Google MediaPipe hand tracking, and optional TensorFlow/Keras inference. Gemini hints and Gradium voice are optional server-side integrations with authored/text fallback.


## Run locally

Requires Node.js **22.18+** (native TypeScript test support) and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. `winter.html` remains an equivalent entry point for existing bookmarks. Mock inputs work immediately; no camera or API keys are required for a full campaign.

For camera recognition, start the Python 3.12 service using [backend setup](backend/README.md). The bundled weights are at `backend/models/sign_language_numbers_letters.h5`. Use localhost on a laptop; plain HTTP LAN addresses cannot request camera access.

## Repository layout

```text
src/
  winter/             3D world, gameplay, progression and UI
    styles/           Game, chapter map, touch and film styles
  services/           Camera, gesture confirmation and API client
public/
  art/characters/     Student portraits
  signs/              Local hand-reference images and attribution
  mediapipe/          Browser tracking model and WASM runtime
  video/              Opening/ending films and posters
backend/
  models/             Server-side H5 inference weights
  tests/              Python service and gateway tests
  main.py             Recognition and companion API
scripts/
  lib/                Shared CPU preview renderer
  package_itch.py      Static itch.io ZIP builder
  *.mjs               World geometry checks and previews
tests/                TypeScript/DOM/game-flow tests
docs/                 Design, player flow and deployment guides
```

Root files contain the entry pages, package/compiler/build configuration, README, license, credits and delivery checklist. There is one frontend and one backend. Generated `dist/`, `artifacts/`, dependencies and local `.env` files are ignored.

## Checks and packaging

```sh
npm test
npm run format:check
npm run test:winter-world
npm run test:chapters
npm run package:itch
```

`npm run format` formats authored TypeScript, CSS, JavaScript tooling and frontend configuration. The build also rejects unused TypeScript locals and parameters. Run Python tests as documented in [backend/README.md](backend/README.md).

Upload `artifacts/winter-paris-3d-itch.zip` as an HTML game. The ZIP includes both subtitled films: the intro at launch and the ending after **Level 1 / Louvre**. Level completion is saved before the ending; watching, finishing or skipping leads to the completion panel and next-chapter map. The title can replay the intro and the final victory screen can replay the ending.

Camera recognition on itch.io additionally needs a reachable HTTPS backend and the appropriate iframe permissions. Set public `VITE_API_URL` in `.env.production.local` before building; provider keys belong only in `backend/.env`. See [mobile/itch deployment](docs/MOBILE_ITCH.md) and [temporary recognition gateway](docs/ITCH_RECOGNITION_DEMO.md).

Automated checks cover state/UI and service behavior. Actual mobile camera accuracy, hardware rendering and complete device playthroughs remain manual validation work.

## Project guides

- [How the game works](docs/PLAYER_FLOW.md)
- [Design and planned mechanics](docs/GAME_DESIGN.md)
- [Delivery checklist](TODO.md)
- [Model limitations](backend/MODEL_STATUS.md)
- [Credits and asset provenance](CREDITS.md)
