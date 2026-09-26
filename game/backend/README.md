# LearnSign optional AI service

The browser game works in keyboard mock mode without this service. This service provides two real partner integrations, Gemini hints and Gradium speech, plus an optional adapter for the existing six-class H5 recognition model. No provider credentials are included. Missing or failed Gemini requests return explicitly labeled authored hints; missing or failed Gradium requests return HTTP 503 and the browser keeps captions. Authored fallbacks are not partner API usage.

## Start locally

Use Python 3.12 (installed on this Mac as `/opt/homebrew/bin/python3.12`). From the project root:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8100
```

Edit `backend/.env` with your server-side keys. Never commit `.env` or put secrets in frontend `VITE_` variables. The service reads `.env` at startup. Restart after changing configuration. Vite proxies `/api` requests to localhost:8100 during development; production needs a separately hosted HTTPS Python service.

`GEMINI_MODEL` is configurable, default `gemini-3.5-flash-lite`. `GRADIUM_VOICE_ID` defaults to the voice used in the Gradium REST documentation. If credits do not grant access to a selected model or voice, choose one available in your provider account. `/api/health` reports configuration flags, not a successful upstream API test.

## API contract

| Endpoint | Input | Result |
|---|---|---|
| `GET /api/health` | None | `{gemini, gradium, recognition, modelExists}` booleans |
| `POST /api/hint` | `{encounter: string, unlocked: ['A','B','C'], attempts?: number}` | `{text, source: 'gemini' \| 'authored', focus: string \| null}` |
| `POST /api/voice` | `{text: string}` (1–500 characters) | WAV bytes or 503 JSON |
| `POST /api/recognize` | `{frames: number[][][]}` exactly 30 × 21 × 3 | `{sign: 'A' \| 'B' \| 'C' \| '1' \| '2' \| '3' \| null, confidence, source: 'model', verified: false}` |
| `POST /api/recognition/warmup` | No body | `{ready: true, verified: false, labels, sequenceLength: 30, featuresPerFrame: 63}` after actual load and inference; 503 `{ready: false, detail}` on failure |

Hint encounters: `clearing`, `force`, `shield`, `reveal`, `puzzle`, `guardian`, `complete`. Unknown encounters use the forest exploration hint. Only authored facts for known contexts enter the model prompt; arbitrary encounter strings are never sent upstream. The companion cannot mutate game state and never supplies instructions for forming ISL signs. Its hints describe game mappings, not linguistic meanings.

Input validation rejects incomplete, nonfinite, implausibly large, malformed or collapsed/no-hand landmark sequences before inference. Confidence below 0.85 yields `sign: null`. The frontend must apply its own temporal confirmation/cooldown. No-hand frames must clear its capture buffer, not be replaced with zeroes.

## Optional legacy recognition

The supplied model has now passed a read-only technical load and synthetic-inference check in the local Python 3.12 environment. See [MODEL_STATUS.md](MODEL_STATUS.md) for exact versions, SHA-256, results and unresolved accuracy/label questions.

The original archive is read-only to this project and remains unchanged:

```text
/Users/amithkm/iCloud Drive (Archive)/Desktop/LearnSign_pro_/ai-service/app/models/sign_language_numbers_letters.h5
```

To enable trial inference, install the optional heavyweight requirements separately:

```sh
backend/.venv/bin/python -m pip install -r backend/requirements-model.txt
```

Set `LEARNSIGN_MODEL_PATH` in `backend/.env` to the absolute trusted model path above. TensorFlow is lazy-loaded with `compile=False`; load and inference use separate locks. The server does not need MediaPipe: the browser extracts the landmarks. Frames are wrist-centered and divided by that frame's maximum absolute centered coordinate, matching archived `app/recognition.py`, then flattened into 63 values. Unlike the archived service, this adapter requires all 30 actual frames instead of padding missing samples.

**The labels are not verified.** The archived source hardcodes `[one, two, three, a, b, c]` because its label pickle was missing. This service translates that order into `[1, 2, 3, A, B, C]` but always returns `verified: false`. Model confidence is not an accuracy measurement. Its single-hand input cannot establish support for two-handed ISL signs. Neither this adapter nor browser MediaPipe compatibility establishes linguistic accuracy. Test real known examples and preprocessing alignment before presenting camera input as validated ISL recognition; keep keyboard mode available.

The health `recognition` flag means the model file and TensorFlow dependency are present; it does not load the model or prove accuracy. A corrupt/incompatible file can still fail its first inference with HTTP 503. No image frames are accepted, stored or logged by this service; landmark sequences are processed in memory.

Call `/api/recognition/warmup` before opening the camera to complete the first TensorFlow import, model load and graph execution. It runs synthetic features without returning them as a detected sign. Recognition uses `model(batch, training=False)` under the inference lock, avoiding per-request dataset/threadpool overhead. The response validates six finite probabilities whose sum is approximately one. A warmup success establishes operational readiness only; label order and real-hand accuracy are still unverified. Warmup uses the standard 20-per-minute route limit.

## Deployment

Host this service separately from the static itch.io build, with HTTPS. Set `CORS_ORIGINS` to the actual frontend/embed origins (comma-separated exact origins). A custom frontend host and an itch.io embed may have different origins. Do not set a wildcard to work around a missing origin. Configure the frontend API URL to this HTTPS host. Check webcam permission in the published embed as well as a direct game page.

Requests are limited to 150 KB; hints/voice to 20 requests per minute per client/route; recognition to 90. These in-memory counters apply per process and use the direct connection address. Public deployments should configure provider spend caps and appropriate gateway rate limits; CORS is not authentication. Avoid running an unrestricted paid API proxy for an indefinitely public release. Neither request content nor upstream secret-bearing errors are reflected in responses. Keep the prototype service to one worker for inference memory use. Model ownership and permission to redistribute the archive are not established, so it is not bundled into the public source.

## Tests

```sh
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
cd backend
.venv/bin/python -m pytest -q
```

Tests mock provider HTTP calls and inference. They exercise original preprocessing, low-confidence rejection, malformed/no-hand inputs, fallback behavior, WAV forwarding, request/rate bounds and CORS. They do not claim successful live provider calls or model accuracy.

## Primary references

- [Gemini generateContent REST API](https://ai.google.dev/api/generate-content)
- [Gradium text-to-speech REST API](https://docs.gradium.ai/guides/text-to-speech-rest)
- Existing archived LearnSign `app/recognition.py` and `requirements.txt`, inspected locally without edits.
