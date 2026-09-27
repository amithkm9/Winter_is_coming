# Recognition and companion service

The current game uses this FastAPI service on **port 8100**. There is one backend; the obsolete port-8000 mission engine has been removed.

## Run locally

Use Python 3.12 for the supplied TensorFlow model. From the repository root:

```sh
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-model.txt -r requirements-dev.txt
cp .env.example .env
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8100
```

Copy the example only on first setup; keep an existing `.env`. Start from `backend/` so the example's relative model path resolves correctly. An absolute `LEARNSIGN_MODEL_PATH` is also supported. Installing only `requirements.txt` enables optional hints/voice without TensorFlow; the game remains playable with simulated inputs.

## Files

- `main.py`: API validation, provider adapters, rate limits and recognition routes.
- `recognition.py`: landmark preprocessing, model loading and inference.
- `models/`: the supplied H5 weights and model notes. Never served by Vite or included in itch.io builds.
- `demo_gateway.py`: restricted recognition-only proxy for a temporary HTTPS demo.
- `inspect_model.py`: read-only model shape/hash/synthetic inference diagnostic.
- `tests/`: API, model-boundary and gateway tests.

## Configuration

| Variable | Purpose |
| --- | --- |
| `LEARNSIGN_MODEL_PATH` | Trusted H5 file; example uses `models/sign_language_numbers_letters.h5`. |
| `LEARNSIGN_CONFIDENCE` | Minimum model confidence; default `0.85`. Confidence is not measured accuracy. |
| `CORS_ORIGINS` | Comma-separated frontend origins for the main service. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional generated hints, with authored fallback. |
| `GRADIUM_API_KEY`, `GRADIUM_VOICE_ID` | Optional spoken hints; readable text stays available. |

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Configuration and model-file availability. |
| POST | `/api/recognition/warmup` | Load and run model before starting recognition. |
| POST | `/api/recognize` | Classify 30 frames of 21 hand landmarks (XYZ). |
| POST | `/api/hint` | Contextual hint or authored fallback. |
| POST | `/api/voice` | Optional audio for a readable hint. |

Local interactive documentation: <http://127.0.0.1:8100/docs>.

## Verify

From `backend/`:

```sh
.venv/bin/python -m pytest -q
.venv/bin/ruff check . ../scripts/package_itch.py
.venv/bin/ruff format --check . ../scripts/package_itch.py
.venv/bin/python inspect_model.py
```

The model diagnostic requires model dependencies and configuration. Synthetic inference verifies technical compatibility, not real-hand accuracy. See [model status](MODEL_STATUS.md), [deployment](../docs/MOBILE_ITCH.md), and [temporary demo gateway](../docs/ITCH_RECOGNITION_DEMO.md).
