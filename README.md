# Winter is Coming

A browser-based 3D adventure set in frozen Paris. Choose Noor, Elio or Mira, explore the city, avoid surveillance, practise terminal inputs and restore the power network. Built with Three.js, TypeScript and Vite, with an optional Python service for webcam recognition and companion APIs.

**Opening film → character selection → chapter map → safe training → five missions → restored Paris.** Keyboard and touch inputs work without the Python service. Camera classification is experimental; its label mapping and real-hand accuracy remain unverified.

## Run locally

Use Node.js **22.18+** for the TypeScript-based tests and Python **3.12** for the optional model service.

```sh
npm ci
npm run dev
```

Open Vite's printed URL, normally **http://127.0.0.1:5173/** (`/winter.html` also opens the game). The supplied opening film starts after a tap/click and supports pause, mute and skip. The 3D game loads after playback ends or is skipped; media failure does not block entry. The supplied `Opening_Full_subtitled.mp4` provides burned-in subtitles; picture and audio are preserved without re-encoding.

For a phone on the same trusted Wi-Fi network, run `npm run dev:mobile` and open Vite's **Network** URL on port **5174**. A phone's `localhost` refers to the phone, not the development computer. LAN HTTP supports touch gameplay; camera access normally requires HTTPS. See [mobile testing](docs/MOBILE_ITCH.md).

## Playable chapters

| Chapter | Current prototype |
|---|---|
| 00 · The First Spark | Safe courtyard simulation: move four metres, press Enter near the beacon, rehearse A. Skipping unlocks the Louvre without awarding completion. |
| 01 · The Louvre Relay | Three relays, drone routes, optional memories and central-core restoration. |
| 02 · Under the Ice | Canal environment with ordered mechanisms, barriers, warnings and restoration. |
| 03 · A Place to Grow | Glasshouse environment with its own mechanisms, discoveries and restoration. |
| 04 · Beyond the Clouds | Observatory environment with sequential interactions, hazards and completion. |
| 05 · The Returning Dawn | NEXUS spire mechanisms and the campaign ending. |

All six chapters are implemented. Later environments use the common exploration/terminal framework; richer moving-bridge, light-routing, constellation and multi-phase boss mechanics remain production work. Mission completion unlocks and selects the next chapter on the map.

The three students have different portraits, outfits and interests with identical abilities. They are deaf and nonspeaking; restoring the city does not change those identities. Characters, environments, gait and effects are procedural, not motion-captured cinematic assets.

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move relative to the camera |
| Shift | Run |
| Drag the scene | Look around |
| V / VIEW | Switch third-person and eye-level views |
| Enter / phone ENTER | Use a nearby object, enter/leave a terminal or activate the ready core |
| A, B, C, 1, 2, 3 / terminal buttons | Send the displayed simulated input while interacting |
| Escape / PAUSE | Leave the terminal or pause |

Phones have a left joystick, independent drag-to-look and large ENTER/RUN/VIEW controls. RUN toggles running; movement controls disappear during terminal entry. Touch devices default to lower rendering cost. Settings provide reduced motion, sound, music, volume and optional narration.

For the Louvre, complete West arcade **A**, East gallery **B → C**, and Archive vault **A → C → B** in any order, then press **Enter** at the core. Red scanner areas trigger a five-second escape countdown. If caught, explicitly retry from the checkpoint; completed objectives and discoveries are retained.

At terminals, **Study** enlarges the hand illustration safely. **PRACTISE FIRST** rehearses inputs without restoring the real relay. **Ready to try** returns to the mission. See [PLAYER_FLOW.md](docs/PLAYER_FLOW.md).

## Sign references and camera limits

Local illustrations depict **ASL A, B, C, 1, 2 and 3**. Sources and orientation notes are in [public/signs/PROVENANCE.md](public/signs/PROVENANCE.md); no external video player is required. These references do not establish that the supplied classifier was trained on ASL. Terminal ciphers are not universal sign-language meanings.

