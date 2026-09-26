# Hand tracking assets

The WebAssembly runtime files in `wasm/` are copied from `@mediapipe/tasks-vision` version 0.10.32 (Google MediaPipe, Apache-2.0 per its npm package metadata).

`hand_landmarker.task` was downloaded on 2026-09-26 from the official MediaPipe model distribution:
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

These assets detect hand landmarks. They are separate from the private LearnSign H5 classifier, which remains on the local Python backend and is excluded from static game packages.
