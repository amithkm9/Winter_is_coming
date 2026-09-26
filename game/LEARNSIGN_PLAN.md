# LearnSign: The Lost Signs — proposed build plan

Status: initial Unity design retained for reference, September 26, 2026. The user subsequently chose a browser game and authorized parallel implementation. The current build uses Phaser + TypeScript with the same adventure concept and Python model service. See README.md and TODO.md for the implemented forest chapter, validation results, and remaining release work. Unity-specific instructions below describe the earlier proposal, not the current project.

## Product direction

A colorful Unity 2D action-adventure in which Indian Sign Language (ISL) gestures activate the Sign Gauntlet. Running, jumping, exploration, combat, secrets, and a boss are the core experience. Signs unlock useful powers through discovery and immediate use. There are no quiz screens or lesson progression gates.

The user's full four-world concept remains the longer-term vision. The proposed hackathon release is a complete, replayable forest chapter with an ending, not a promise to finish four worlds today. Confirm this scope during discussion.

## Requirements supplied in the screenshots

- Submit by 19:00; team maximum five people.
- Use at least two listed partner technologies.
- Create the project at the hackathon; boilerplates are allowed.
- Publish the game for free on itch.io.
- Publish full source on GitHub, with setup, installation, API/tool documentation, and enough technical detail for jury evaluation.
- Judging: performance, execution quality, novelty, and stickiness.
- Finalists receive five minutes to present.

Google DeepMind, Gradium, and Cognition are listed as technology partners. Voodoo is listed separately as an ecosystem/VC partner. The planned two technical integrations are Gemini and Gradium; do not count Voodoo branding or MediaPipe as a second technology partner.

## Two meaningful partner integrations

### Google DeepMind / Gemini: the Gauntlet companion

An in-world companion provides short, context-aware clues when the player requests help. The request includes an authored encounter ID, unlocked powers, completed objectives, and recent failed attempts. It contains no camera image or personal profile.

Example: the player repeatedly attacks the Guardian during its protected phase. The companion hints that its glowing projectile can be reflected. Subsequent hints can identify Shield explicitly. This is contextual assistance during adventure gameplay, not a chatbot screen.

The server supplies an approved fact sheet for each encounter. Gemini returns a short line and an allowlisted focus target. Validate outputs and fall back to authored hints when unavailable. Gemini cannot grant powers, change save data, judge sign accuracy, or invent ISL instructions. Calls happen on interaction, outside the physics loop.

### Gradium: optional character voice

Synthesize the companion's lines through Gradium text-to-speech. Also use it for short story dialogue. Every spoken line appears as captions; playing with sound off preserves the entire experience. Voice is an optional companion feature, not an audio-only puzzle or a substitute for signing.

Cache repeated lines and retain authored captions if the service fails. Document and demonstrate actual successful Gemini and Gradium calls before claiming both integrations work. Keys remain in server environment variables, never in Unity assets, Web builds, or the public repository.

### Cognition

Optional development-tool use if the team has access and wants to enter its side challenge. Not a dependency for the game, and no third integration is necessary for the two-partner minimum shown.

## Proposed hackathon chapter: Whispering Forest

Target playtime: 8–12 minutes for a first run, with a shorter route for the presentation.

1. **Opening clearing:** a short skippable story introduces stolen crystals and the Gauntlet. Learn movement, jumping, dash, and a basic attack by exploring.
2. **Force shrine:** discover A / Force. Move a boulder, reveal a passage, and use the power on an enemy. Include an optional hidden chest.
3. **Falling ruins:** discover B / Shield. Traverse a telegraphed hazard and protect a small forest creature.
4. **Ancient grove:** discover C / Reveal/Interact. Activate machinery and solve the authored A → C → B statue sequence. A wrong sequence resets without major punishment.
5. **Guardian arena:** dodge normal attacks; B reflects a clearly telegraphed projectile; A exploits the resulting opening. Finish with a short A → B → C sequence and recover one crystal.
6. **Chapter ending:** the forest lights return. Show rewards and completion time, save progress, and offer replay or continued exploration. Tease the island without pretending it is playable.

Include two ordinary enemy behaviors, one small optional NPC quest, checkpoints, coins, three hidden stars, one cosmetic reward, and a replay timer. The same powers serve exploration, puzzles, and combat.

The mock input layer supports A, B, C, 1, 2, and 3 from the start. The forest chapter only grants A/B/C; number powers and the island are later content. Development tools must not silently unlock unearned abilities in normal play.

Defer additional worlds, an extensive shop, broad quest systems, gauntlet tiers, numerous achievements, every post-game mode, and the final Silencer encounter. These are content expansions after the first chapter works.

## Controls and the two-handed interaction problem

The brief maps A both to moving left and to simulating Sign A. Resolve this explicitly:

