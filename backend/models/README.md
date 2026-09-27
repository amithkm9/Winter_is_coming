# Supplied sign model

`sign_language_numbers_letters.h5` is the existing LearnSign model, moved here from the repository root without modifying its bytes.

- Input: 30 frames × 63 landmark coordinates.
- Output: six classes, with inherited mapping `1, 2, 3, A, B, C`.
- Inference runs in Python; only hand landmarks are sent from the browser.
- The original class order and real-hand accuracy remain unverified. See [MODEL_STATUS.md](../MODEL_STATUS.md).

This directory is server-only. The static build copies only `public/` assets, so the model is excluded from the itch.io ZIP.
