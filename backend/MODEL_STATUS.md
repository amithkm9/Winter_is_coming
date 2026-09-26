# Model technical validation

Checked locally on 2026-09-26 using Python 3.12 on Apple Silicon. **The real archived H5 file loads and produces finite six-class output. This is a technical compatibility check, not validation of any sign language or recognition accuracy.**

| Check | Observed result |
|---|---|
| TensorFlow / Keras / NumPy | 2.16.2 / 3.15.1 / 1.26.4 |
| H5 loading | `tf.keras.models.load_model(path, compile=False)` succeeds |
| Input shape | `(None, 30, 63)` |
| Output from one synthetic sequence | `(1, 6)` |
| Parameter count | 419,494 |
| Layers | Two Bidirectional layers, one LSTM, Dense layers, BatchNormalization and Dropout |
| Synthetic output | All finite; six probabilities sum to 1.0 |
| Archive modification check | SHA-256 identical before and after inspection |
| File size | 5,150,360 bytes |
| Labels / actual accuracy | Unverified / not tested |

Model SHA-256:

```text
9515e1376b495d81d77c1dc99a9ed548d2a552c06f21ca83c902dc3792a7053e
```

The synthetic input is deterministic Gaussian data with seed 42 and shape `(1, 30, 63)`. Its output was approximately `[0.61726, 0.10025, 0.06425, 0.05285, 0.11536, 0.05002]`. These values have **no sign-language interpretation**. A neural network returns scores even for arbitrary data; only controlled real-hand tests can validate recognition.

The archive is read directly via `LEARNSIGN_MODEL_PATH` in local ignored `backend/.env`. It was not copied into the game or changed. API keys in that file remain empty. No model conversion or compatibility patch was necessary. The optional requirements now pin the tested TensorFlow/Keras/NumPy combination.

The assumed output order remains `[1, 2, 3, A, B, C]`, inherited from the archived recognition code. Its original class-label pickle is missing. Every recognition response continues to include `verified: false`. The input holds only one hand, and browser-to-model landmark/preprocessing compatibility still needs tests using actual known gestures.

Reproduce the read-only check from the repository root:

```sh
backend/.venv/bin/python backend/inspect_model.py
```

The service is configured for local API port **8100**. Restart it after `.env` changes. A real `POST /api/recognize` call through FastAPI's test client returned HTTP 200 with `sign: null`, confidence `0.7053565`, `source: model`, and `verified: false` for a synthetic landmark sequence; the 0.85 confidence gate therefore rejected that sequence. `/api/health` reported `recognition: true` and `modelExists: true`; those are availability signals, not accuracy claims.

Provider flags reflect either the process environment or local dotenv configuration. Although this task created empty key placeholders in `.env`, the smoke-check process reported `gemini: true` from an already present environment value and `gradium: false`. No provider request was sent by these model checks, and no credential value was inspected or logged.

A subsequent separate live Gemini diagnostic was performed for `gemini-3.5-flash-lite`. The sandboxed request failed at the network layer; an approved retry with network access received **HTTP 401 / UNAUTHENTICATED**. The inherited credential is therefore not accepted by the provider. This is not evidence of model availability or successful partner integration. Gemini currently falls back to authored hints; provide a valid key and retest. Only HTTP status and the provider error code/status were printed, never credential values or response bodies. Server logs now record sanitized fallback categories.

## Webcam readiness recheck

The supplied archive was inspected again without edits. Its `app/recognition.py` explicitly says the original label pickle is missing and hardcodes `['one', 'two', 'three', 'a', 'b', 'c']`. The H5 root attributes are only `backend`, `keras_version`, `model_config`, and `training_config`; its top-level groups are `model_weights` and `optimizer_weights`. The output layer is a six-unit softmax. No label map, training script, labeled examples or training frame-rate metadata was found in the supplied project. The service retains the inherited mapping rather than inventing one.

The archived web quiz captures **20 unmirrored images separated by 100 ms**, then its recognition service repeats the last frame to reach 30. That is evidence of the old application's capture behavior, not the model's training protocol. The new browser path sends 30 actual landmark frames and may sample at a different rate. This timing change and browser-versus-legacy MediaPipe output must be checked with real examples before accuracy claims. Both paths center landmarks on the wrist and divide each frame by its largest absolute centered coordinate; raw normalized landmark XYZ input is expected, not already centered or world-coordinate landmarks.

New `POST /api/recognition/warmup` loads and executes the actual model before webcam capture, returning `ready: true` only after valid inference, with `verified: false`. Failure returns 503 and `ready: false`. Interactive inference now calls the model directly with `training=False`, avoiding `predict()` dataset setup. Tests verify that missing files or nonfinite/malformed/non-normalized outputs cannot report readiness.

Measured in the local Python test-client process with the real archived model: warmup **1.448 s**; three subsequent synthetic landmark requests **84 ms, 79 ms and 97 ms**, all HTTP 200 with `sign: null`, confidence `0.7053565` and `verified: false`. These are local observations, not a latency guarantee or webcam accuracy score. A direct request to the already running port-8100 service also returned HTTP 200 before restart, confirming that the prior service could reach the model.

After restarting the verified game service with the new code, actual HTTP checks also passed:

| Route | Direct backend `127.0.0.1:8100` | Game proxy `127.0.0.1:5173` |
|---|---|---|
| `POST /api/recognition/warmup` | HTTP 200, `ready: true`, 1.488 s initial load | HTTP 200, `ready: true`, 96 ms |
| `POST /api/recognize` with synthetic landmarks | HTTP 200, 85 ms | HTTP 200, 84 ms |

Both inference responses retained `sign: null`, confidence `0.7053565`, `source: model`, and `verified: false`. Thus the game origin can reach the running model through its normal proxy; cold loading is explicitly completed before camera capture. No camera image or real hand was used in this test. The service and transport blockers are resolved locally; semantic label verification and real-hand accuracy remain unverified. The backend suite passes **32 tests** including warmup readiness and invalid-output rejection.

Next validation steps are real camera capture, known-label examples for all six assumed classes, false-positive tests, and temporal confirmation tuning. Verified linguistic demonstrations require language-specific expert-reviewed references and an appropriate classifier. Keep keyboard mock mode clearly available.
