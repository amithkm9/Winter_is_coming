# Winter is Coming — cinematic playable direction

## Current student adventure direction

The protagonist is now **Noor**, a deaf, nonspeaking student learning sign language. The game uses the general wording requested by the user. This does not imply a universal sign vocabulary: prototype A/B/C inputs remain fictional ciphers until training labels and real demonstrations are verified.

The first mission combines spatial exploration with a safe rehearsal choice at each relay, gentle retry feedback, three progressively longer input sequences, five optional notebook memories, and a golden explorer scarf reward. Practice disables scanner danger and keeps rehearsal progress after mistakes; it cannot restore a mission relay. The real relay interaction remains a separate player choice. Captions, scanner warnings and visual feedback carry every necessary cue.

Procedural sound now covers wind, optional ambient music, footsteps, terminal and input chimes, collectible sparkle, scanner warnings, relay chords and liberation. Volume is adjustable; pause, hidden-page and mute transitions cancel sounds. No sound API or external audio asset is needed. This is designed to support curiosity and satisfaction without daily streak penalties or compulsory collection. Retention claims need real student playtesting; this implementation does not establish that players will stay longer.

Still required for the educational promise: verified demonstration clips or animations, validated model label mappings, and tests with actual learner gestures. Current practice is clearly input rehearsal rather than sign-language correctness assessment.

This document reviews the supplied `/Users/amithkm/Downloads/PLAN.md` and turns it into a bounded first playable. The supplied file remains untouched. This is the design and implementation direction; individual features count as delivered only when present and tested in the build. The existing LearnSign adventure stays separate. The new entry point is `winter.html`.

The current implemented 3D preview uses that separate `winter.html` entry point: a ten-second three-shot real-time introduction (three seconds with reduced motion), three relay stations, drone scan hazards, and an eight-second liberation transition. The relays use authored sequences `A`, `B → C`, and `A → C → B`. After all three are bypassed, **E** near the central core triggers liberation directly. These are fictional resistance ciphers, not true LSF instruction or verified sign-language recognition.

## The experience we are building

You are a resistance courier entering a frozen Louvre courtyard. NEXUS has diverted the district's energy into its machine infrastructure. Drones patrol the square. Three local relays isolate the central power core. Move between cover, read the drones' scan paths, reach each relay, enter its short optical cipher, and restore the core. The courtyard changes from hostile blue to living amber as electricity returns.

The fantasy is **taking a place back through your own actions**. The successful loop is:

> Observe patrol → choose a route → move through the environment → reach a station → bypass its cipher → see the world respond → reach the core.

This needs movement, spatial risk and an environmental payoff. A district map followed by a repeated hand-pose card would lose that fantasy. The map can become a campaign layer later; it should not replace the first playable environment.

## Story logic that supports gameplay

NEXUS controls public networks and much of the surveillance grid, not every possible human communication channel. The resistance uses short-range optical terminals in shielded maintenance areas and network blind spots. An on-site courier must physically reach a terminal; its disconnected local override cannot be sent remotely. Drone patrols make that journey dangerous.

Hand movements are visible to cameras. They are not intrinsically encrypted or invisible to an AI. The advantage is the **local, isolated connection and a changing cipher**, not a claim that machines cannot understand sign languages. This also explains why ordinary keyboard mock input is a valid simulation of the terminal without making it the story's literal hardware.

The artificial winter is speculative fiction: energy diversion and failing district heating define the local stakes. Keep the backstory brief. The player understands the problem by seeing dead lights, ice, scanning drones and trapped power, then restoring warmth.

Suggested opening captions:

1. “Paris lost its warmth when NEXUS took the grid.”
2. “Three relays hold the Louvre in lockdown.”
3. “Reach the local terminals. Bring the power back.”

The handler may speak through the player's private headset. Matching captions carry all mission information. Cloud-generated speech is an optional presentation layer, not a claim that an intercepted public radio suddenly became safe.

## Ten-second opening, rendered in the actual world

| Time | Camera and composition | Motion and story information |
|---|---|---|
| 0–3.5 seconds | High oblique view looking into the courtyard and recognizable glass pyramid | Snow crosses the foreground; cold fog separates the architecture. Establish Paris and isolation. |
| 3.5–6.5 seconds | Low lateral move across the courtyard toward the pyramid | Put the relay and drone threat into the same environment. |
| 6.5–10 seconds | Ease behind the player toward the pyramid and central core | Finish the caption, then hand the same camera over to gameplay. |