| Action | Proposed first-build control |
| --- | --- |
| Move | Left/right arrows |
| Jump | Space |
| Dash | Shift |
| Basic attack | J |
| Interact | E |
| Enter/exit casting focus | Tap Q; do not require holding it |
| Simulated gestures | A, B, C, 1, 2, 3 in mock mode |
| Pause/back | Escape |

Real signs can require both hands, so the player needs to release the keyboard or controller. Casting focus briefly slows world action, frames the character, and brings up the hand guide. Use real elapsed time for recognition and debounce; scaled game time is unsuitable here. Confirmation or cancellation exits focus. Tune the duration with real users and make the timing forgiving.

Shrines and required sign interactions have safe standing space. Boss gesture windows are generously telegraphed; never require an instantaneous webcam response while simultaneously holding movement keys. Mock mode remains a fully playable accessibility/demo option, clearly identified. Controller support can follow after keyboard input and export work.

## ISL content and model compatibility

ISL is explicitly Indian Sign Language. Do not substitute ASL alphabet images or a generic gesture recognizer and call it ISL. A → Force and B → Shield are fictional game bindings, not translations.

Use verified ISL demonstrations and permissioned/original recordings for the selected signs. Source references should be retained. Do not generate hand-position teaching images and treat them as authoritative. Review the six selected labels against the actual model and intended ISL variants before enabling webcam play.

The user supplied an existing model path. Its saved HDF5 model configuration has now been inspected without executing the model:

- Path: `/Users/amithkm/iCloud Drive (Archive)/Desktop/LearnSign_pro_/ai-service/app/models/sign_language_numbers_letters.h5`.
- File size: 5,150,360 bytes; HDF5 signature present.
- Input shape: `(batch, 30, 63)`.
- Recurrent layers: bidirectional LSTM with 64 units, bidirectional LSTM with 128 units, then LSTM with 64 units, plus normalization/dropout and dense layers.
- Output: six-way softmax.
- Adjacent `app/recognition.py` maps outputs to `one, two, three, a, b, c`, but explicitly states the original label pickle was missing. This mapping is an existing code assumption, not recovered training metadata.
- Existing inference extracts a single hand, centers coordinates on the wrist, divides by the largest absolute centered coordinate, and flattens to 63 values. It pads short sequences by repeating the last detected frame, truncates long ones, and drops frames with no detected hand. Those choices require validation against training and continuous gameplay.
- No training notebook/script or label pickle was found in the supplied project tree. No inference or accuracy testing has been performed.
- Existing requirements pin TensorFlow 2.16.2, Keras compatibility, and MediaPipe 0.10.14 and specify Python 3.12 or older. The current default Python is 3.14.6, so this stack needs a separate compatible environment.

Remaining inputs to inspect or verify:

- Model artifact (.keras/.h5/SavedModel), model architecture, and TensorFlow/Keras versions.
- Label order, including any neutral/unknown class.
- Exact landmark extraction, normalization, handedness ordering, mirroring, and missing-hand handling.
- Training sequence length, sampling cadence, and representative clips or recorded feature fixtures for each label.
- Provenance and reuse permissions for any existing model and demonstration assets.

21 landmarks × 3 coordinates = 63 features for one hand. Two hands would produce 126 raw coordinate features before any other encoding. Indian fingerspelling includes two-handed forms. Inspect the existing model before choosing a representation: a 63-feature model cannot simply receive 126 features without changing and retraining it. Matching dimensions alone is insufficient; training preprocessing must match inference.

If the model is absent or does not recognize the selected ISL signs reliably, finish the adventure in mock mode and report webcam support as unfinished. Do not display fabricated confidence or claim mock success proves recognition accuracy.

## Architecture

```text
Mock keyboard provider ─────────────────────────────────────┐
                                                          v
Camera → MediaPipe → trained preprocessing → BiLSTM → GestureManager
                                                          |
                                stable confirmation / cooldown / release
                                                          |
                                                AbilityController
                                                          |
                       shrine / enemy / chest / puzzle / boss / mechanism

Unity companion interaction → FastAPI → Gemini → validated caption
                                          └──→ Gradium → optional audio
```

GestureManager emits a normalized event with label, source, timestamp, and optional model confidence. Mock events have no model confidence. Apply thresholds validated against real clips, temporal smoothing, no-hand resets, and release-to-rearm so one held sign does not fire repeatedly. Clear old sequences on reconnect, focus changes, or missing input. One confirmation advances at most one puzzle step.

AbilityController checks unlock state, casting state, cooldown, range, and target priority. Avoid a global event accidentally opening every C chest in a scene. Input providers can be swapped without rewriting game objects.

