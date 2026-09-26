# Current delivery — chapters 02–05 and mobile

- [x] Build Canal: sequential lock bridges, frozen water, timed warning zones and restoration.
- [x] Build Glasshouse: light circuits, growth gates, botanical restoration and seed archive.
- [x] Build Observatory: instruments, star sequences, signal barriers and route discovery.
- [x] Build Spire: combined six-input sequences, energy hazards and final dawn.
- [x] Connect sequential chapter unlocks, separate mission saves, Continue and next-chapter rewards.
- [x] Add touch movement, drag look, run/interact/view controls and six sign simulation buttons.
- [x] Adapt map, title, HUD, camera and terminal to portrait/landscape and safe areas.
- [x] Default mobile to reduced rendering cost and verify chapter resource disposal.
- [x] Verify gate reachability, full campaign progression, saves and touch cancellation.
- [x] Build itch.io package and document mobile/camera deployment requirements.
- [ ] Verify real Android/iOS devices and the deployed itch.io iframe (manual release check).

# LearnSign / Winter is Coming — build tracker

## Winter 3D preview

The current six-chapter plan and acceptance gates are in [BUILD_ROADMAP.md](docs/BUILD_ROADMAP.md); the complete player journey and art direction are in [GAME_DESIGN.md](docs/GAME_DESIGN.md).

- [x] Design the complete journey and six distinct chapter concepts.
- [x] Add three character profiles, original portrait assets and matching 3D appearances.
- [x] Implement character selection and a chapter route map.
- [x] Implement safe onboarding: movement, beacon interaction, input rehearsal.
- [x] Keep tutorial skips distinct from completion and preserve existing mission saves.
- [x] Connect pause/victory screens back to the chapter map.
- [x] Add in-game How to play and a plain-language player-flow guide.
- [x] Add persistent third-person / eye-level view switch (V and HUD button).
- [x] Add terminal camera launch, required-sign status and recognition reset between interactions.
- [x] Bundle hand-tracking assets for local loading.
- [x] Verify model warmup and inference through the running game proxy; test camera events advancing a relay.
- [ ] Validate all six model labels with real hand gestures and confirm physical-camera usability in both views.
- [x] Make movement camera-relative and facing follow actual collision-resolved travel.
- [x] Add articulated gait, ground contact, synchronized footsteps and bounded snow/footprint effects.
- [ ] Validate walking, running and tight turns visually in a live browser on the demo machine.
- [ ] Verify the complete UI journey and three characters in a hardware-rendered browser.
- [x] Build Chapter 02’s canal environment and persistent sign-activated bridges.
- [x] Build first playable versions of Chapters 03–05 with distinct environments, route gates and endings.
- [ ] Expand production mechanics with manual light routing, vertical traversal and a combat finale.

- [x] Review the supplied plan; document a stronger spatial gameplay loop and story logic.
- [x] Preserve the forest chapter and add a separate Three.js browser entry.
- [x] Build the Louvre courtyard, glass pyramid, palace wings, relay terminals and drones.
- [x] Add opening camera shots, animated courier, snow, shadows, bloom and film grading.
- [x] Implement movement, collision, scanner exposure, three cipher relays and save/resume.
- [x] Add the core liberation sequence, warm lighting, victory and replay.
- [x] Reuse optional Gemini/Gradium/camera adapters with honest availability labels.
- [x] Validate mission rules with automated tests.
- [x] Introduce Noor, a deaf, nonspeaking student, in the story and notebook.
- [x] Add safe relay rehearsal with gentle retries and explicit keyboard/model feedback.
- [x] Add five optional memory sparks, saved journal pages and a golden scarf reward.
- [x] Add original footsteps, ambient wind/music, gesture feedback, warnings and liberation sounds.
- [x] Add volume/music controls, visible sound counterparts, pause/mute lifecycle tests.
- [ ] Complete hardware-rendered browser playthrough and measure frame rate.
- [ ] Replace procedural character motion with authored skeletal animation for higher visual fidelity.
- [ ] Add detailed materials, authored environment assets and verify the sound mix by listening in browser.
- [ ] Add verified sign demonstrations after confirming actual model labels and suitable source examples.
- [ ] Verify live partner calls and camera input before claiming integration success.

## LearnSign forest chapter

- [x] Agree on web game direction: Phaser + TypeScript, Python recognition, Gemini + Gradium.
- [x] Inspect existing model configuration and recognition code.
- [x] Split work between gameplay, art/animation, AI service, and integration.
- [x] Create the playable forest: movement, combat, checkpoints, three powers.
- [x] Create illustrated scenery, animated hero/enemies, and magical effects.
- [x] Add cinematic opening, menu, accessible HUD, dialogue, and settings.
- [x] Add the forest puzzle, Guardian boss, chapter ending, and save/continue.
- [x] Implement Gemini hints and Gradium narration with explicit offline fallbacks.
- [x] Connect optional webcam landmark client to the supplied model service; real webcam validation remains below.
- [x] Verify production build, headless Phaser core flow, save behavior, and API failure handling.
- [x] Render and inspect artwork previews; fix frame bleed and title glow rendering.
- [x] Load the actual archived H5 model and test numerical inference without modifying it.
- [x] Package the free itch.io build and write setup/submission documentation.
- [ ] Complete actual browser visual/keyboard playthrough (no connected browser available in this session).
- [ ] Test camera permission and input in a real browser and the published itch.io embed.
- [ ] Verify actual Gemini/Gradium calls using configured credentials.
- [ ] Verify model labels and ISL accuracy using known examples.
- [ ] Publish public GitHub repository and itch.io release.

The first release is the forest chapter. The other three worlds remain planned.
Partner credentials, validated sign demonstrations, model label verification, and
publication account access may require user input; local game work continues independently.

## Verified in this build

- Client state/input and backend API tests passed; see command output for current counts.
- Actual Phaser HEADLESS runtime smoke passed scene creation, textures, ground collision,
  movement, pause, Q slow gravity, shrine unlocks, gates, watcher puzzle, boss reflection
  and ending, enemy reward deduplication, save/continue, and restart.
- Headless encounters use direct positioning for setup; this is not a full player-route test.
- Actual H5 loads and produces six finite probabilities. Synthetic inputs do not measure accuracy.
- Static itch.io packages include browser files only, with root index.html; backend credentials and model weights are excluded.
- Local preview: http://127.0.0.1:5173/ ; local backend: http://127.0.0.1:8100/ .
- Live Gemini hint request returned an authored fallback. A direct provider check returned HTTP 401 UNAUTHENTICATED; a valid Gemini credential is needed.
- Gradium key is not configured. Voice integration is implemented but not live-tested.
