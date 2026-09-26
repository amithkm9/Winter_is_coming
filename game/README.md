# LearnSign / Winter is Coming — browser game prototypes

## New: Winter is Coming — real-time 3D preview

### Start-to-finish player journey

**Begin your story → choose Noor, Elio or Mira → chapter map → The First Spark training → The Louvre Relay → rewards and map.** The three students have matching original portraits and visibly different 3D outfits/accessories; their abilities are identical. Confirmed character choice persists. The map supports keyboard navigation and focus management.

The title screen now includes **How to play**; the same player-facing walkthrough is in [PLAYER_FLOW.md](docs/PLAYER_FLOW.md).

At a terminal, choose **USE CAMERA → ENABLE CAMERA**. Startup warms the real H5 model, then opens the webcam. Bundled MediaPipe assets collect 30 frames of one hand; two stable high-confidence predictions emit a game input. The camera panel shows the requested label and capture progress. Lower the hand between inputs. A recognized matching input advances the current relay sequence automatically. **RESTART CAMERA** retries startup; changing interactions clears pending recognition so old input cannot carry into another relay.

This local setup still needs the Python backend running on port 8100. The static itch.io ZIP includes the hand tracker but not the private H5 classifier or backend. The model's six-class label mapping and physical-hand accuracy remain unverified.

The First Spark is a safe training simulation in the existing courtyard, not a second unique environment. Walk four meters, approach the green beacon, press **E**, then rehearse **A** with a keyboard input or experimental camera label. Completing it unlocks the Louvre. The pause menu also lets you skip training without awarding completion. Tutorial replay preserves real mission saves and collectible progress. Existing valid Louvre saves retain access without a fabricated tutorial completion.

The map plans six chapters: **The First Spark**, **The Louvre Relay**, **Under the Ice**, **A Place to Grow**, **Beyond the Clouds**, and **The Returning Dawn**. Only training and Louvre can launch. The four future chapters have separate gameplay designs and visibly disabled launch controls.

Read the complete [game design](docs/GAME_DESIGN.md) and [prioritized build checklist](docs/BUILD_ROADMAP.md). Profile state is separate under `winter-campaign-v1`; mission state remains under `winter-louvre-v1`. No existing save is cleared by choosing a character or replaying training.

Open **http://127.0.0.1:5173/winter.html** after `npm run dev`. The separate Three.js entry implements the frozen-Paris concept from the supplied `PLAN.md`. The original 2D adventure remains at `/` and `/forest.html`; its save is separate.

Sector 01 is a stylized Louvre courtyard with palace architecture, a glass pyramid, moving drones and visible scanner cones, an animated student, snow, shadows, bloom and film grading. A ten-second, three-shot opening leads into play. Restore three local optical relays, return to the pyramid core, and trigger an eight-second lighting/restoration sequence. It is one playable mission plus a safe onboarding simulation. The six-chapter design supersedes the earlier sixteen-sector outline.

| Input | Winter action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run |
| Drag on the scene | Turn the camera |
| E | Access a nearby relay / leave it / activate the unlocked core |
| A / B / C | Enter the displayed cipher while using a terminal |
| Escape | Leave terminal / pause |

Press **V** or the HUD **VIEW** button to switch between third-person and a steady first-person camera at the student's eye height. Drag up/down to look vertically in eye view; left/right turns in both views. The choice persists, while story cinematics retain their directed shots.

Movement follows the camera's actual view: A/D travel screen-left/right, W away and S toward the camera. The student turns toward the collision-resolved travel direction and faces the device while interacting. Walking and running accelerate smoothly at different speeds. The closer chase camera keeps the student legible, with gentle look-ahead and a small running field-of-view change; reduced-motion mode removes those embellishments.

The procedural character now has articulated knees, ankles, shoulders and elbows, a coordinated gait, connected torso/outfit motion and fabric follow-through. Foot contacts drive footsteps, fading prints and small snow puffs. These are procedural character improvements, not motion-captured or authored cinematic animation. Hardware-rendered visual inspection remains required before making animation-quality or frame-rate claims.

Avoid red scanner pools: prolonged exposure extracts the courier while retaining completed relays. Complete West arcade **A**, East gallery **B → C**, and Archive vault **A → C → B**, in any order. Then press E at the core in front of the pyramid. Settings include reduced motion, performance mode, sound effects and optional Gradium narration. Progress saves locally under `winter-louvre-v1`.

Noor, Elio and Mira are deaf, nonspeaking students learning sign language. The story uses that general wording; the current A/B/C mechanics are fictional resistance ciphers, with no claim of universal or verified linguistic meanings. The optional legacy camera classifier still needs validation. Gemini supplies contextual handler hints and Gradium supplies optional voice through the same backend described below; both still need valid credentials and live verification.

### Practice, discoveries and sound