Use ScriptableObjects for power definitions and encounter facts; keep physics and progress deterministic. Save a versioned data structure containing checkpoint, unlocks, collectible IDs, completed quest/boss IDs, coins, cosmetics, settings, and best runs. Validate saves, recover gracefully, and ensure restarting a checkpoint cannot duplicate unique rewards.

## Unity and distribution

Preferred baseline: Unity 6.3 LTS, C#, 2D renderer, and an early export test. No Unity installation was found in the standard Applications folders during planning. Confirm a custom installation or install Unity Hub, the editor, and the relevant build module before committing to delivery timing.

itch.io accepts a browser build or a downloadable game. Browser play is convenient for judges, but Web export adds a camera/JavaScript bridge and requires a hosted HTTPS inference service if Python remains in the runtime path.

For a Web build: browser camera → browser MediaPipe → feature windows sent to hosted FastAPI → model inference → browser/Unity message bridge. This keeps raw images local, but landmark sequences leave the device. Match training preprocessing exactly and test camera permissions in the actual itch.io embed. Host partner API keys only on the backend. Configure the actual game origin for CORS. A local Python webcam process does not become available to remote players just because the Unity game is uploaded.

For a desktop development/demo build: a local Python process can own the webcam and publish confirmed gesture events to Unity. Distributing that Python/model runtime adds packaging work. A downloadable mock-mode build remains a valid playable format, but it must not be represented as a completed webcam release.

Choose and smoke-test the release path early. Avoid building both complete deployment paths during the hackathon. A public model/API service needs bounded request sizes, timeouts, concurrency limits, and rate limits before enabling open access.

## Implementation order and completion gates

1. **Setup and export:** confirm Unity availability; create the new project; make a tiny exported build run. Check model artifacts and provider account access. Do this before art production.
2. **Playable core:** movement, jump, dash, camera, attack, collision, damage, death/respawn, and one enemy. Judge game feel with placeholder art.
3. **Power loop:** mock provider, GestureManager, three powers, shrines, boulder, shield hazard, chest, and sequence puzzle. Complete the route entirely in mock mode.
4. **Chapter:** Guardian, crystal reward, checkpoint/save/continue, secrets, replay, skippable opening, ending, and settings. Complete a fresh run and a resumed run.
5. **Partners:** connect and test context-aware Gemini hints and captioned Gradium voice. Test unavailable-service fallbacks and prove credentials are not in the client bundle.
6. **Recognition:** only once artifacts and preprocessing are verified, connect the trained model and test each supported sign, neutral poses, incorrect signs, left/right handling, occlusion, and recovery. Keep mock mode intact.
7. **Polish and delivery:** coherent cartoon art, animation, power effects, audio/captions, performance checks, export, README, API/architecture notes, licenses, and five-minute demo script.

Reserve the final hour before 19:00 for testing, uploads, public-repository checks, and submission. If the schedule slips, remove optional content first. Do not sacrifice a working ending or export to start another world.

## Definition of done for the hackathon chapter

- New Game → forest exploration → three discoveries → puzzle → Guardian → reward → ending all work without editor intervention.
- Mock mode can complete everything and is explicitly labeled.
- Save/Continue restores progress; death does not lose unlocks or duplicate rewards.
- Gemini and Gradium each have a verified successful integration; offline/error cases retain readable authored dialogue.
- Webcam claims reflect measured behavior of the supplied ISL model; unavailable recognition does not masquerade as success.
- Playable free itch.io release; fresh-device/download or browser smoke test.
- Public source, build/setup instructions, model requirements, secret-free configuration example, credits, and known limitations.
- Demo shows movement, a sign power used in the world, one partner-powered companion interaction, a boss mechanic, and the recovered crystal.

## Items for discussion before implementation

1. Accept the forest chapter as today's deliverable, with the remaining worlds as the roadmap?
2. Can the existing model's label order and selected ISL gestures be verified with known example clips? The model and inference code are present; training provenance is still unresolved.
3. The user confirmed Unity is not installed. Install Unity Hub and an Apple Silicon Unity 6.3 LTS editor with Web Build Support; complete account/license setup in Hub. Then smoke-test the selected release format.
4. Are Gemini and Gradium credits activated? Keep actual API keys out of chat and source control.
5. The pasted brief ends at “Signs should”; incorporate the remaining art-direction text when supplied.

## Technical references checked

- [Unity 6 release support](https://unity.com/releases/unity-6/support)
- [Unity Web networking](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-networking.html)
- [itch.io HTML5 publishing](https://itch.io/docs/creators/html5)
- [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [Gemini generateContent API](https://ai.google.dev/api/generate-content)
- [Gradium REST text-to-speech](https://docs.gradium.ai/guides/text-to-speech-rest)
- [ISLRTC](https://islrtc.nic.in/) and [RCI teaching material discussing the two-handed manual alphabet](https://rehabcouncil.nic.in/sites/default/files/2023-05/DISLI%20T2.pdf)