The implemented introduction can be skipped, and its reduced-motion version uses a stationary three-second view. There is no long black-screen wait for voice, empty video element, or MP4 placeholder. The shots use the same Three.js scene, lights, architecture and drones as gameplay, so the handoff is continuous. Composition and environmental detail remain art-direction targets to refine through playtesting.

## Visual and animation direction

Aim for a coherent real-time 3D scene with readable silhouettes before adding more content. The Louvre pyramid and surrounding courtyard establish identity. Architectural proportions, foreground-to-background layering and controlled lighting matter more than filling the screen with neon.

Use physically based materials: rough cold stone, darker wet paving, metal relay housings, and restrained reflective or transparent glass on the pyramid. The material response must agree with the light sources. Snow, low fog, directional moonlight and emissive relay details provide depth. Local shadows ground the player and drones. Selective bloom gives the core and relay lights presence without washing out their outlines or mission text.

Animation should communicate state:

- The courier leans or turns into movement; a light idle motion keeps the character alive when stopped.
- Drone bodies bank into their patrol and their visible scan cones make danger predictable.
- A relay has distinct dormant, interacting, bypassed and powered states; light and sound changes confirm input.
- A cipher step produces a brief local pulse; a full bypass sends energy toward the central core.
- The final interaction triggers a visible energy surge and a cold-to-warm lighting transition across the courtyard.

The implemented liberation runs for **eight seconds inside the world**: lighting and fog move from cold to warm, a pulse expands from the core, snow fades, and the camera reveals the reclaimed space. Window lighting, relay emissive states and the sound bed support the direction. A “Sector liberated” overlay confirms what the player has already seen. It should not be the only reward.

Performance is an adjustable target. Start with capped device pixel ratio, a bounded snow particle count, few shadow-casting lights, and limited transparent layers. Offer lower effects quality before sacrificing controls or readability. Measure frame times on the demo machine; do not promise 60 FPS for all browsers, GPUs or simultaneous webcam workloads. Reduce motion and keep drone threats readable without sound.

## First playable scope

The deliverable is **one Louvre sector**, with a short cinematic, movement through a real 3D courtyard, three relay interactions, patrolling drones with visible scan cones, an unlockable central core, and a liberation payoff. Relay sequences are authored game data. Interaction begins with **E** near the station; **A/B/C** enter the displayed cipher. After all relays, **E** at the central core starts liberation without another cipher. The interface explains these as terminal symbols.

Completion means the player can start, understand the objective, navigate, complete the relays, activate the core, see victory, and replay. Failure should reset a local attempt or safely reposition the player rather than require a long cinematic restart. The actual checkpoint and penalty rules must be reflected consistently in the game and hint text.

Other landmarks, 16 resistance sectors, multiple difficulty tiers, citizens, the catacomb hub, multi-stage bosses and a campaign finale are roadmap material. Future sectors should add meaningful stealth or environmental mechanics, not merely longer sign sequences.

## Corrections to the supplied plan

