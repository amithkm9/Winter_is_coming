# Winter is Coming — game design and complete player journey

This is the production design for the next version of the existing browser game. The current foundation is the playable 3D Louvre courtyard. Chapter 00, three-character selection and the chapter map are implemented and covered by automated state/component checks. Full browser walkthrough and visual acceptance remain required. Chapters 02–05 now have playable prototype environments and progression; their advanced production mechanics below remain future polish. See [TODO.md](../TODO.md) for remaining release gates.

## Player promise

Explore a city held in artificial winter, help its people, and restore places through movement, observation and meaningful interactions. Communication is a source of agency. The experience must be worth playing as an adventure, with satisfying discoveries and visible changes in the world. Practice supports an immediate gameplay goal; it never replaces the adventure with a lesson dashboard.

The protagonists are deaf, nonspeaking students with different interests and personalities. Their identities are not problems to cure. Restoring Paris means restoring its power, places and community—not giving a character hearing or speech. Dialogue, objectives and danger cues are fully understandable without audio.

## Three protagonists, equal access to the adventure

| Character | Personality and visual identity | Character-select presentation |
|---|---|---|
| **Noor** | Curious sketchbook explorer; amber scarf, teal accents; notices the city's small details | “Every place has a story. I want to draw ours.” Show sketchbook and an attentive idle pose. |
| **Elio** | Patient tinkerer; moss clothing, copper tools; wants to understand how things work | “One little repair can change a whole street.” Show a compact toolkit and relaxed, practical posture. |
| **Mira** | Reflective stargazer; plum clothing, ice-blue accents; notices patterns and possibilities | “Even in winter, there are things worth looking up for.” Show a star chart and a skyward glance. |

All three have identical movement, interactions and difficulty. Choice changes appearance, portrait, name and selected journal/dialogue flavor. Do not hide easier play or accessibility features behind a character. Selecting someone should feel expressive, not like selecting a combat statistic. Initial geometry/color variations are a prototype treatment; bespoke models, clothing and expressive animation are an art-production task.

## Title to campaign: the full journey

| Step | Main action and information | Exit and recovery |
|---|---|---|
| **Opening and title** | Supplied film with tap-to-start, pause, mute and skip; then a living 3D title, **Begin your story**, Continue and Settings | Film completion, skip or playback failure leads into the game. Replacing progress requires a clear reset action. |
| **Character selection** | Three large portraits/models, short personality line, selected-state outline and explicit **Choose** button | Keyboard focus works across all choices. Back returns to title; selected character persists after confirmation. |
| **Chapter map** | A connected six-chapter route; selected chapter has objective, setting, availability and primary action | **Play**, **Replay** and locked states are textual as well as visual. All six current chapters have implementations; missions unlock sequentially. |
| **Chapter 00 onboarding** | Safe courtyard simulation: move four metres, press **Enter** near the practice beacon, then rehearse fictional input **A** using keyboard or optional camera | **Skip training** records `tutorialSkipped`, unlocks Chapter 01 and leaves tutorial completion false. Replay remains available. |
| **Chapter 01 mission** | Short cinematic, spatial objective, three relays, drone routes, optional discoveries, central core | Pause, settings, practice, journal and return-to-map are reachable. A five-second escape countdown leads to an explicit Caught screen and checkpoint retry; completed relays remain saved. |
| **Reward** | Show the restored place first, then a concise completion panel with time, objectives and discoveries | **Explore restored sector**, **Replay** and **Chapter map**. The newly unlocked chapter is selected on the map. |
| **Next chapter** | Completion unlocks the next distinct sector, with separate mechanisms, geometry and saves | Chapters 02–05 are playable prototypes using the shared terminal framework. Their more advanced spatial mechanics remain production targets. |

Keep identity, chapter and objective visible at the appropriate moment. The HUD needs the current objective, nearby interaction, progress and danger state; it does not need every statistic at once. Use a prominent action and a quieter secondary action per decision panel. Use concise sentences instead of dense lore while the player is learning controls.

## The first five minutes

| Time | Player action | Required response |
|---|---|---|
| 0:00–0:30 | Start and choose Noor, Elio or Mira | Character preview visibly responds; confirmation transitions to the route map. |
| 0:30–0:50 | Choose **00 · The First Spark** | Explain “safe training simulation”; do not pretend the Louvre is already liberated. |
| 0:50–1:30 | Move at least four metres and look around the safe courtyard | One control hint at a time; visible progress feedback; no drone punishment. |
| 1:30–2:00 | Approach the practice beacon and press **Enter** | Frame the interaction, separate practice input from movement, and make its purpose obvious. |
| 2:00–3:00 | Rehearse fictional input **A** using keyboard or optional camera | Confirm the input, not linguistic correctness. A local ASL hand illustration is available; it does not verify the model or the player’s linguistic correctness. |
| 3:00–3:40 | Finish the three-step simulation and return to the chapter map | Show training completion and unlock the Louvre; keep replay optional and real mission progress untouched. |
| 3:40–5:00 | Enter **01 · The Louvre Relay**, observe a drone and reach the first relay | Apply the learned interaction in an actual spatial challenge. The next goal is visible; no long lesson interrupts play. |

These are pacing targets for first-time playtesting, not mandatory timers. If a player needs more time, the experience should remain calm and legible. The opening cinematic is skippable; reduced-motion mode offers a short stationary alternative.

## Six-chapter campaign