The H5 model expects 30 frames of one hand's 21 XYZ landmarks. Its original label file is missing; the inherited order is `1, 2, 3, A, B, C`. Every model response retains `verified: false`. Confidence thresholds are acceptance rules, not measured linguistic accuracy. Qualified review and labeled real-hand tests remain necessary before validated teaching claims.

## Optional backend

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

For recognition, install model dependencies and configure an absolute path to a trusted model copy in `backend/.env`:

```sh
backend/.venv/bin/python -m pip install -r backend/requirements-model.txt
```

```dotenv
LEARNSIGN_MODEL_PATH=/absolute/path/to/sign_language_numbers_letters.h5
LEARNSIGN_CONFIDENCE=0.85
```

Start the service:

```sh
backend/.venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8100
```

Vite proxies `/api` to **8100**. On localhost, choose **USE CAMERA → ENABLE CAMERA**. Startup warms the real model before requesting capture. Bundled browser MediaPipe extracts landmarks; coordinate sequences, not camera images, are sent to Python. Two stable high-confidence predictions produce an input. Lower your hand between inputs; tracking loss or interaction changes invalidate stale results.

Actual model load, numerical inference and local proxy checks have passed. These establish connectivity, not real-hand accuracy. See [backend setup](backend/README.md) and [MODEL_STATUS.md](backend/MODEL_STATUS.md).

**Gemini** can provide Maëlle's contextual hints; **Gradium** can narrate matching captions. Keys belong only in server configuration. Authored hints/captions remain available on failure. The last live check received Gemini **401 UNAUTHENTICATED**; Gradium had no configured key. Both need valid credentials and successful requests before claiming live partner usage. Existing shell environment variables take precedence over `.env`.

## Saves and reset

Saves are browser/device/origin-specific. Campaign state, settings, last chapter and each mission have separate Winter keys. Training replay preserves real mission progress. Use **Reset adventure** in Settings or open `winter.html?reset=1` to start fresh. Reset clears this game's owned keys, including settings, without clearing unrelated applications' storage; the URL parameter is removed afterward.

## Test and package

```sh
npm test
npm run test:winter-world
npm run build
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
backend/.venv/bin/python -m pytest backend/test_service.py -q
npm run package:winter
```

Upload `artifacts/winter-paris-3d-itch.zip` as a free HTML game on itch.io. Its browser entry is `index.html`. Static packaging excludes the Python service, secrets and H5 weights. For public AI features, deploy the backend separately over HTTPS, configure the actual embed origin in `CORS_ORIGINS`, and build with its base URL:

```sh
VITE_API_URL=https://your-backend.example npm run package:winter
```

Test the published iframe: HTTPS, user permission and host camera policy are separate requirements. Touch/keyboard play remains available without a backend. Physical-device performance and camera compatibility remain manual checks.

Automated tests cover mission/campaign saves, onboarding, capture/retry, practice, touch pointers, camera lifecycle, gesture gating, audio, effects, reset and backend validation. The world smoke tool checks geometry/route reachability and renders a CPU preview; it is not a WebGL screenshot or complete player walkthrough. End-to-end browser playthroughs, actual iOS/Android tests, listening checks and real-hand evaluation remain release work.

## Project guide

- `src/winter/`: opening player, 3D worlds, characters, chapters, UI, controls and sound.
- `src/services/`: hand tracking, gesture confirmation and API client.
- `public/`: opening media, portraits, attributed ASL references and bundled MediaPipe assets/notices.
- `backend/`: FastAPI, partner adapters, optional classifier and tests.
- `tests/`, `scripts/`: regression checks, world previews and static packaging.

See [game design](docs/GAME_DESIGN.md), [remaining work](TODO.md), [player flow](docs/PLAYER_FLOW.md), [mobile guide](docs/MOBILE_ITCH.md) and [credits](CREDITS.md).