| Original assumption | Build decision and reason |
|---|---|
| “16 arrondissements” | Paris has **20 arrondissements**. A game may select 16 fictional resistance sectors, but sector numbers must not masquerade as administrative arrondissement numbers. [City of Paris boundary dataset](https://opendata.paris.fr/explore/dataset/arrondissements/). |
| Montmartre as arrondissement 16 | Montmartre is associated with the **18th arrondissement**. A mission can be campaign sector 16 while retaining the correct geographical label. [City of Paris Montmartre information](https://www.paris.fr/pages/la-butte-montmartre-prepare-sa-pietonnisation-30068). |
| Signs are unreadable to optical surveillance | Explain the shielded local terminal and isolated network segment; cameras can observe hands. |
| Universal signs / LSF words from the existing model | Use fictional cipher labels. No universal language is implied, and this model has not been validated for French Sign Language. Real LSF content requires verified demonstrations and suitable models/data. |
| MediaPipe “verifies signs” | MediaPipe hand landmarks describe hand geometry. A separate classifier and temporal logic are needed for any supported symbol, and recognition confidence is not measured accuracy. |
| Constant raw webcam streaming to Python | Keep camera capture and landmark extraction in the browser when enabled; send only bounded coordinate sequences to the optional recognition service. |
| Guaranteed 60 FPS recognition | Rendering rate, landmark tracking rate and sequence classification latency are separate measurements. Profile each. |
| “100% offline uptime” | The bundled keyboard game can run without cloud requests once served locally. Gemini, Gradium and a remotely hosted recognition service require a connection. CDN model/WASM assets are not offline until explicitly bundled and tested. |
| Four difficulty tiers and all sectors immediately | Finish one well-paced, visually distinctive level and preserve an extensible state structure. |

## Architecture and partner responsibilities

```text
Vite + TypeScript
  └─ Three.js world, camera, lighting, animation and controls
       ├─ Local authoritative mission state
       │    three relays → central core → liberation
       ├─ Keyboard A/B/C → cipher input events
       ├─ Optional webcam → browser landmarks → FastAPI /api/recognize
       │    legacy classifier → unverified candidate → temporal gate
       └─ Mission context → FastAPI /api/hint → Gemini or authored fallback
                                  └─ /api/voice → Gradium WAV or captions only
```

The browser owns movement, patrols, timers, collision and objective transitions. Network timing must not block those systems. Authored relay data determines valid ciphers; Gemini supplies grounded wording only, never executable mechanics, unvalidated hand instructions, or changing answers to an active puzzle.

The existing hint request contract remains `{ encounter, unlocked, attempts }`. Winter encounter IDs are `winter-arrival`, `winter-relay`, `winter-drone`, `winter-core` and `winter-liberated`. Their authored facts use the actual mission vocabulary and explain that A/B/C are game ciphers. `unlocked` remains compatible with the existing API; winter hints do not require LearnSign power unlocks.

When Gemini is configured successfully, Winter hints use **Maëlle**, a calm resistance radio guide in frozen Paris, with practical and reassuring language. The separate forest game keeps **Luma**, its magical companion. Both prompts are restricted to the supplied authored encounter facts; neither character teaches or invents sign-language gestures.

Google Gemini provides the resistance handler's contextual hint wording. Gradium provides optional speech with the same text available as captions. Those are the two intended partner integrations. Voodoo's role in the supplied hackathon material is a partner/co-host context, not an assumed runtime engine. MediaPipe availability alone does not establish compliance with the two-partner usage requirement.

**Current live integration limits:** the prior credential test received Gemini HTTP 401 / UNAUTHENTICATED. Gradium has no configured key. Authored hints and captions keep the level playable but do not count as demonstrated use of those partner APIs. Valid credentials and successful requests remain required before claiming both integrations work. Never place API keys in Vite client variables or public source.

## Existing model: useful experiment, limited claim

The existing one-hand H5 model loads successfully and outputs six scores. Its assumed label order is `[1, 2, 3, A, B, C]`; the original label file is absent. This establishes only technical compatibility. It does not establish LSF, ISL, arbitrary words such as FREEDOM, or linguistic correctness. See [the model inspection report](../backend/MODEL_STATUS.md).

If connected to Winter, present it as **experimental camera cipher input**. Every result remains `verified: false`; the player can use the keyboard instead. No educational mastery score or percentage “sign accuracy” should be inferred from its confidence. Two-handed and moving linguistic signs need an appropriate data and recognition pipeline beyond this legacy input shape.

## Acceptance checks before presenting

- Complete the Louvre mission from a fresh state using the normal controls; confirm three distinct relay states and a locked-until-ready core.
- Verify drone cones communicate danger, collision agrees with visible geometry, and the player can recover from detection.
- Confirm the cinematic skips cleanly and gameplay input begins at the camera handoff.
- Trigger liberation and confirm the world changes, the win state is stable, and replay resets the appropriate state.
- Test captions, reduced motion, keyboard-only input, cloud failures and missing camera permission without blocking the mission.
- Record actual frame timing on the judging machine with the chosen effects settings.
- Test a production build on the published host; test iframe camera permission separately if camera input is enabled.
- Configure and demonstrate real Gemini and Gradium requests before presenting them as completed partner usage.

The strongest demo sequence is one uninterrupted journey: cinematic arrival, route around a drone, bypass a relay, finish the core, then show the courtyard warming. Explain the vision experiments and larger Paris campaign after showing a game that already works.