| Chapter | Setting and actual gameplay | New mechanic and payoff | Delivery state |
|---|---|---|---|
| **00 · The First Spark** | Safe onboarding in the existing courtyard: move four metres → **Enter** near the practice beacon → rehearse **A** | Learn navigation and fictional cipher input; completing all three steps earns training completion and unlocks the Louvre | Implemented with automated checks; full browser acceptance remains |
| **01 · The Louvre Relay** | Navigate the courtyard, avoid drone scan areas, bypass three terminals and reach the central core | Sequences `A`, `B → C`, `A → C → B`; **Enter** at the ready core; eight-second restoration; optional memory collectibles | Implemented with automated checks; full browser acceptance remains |
| **02 · Under the Ice** | Canal routes, sequential terminal mechanisms and restoration | Production target: moving bridge timing and persistent shortcuts | Playable prototype; advanced interaction planned |
| **03 · A Place to Grow** | Glasshouse routes, mechanisms, discoveries and restoration | Production target: spatial light-routing and growth that changes reachable paths | Playable prototype; advanced interaction planned |
| **04 · Beyond the Clouds** | Observatory routes, sequential mechanisms and completion | Production target: reflector alignment and constellation combinations across platforms | Playable prototype; advanced interaction planned |
| **05 · The Returning Dawn** | NEXUS spire mechanisms and final campaign restoration | Production target: a distinct multi-phase finale combining navigation and environmental strategy | Playable prototype; advanced interaction planned |

Chapter numbers are campaign order, not Paris arrondissement numbers. The revised six-chapter campaign replaces the earlier 16-sector presentation as the product plan. Each mission now has distinct geometry, route barriers and restoration effects; advanced navigation and spatial-puzzle features remain production targets.

## Interaction, practice and sign-language scope

Normal movement stays on normal controls. Strategic interactions change the world: a bridge moves, a shield blocks a hazard, a light reveals a route, or a relay restores local power. Later chapters should let the same learned interaction solve different problems. Avoid simply lengthening terminal sequences in every level.

The current keyboard A/B/C inputs are **fictional terminal ciphers**. Camera input from the legacy one-hand, six-label model is experimental, with unverified class order. Neither is evidence that a player has performed a real sign correctly. MediaPipe provides landmarks, not a complete language interpretation. Do not label confidence as sign accuracy or mastery.

The story describes students learning sign language in general. Current local reference illustrations explicitly depict ASL A/B/C/1/2/3; their provenance and orientation notes are in [public/signs/PROVENANCE.md](../public/signs/PROVENANCE.md). Study enlarges the image without danger. These references do not establish model compatibility, and there is no universal sign vocabulary. Keep fictional cipher mappings distinct from linguistic meanings; qualified review and labeled real-hand testing remain required.

Practice is player-initiated from a safe interaction. It explains the input mode, shows the current symbol and responds clearly to each attempt. The player can retry without penalties, return to the mission without losing progress, and use keyboard mode without a camera. Camera permission is requested only after an explicit camera action. No-hand or uncertain input waits; it does not automatically advance the puzzle.

## Visual, animation and sound hierarchy

| Meaning | World/HUD treatment | Matching optional audio |
|---|---|---|
| Objective or interactable | Amber edge light, diamond/icon and nearby verb | Soft terminal entry tone |
| Confirmed input | Short pulse from the actual device; progress segment fills | Brief chime |
| Completed connection | Energy follows a visible route; destination changes state | Warm relay chord |
| Danger | Red scan volume/outline, exposure meter and explicit warning | Bounded alarm cue |
| Discovery | Small gold sparkle with a recognizable collectible silhouette | Gentle sparkle cue |
| Restoration | Cold-to-warm light, reduced snow, relit windows and a camera reveal | Liberation swell with captions for narrative lines |

Color reinforces shape, text and motion; it never carries the only meaning. Reserve strong bloom, bright pulses and camera movement for meaningful events. A success should read at a glance without hiding the next objective. Reduced-motion mode removes shake, excessive drift and flashing effects. Sound and music have independent controls, adjustable volume and reliable pause behavior.

Production art should progress from functional geometry to authored characters, consistent material families, recognizable architecture, animation anticipation/reaction and deliberate lighting. A polished effect cannot compensate for unclear collision, stiff movement or missing attack/interaction feedback. Target stable frame pacing on the judging machine; profile before claiming a frame rate. Offer reduced effects and bounded particles rather than promising 60 FPS on every device.

The next character asset package should contain one consistent stylized body rig with three authored clothing/accessory sets, materials, portraits and readable silhouettes. Deliver versioned `.glb` assets with documented scale/origin, a neutral reference pose, locomotion clips (`idle`, `walk`, `run`, `turn`), interaction clips (`inspect`, `reach`, `terminal_confirm`), and response clips (`celebrate`, `recover`). Test foot placement, blending, hand/object alignment and accessories in the actual camera before replacing prototype geometry. Use in-place locomotion unless the controller explicitly supports root motion; do not let animation move the character through collision.

Teaching clips are a separate reviewed asset package. Obtain permission/provenance, identify the language and exact target meaning, retain face/torso and both hands when linguistically relevant, and have a qualified fluent reviewer check handshape, orientation, location, motion and nonmanual components. Preserve the approved timing and camera framing; do not substitute a celebratory hand animation for a verified sign. Match each approved clip to supported model labels and measured recognition tests before enabling educational success claims.

## Completion and trust

A chapter counts as complete only when a fresh player can enter, understand its goal, perform the required actions, reach a stable ending, save/continue and replay. Tutorial completion, `tutorialSkipped`, real mission completion and optional discoveries use separate state. Skipping unlocks the Louvre but does not grant training completion, rewards or a completion badge. Opening a locked chapter never grants completion.

Gemini contextual hints and Gradium speech remain optional to the core loop. Authored hints/captions preserve play when services fail, but fallback is not proof of successful partner use. Real provider credentials and successful requests are still required. Keep provider secrets server-side, and report experimental recognition honestly. See [MODEL_STATUS.md](../backend/MODEL_STATUS.md).
