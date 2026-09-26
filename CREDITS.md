# Credits and asset provenance

## Original game work

- **Concept:** the user's *Winter is Coming* frozen-Paris resistance concept, adapted into a six-chapter browser adventure.
- **Characters:** original Noor, Elio and Mira profiles, SVG portraits and procedural outfits/accessories. The campaign route is fictional, not a geographic Paris map.
- **Worlds:** Louvre courtyard, canal, glasshouse, observatory and NEXUS spire geometry, mechanisms, camera choreography, shaders and interface were created as procedural assets/code. No scanned environments or commercial cinematic packs are included.
- **Writing:** original student journals, discoveries, companion lines and chapter descriptions.
- **Audio:** original procedural Web Audio footsteps, wind, tonal ambience, terminal sounds, alarms and restoration swell. These effects use no sampled commercial music or downloaded sound library.
- **Presentation:** original touch controller, responsive layouts, procedural gait, contact effects and opening-player implementation.

## Supplied film and model

The current opening was supplied as `Opening_Full_subtitled.mp4` and remuxed into `public/video/opening-subtitled.mp4` with faststart for progressive playback. Its burned-in subtitles, picture and audio are preserved without re-encoding. Its poster is extracted from the film. Footage/audio remain attributable to their respective creators; supply does not establish redistribution rights. This is not newly generated footage.

The pre-existing `sign_language_numbers_letters.h5` came from the user's earlier project. It runs on the Python service and is excluded from static packages. Training-data provenance, original class order and real-hand accuracy are unverified. See [model status](backend/MODEL_STATUS.md).

## ASL illustrations

A/B/C SVGs originate from WPClipart and were retrieved unchanged from Wikimedia Commons. Number 1/2/3 PNGs are lossless crops of the WPClipart chart reproduced in the University of California Agriculture and Natural Resources handout. The cited sources identify the artwork as public domain. Exact author/license evidence, URLs, crop rectangles and orientation notes are retained in [public/signs/PROVENANCE.md](public/signs/PROVENANCE.md).

Written guidance references ASL University's [alphabet](https://www.lifeprint.com/asl101/fingerspelling/abc.htm) and [numbers](https://www.lifeprint.com/asl101/pages-signs/n/numbers1-10.htm). These references do not validate the supplied classifier against ASL. The forms are not a universal vocabulary; no AI-generated hand illustration is used.

## External software and services

- [Three.js](https://github.com/mrdoob/three.js) — MIT.
- [TypeScript](https://github.com/microsoft/TypeScript) — Apache-2.0.
- [Vite](https://github.com/vitejs/vite) — MIT.
- [Google MediaPipe](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) — bundled Tasks Vision and Hand Landmarker; retain [asset provenance](public/mediapipe/ASSETS.md) and the included [license](public/mediapipe/LICENSE).
- **Barlow Condensed / Space Grotesk:** Google Fonts, SIL Open Font License; remote fonts have local system fallbacks.
- **FastAPI, Uvicorn, HTTPX, python-dotenv:** service dependencies; retain their distributed notices.
- **TensorFlow, Keras, NumPy:** optional model dependencies; retain their distributed notices.
- **Google Gemini:** optional server-side contextual hints. **Gradium:** optional speech matching readable captions.

Voodoo is identified in supplied hackathon material as an ecosystem/co-host partner. No Voodoo SDK is used or additional endorsement implied. Authored fallback does not demonstrate live partner API usage.