At a relay, choose **PRACTISE FIRST** to rehearse the displayed sequence using keyboard input or experimental camera recognition. Drone danger is disabled during rehearsal, wrong inputs retain your rehearsal step, and practice never restores a mission relay. Choose **READY** to return to the real relay. This is input rehearsal, not a verified sign demonstration or teaching curriculum.

Five optional golden memory sparks reveal pages from Noor's notebook. Open the **✎ journal** to reread collected pages. Finding all five changes her scarf to gold. Memories save with the existing mission save and remain optional for completion. The HUD gives an early West arcade objective, visible scanner warnings and immediate input/reward feedback.

Original procedural Web Audio provides snowy footsteps, wind, an optional musical bed, terminal and gesture chimes, pickups, scanner warnings, relay chords and a liberation swell. Sound starts after user interaction, pauses with menus and hidden pages, and has a master effects/music volume control. Narration is a separate optional setting. These sound effects require no API key or audio downloads. The visuals and text carry all necessary gameplay information when sound is off. Automated tests check audio scheduling and lifecycle; subjective listening and browser GPU checks remain manual validation tasks.

Read the [concept review and cinematic direction](docs/WINTER_DIRECTION.md) for story corrections, architecture and the next production steps. Build with `npm run package:winter` for `artifacts/winter-paris-3d-itch.zip`, whose root page opens the 3D preview. GPU rendering, visual frame rate and the complete browser playthrough still need verification on the demo machine: this session has no connected browser. Geometry/mission checks do not replace that verification.

## LearnSign: The Lost Signs

A playable 2D forest adventure built with Phaser and TypeScript. Discover the Sign Gauntlet, awaken Force, Shield and Reveal, explore ruins, recover hidden stars, and restore the Forest Guardian.

This hackathon prototype is **Chapter One: Whispering Forest**. The island, mountains, and castle are future chapters. Keyboard gameplay passes a Phaser headless runtime smoke test; browser playthrough and verified ISL recognition remain validation tasks. The UI clearly identifies experimental webcam mode.

## Run the game

Node.js 22.18+ is recommended (the tests use Node's TypeScript stripping; development was tested with Node 25). Install dependencies, then start the client:

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. Click **Begin your adventure**, watch or skip the four-part opening, and play. No backend is required for keyboard gameplay. The optional Google Fonts requests have local serif/sans-serif fallbacks.

## Controls

| Key | Action |
| --- | --- |
| Left / Right arrows | Move |
| Space | Jump |
| Shift | Dash |
| J | Basic attack |
| E | Discover a nearby shrine |
| A | Force — break the boulder, damage enemies, strike a vulnerable boss |
| B | Shield — block or reflect attacks |
| C | Reveal — open chests and ancient seals |
| Q | Toggle slow-motion casting focus |
| Escape | Pause / resume |

The HUD power buttons also cast unlocked powers. Keys 1/2/3 are recognized by the input system but their powers belong to the future island chapter and cannot be unlocked in the forest. The game is designed for a keyboard-equipped desktop/laptop; touch gameplay and controller support are not implemented.

## Forest walkthrough

1. Follow the path to the first shrine (A). Press E to awaken Force, then cast A near the large boulder.
2. Jump the broken crossing. Discover B at the second shrine and use it against the sentry projectiles.
3. Find the C shrine. Cast C near chests or the tall glowing ruins seal.
4. At the three watchers, cast **A → C → B**. Wrong inputs reset the sequence gently.
5. Enter the Guardian's grove. Wait for its charged projectile, reflect it with **B**, and cast **A** while the Guardian glows. Repeat until its armor is cleared.
6. Complete **A → B → C** to restore the Guardian and recover the first crystal. Continue exploring or replay for the five hidden stars.

Progress saves locally under `learnsign-save-v1`: shrines/checkpoints, unlocked powers, unique coins/stars/chests, defeated enemies, puzzle completion, chapter completion, and elapsed time. Browser storage is device/origin-specific, not an online account. Starting a new run asks before replacing a saved run. Corrupt saves are rejected.

## Optional AI service

The game implements adapters for two partner services through a Python FastAPI backend:

- **Google DeepMind / Gemini:** contextual hints from Luma in the forest or Maëlle in frozen Paris, based on authored encounter facts. Press the ✧ button in the HUD. Responses never control physics or progression. Authored hints remain available on failure.
- **Gradium:** optional narration of story/companion captions. Enable **Companion narration** in Settings. No voice is fabricated when Gradium is unavailable; text remains readable.

Create a compatible Python environment and start the service:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
# Copy backend/.env.example to backend/.env and fill in local values.
backend/.venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8100
```

Vite proxies `/api` to port 8100. Store `GEMINI_API_KEY`, `GRADIUM_API_KEY`, and model configuration in `backend/.env`, which is ignored. See [backend setup](backend/README.md). The health indicator reports configuration availability; it does not certify successful provider calls.

Current local verification: the inherited Gemini credential was rejected with HTTP 401 UNAUTHENTICATED, and Gradium is not configured. Both live integrations need valid keys before the hackathon submission. The game currently uses authored hint fallback. If the shell already defines an invalid `GEMINI_API_KEY`, remove/replace that inherited variable before starting the server; environment variables take precedence over `.env` by default.

## Experimental webcam recognition

Use the camera button in the HUD to read the data notice and explicitly enable the camera. Browser MediaPipe tracks one hand and supplies 30 frames of 21 XYZ landmarks. Only those coordinates are sent to the Python service; this client does not upload camera images. Tracking resources load from jsDelivr and Google's model storage on first use.

The backend applies the archived wrist-centering/max-absolute normalization and runs the supplied H5 model. The model is not bundled into the public client. Set `LEARNSIGN_MODEL_PATH` to your own copy and install `backend/requirements-model.txt` in the compatible environment.

Two high-confidence predictions are required to cast. Lower your hand between casts; held gestures cannot repeatedly trigger powers. Stale results are discarded when tracking continuity is lost. The 85% threshold is provisional, not a calibrated recognition-accuracy measurement.

**Important current limitation:** the archived service hardcodes the labels `1, 2, 3, A, B, C` because its original label file was missing. Model compatibility can be tested, but these label mappings and real ISL recognition accuracy require known examples. The model takes one hand; it cannot represent full two-handed ISL. This prototype has no verified sign demonstration clips yet and should not be presented as a validated ISL teaching product. Force/Shield/Reveal are fictional ability mappings, not translations of signs.

## Build and package for itch.io

```sh
npm run build
npm run package:itch
```

The ZIP is `artifacts/learnsign-forest-itch.zip`, with `index.html` at its root. It contains only the browser game, never the Python service, `.env`, or model weights.

For live AI features, deploy the backend separately over HTTPS, configure the actual game origin in `CORS_ORIGINS`, and build with its public URL:

```sh
VITE_API_URL=https://your-backend.example npm run package:itch
```

On itch.io create an HTML game, upload the ZIP, select browser play, and make it free. Recommended viewport: 1280 × 720 with fullscreen available. Test camera permission in the actual embed: HTTPS and the host's iframe permissions policy must allow camera access. Verify actual Gemini and Gradium requests before submitting the two-partner integration claim. Without a deployed backend the packaged game remains playable using keyboard powers and authored dialogue.

## Validation

```sh
npm test
npm run test:runtime
npm run test:winter-world
npm run build
backend/.venv/bin/python -m pytest backend/test_service.py -q
```

Unit tests cover corrupt/progression-breaking saves, duplicate collectible IDs, sequence recovery, held-gesture debounce, low-confidence/stale predictions, backend validation, provider failures, and grounded hint fallback. The runtime smoke uses the actual Phaser engine with an emulated DOM and native canvas, covering scene creation, colliders, movement, slow-time gravity, power unlocks, puzzle, boss reflection/completion, save/continue and restart. It uses direct scene positioning for encounter setup, so it does not establish a full player-route playthrough. Full browser playthrough, camera permission behavior, and live provider verification must also be completed before publication.

Winter mission tests cover relay sequencing, alert extraction, timed liberation and save validation. `test:winter-world` checks actual Three.js scene geometry, finite transforms and route reachability, then writes `artifacts/winter-world-preview.png` using a CPU triangle renderer. That image checks composition; it omits WebGL effects and is not a browser screenshot.

`npm run art:preview` generates `artifacts/art-contact-sheet.png` and `artifacts/title-forest-preview.png`. These are rendered artwork previews, not browser screenshots. The original H5 model now passes a real TensorFlow load and synthetic numerical inference check; see [model status](backend/MODEL_STATUS.md). This does not establish sign-recognition accuracy.

## Project layout

```text
src/main.ts                 Menu, cinematic, HUD, settings, captions and audio
src/game/GameScene.ts       Forest, movement, abilities, enemies, puzzle, boss
src/game/art.ts             Original canvas art, sprite poses and forest layers
src/game/progress.ts        Save validation and puzzle sequence logic
src/services/               Camera tracking, gesture gating and API client
src/winter/                 Three.js courtyard, VFX, courier, mission and UI
public/art/title-forest.svg Original title illustration
backend/                    FastAPI, partner adapters, model adapter and tests
scripts/package_itch.py     Secret-free static ZIP packaging
TODO.md                     Work tracker and remaining submission steps
```

All game illustrations in `art.ts` and `title-forest.svg` were authored for this prototype. See [credits](CREDITS.md) and [demo notes](DEMO.md). The existing H5 model belongs to the supplied archived LearnSign project and is referenced separately, with its prior existence disclosed.
