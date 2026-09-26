# Winter is Coming — executable build roadmap

Status key: **Existing** = implemented foundation, still subject to regression checks; **This pass** = implemented in this iteration, with automated checks passed and browser acceptance still pending; **Planned** = no playable claim. A checkbox means acceptance is verified, not merely that code or a design exists. This checklist deliberately leaves unverified items open.

## P0 — a complete first session

| Work item | State / dependency | Acceptance gate |
|---|---|---|
| 3D Louvre mission | **Existing** | Fresh playthrough bypasses three distinct relays, avoids or recovers from scans, activates the core and reaches a stable victory. |
| Character selection: Noor, Elio, Mira | **This pass**; shared avatar/progress contract | All three choices render distinguishably, use the correct name/portrait, persist after reload and retain identical abilities. Back/cancel never changes confirmed selection. |
| Six-chapter map | **This pass**; character selection and chapter metadata | Chapters 00/01 route to their real implementations. Chapters 02–05 visibly say **In development** and cannot start. No residual 16-sector completion claim remains in the main journey. |
| Chapter 00 safe simulation | **This pass**; chapter state isolated from real mission | Move four metres → **E** near practice beacon → rehearse **A** using keyboard or optional camera. No drone penalty or claimed verified signed demonstration; completion does not liberate Chapter 01 or alter collectibles. |
| Title → choice → map → training → mission | **This pass**; all above | One fresh playthrough follows the complete path using normal UI controls. Continue restores the correct chapter and character. |
| Training skip and replay | **This pass**; separate completion flags | Skip records `tutorialSkipped`, unlocks the Louvre and leaves tutorial completion false. Replay can later earn genuine training completion without overwriting mission progress. |
| Contextual practice | **Existing**; recheck both chapters | Practice opens only in an appropriate state, pauses unsafe interaction, explains keyboard/experimental camera mode and returns cleanly without changing real mission progress. |
| Reward and next-chapter flow | **This pass**; valid mission completion | Victory offers restored-world exploration, replay and map. Planned Chapter 02 stays nonplayable; it is never a relabeled Louvre copy. |
| Saves and migrations | **This pass**; final state schema | Existing Louvre saves load or fail safely with a clear recovery path. Character, tutorial and mission progress remain separate; invalid data cannot unlock chapters. |

P0 proof to retain:

- [ ] Record a fresh first-session walkthrough, including all navigation transitions.
- [ ] Test each protagonist through entry, HUD, journal, reward and Continue.
- [ ] Complete Chapter 00; verify Chapter 01 still begins as an uncompleted mission.
- [ ] Skip Chapter 00; verify `tutorialSkipped` survives reload, the Louvre unlocks, and no fake tutorial completion badge, reward or statistic appears.
- [ ] Reload after one relay, after tutorial completion and after victory; verify the right state resumes.
- [ ] Click and keyboard-focus every planned node; verify no empty level launches.

## P1 — feel, accessibility and polish

| Work item | State / dependency | Acceptance gate |
|---|---|---|
| Movement and interaction framing | **Existing**, refine after P0 | Controls match the visible prompt; cipher A/B/C input cannot accidentally move the player; collisions agree with visible geometry. |
| Danger and recovery | **Existing** | Scan warning is visually legible with sound muted; detection preserves completed relays and discoveries; respawn is safe and understandable. |
| Sound design | **Existing** procedural system | Footsteps require movement, music can be muted separately, alarms do not spam, and pause/title/hidden tabs stop all pending audio. Gesture resume restores the chosen volume. |
| Effects hierarchy | **Existing** foundation, refine | Input, full relay success and final restoration have visibly different intensity. Bloom never hides prompts; action does not depend on color alone. |
| Cinematic and reduced motion | **Existing** | Intro skips cleanly, reduced motion avoids unnecessary camera motion, and pause/focus changes cannot strand the player between cinematic and gameplay. |
| UI typography and focus | **This pass** | Title, map and dialogue have readable contrast; controls support visible keyboard focus; small windows do not crop primary actions or required text. |
| Authored character/art production | **Planned** after playable flow | Consistent character silhouettes and expressive animations replace prototype geometry; asset provenance is recorded; gameplay readability remains intact. |

Next art-production delivery sequence:

1. Approve front/side character sheets and common proportions for Noor, Elio and Mira; review identity and age presentation before modeling.
2. Deliver one deformable body/hand rig and three clothing/accessory variants as versioned `.glb` files, with scale, origin, reference pose and material/texture budgets documented.
3. Produce named idle/walk/run/turn, inspect/reach/terminal-confirm and celebrate/recover clips. Validate blend transitions, foot sliding, clothing intersections and hand placement in the actual game camera.
4. Replace prototype geometry behind the same gameplay controller; confirm character selection, saved identity, collision, shadows and reduced-effects performance before removing the fallback.
5. Commission teaching clips separately with rights and language metadata; obtain qualified fluent review of complete articulation and framing. Pair only approved clips with verified classifier labels and real-example tests. Until then retain fictional cipher rehearsal labels.

- [ ] Finish a full mission with sound and voice disabled.
- [ ] Finish onboarding using only keyboard navigation for panels and normal game controls.
- [ ] Test reduced motion and low effects through intro, scans, practice and liberation.
- [ ] Profile frame time with and without camera capture on the demo machine; record settings and observed results rather than a universal FPS promise.
- [ ] Review that deaf/nonspeaking identity is consistent, respectful and never framed as a condition the ending cures.

## P2 — dependable AI and educational content

| Work item | State / dependency | Acceptance gate |
|---|---|---|
| Gemini / Gradium connection | **Existing adapters; live credentials blocked** | Valid keys produce a real contextual hint and real speech; source/status reflects actual use. Fallbacks remain playable and clearly labeled. |
| Contextual companion | **Existing** | Winter uses Maëlle and grounded mission facts; the separate forest game retains Luma; no invented controls or inaccessible objectives appear. |
| Legacy camera classification | **Existing experimental adapter** | Real-camera tests validate capture/normalization, temporal gate, no-hand reset and label mapping. Until then all outputs remain unverified. |
| Real sign demonstrations | **Planned**, requires verified language content and review | Choose and name the actual sign language for each supported lesson set, obtain suitable demonstrations, verify their meaning and model support, and include a non-camera path. |
| Meaningful sign-driven mechanics | **Planned**, depends on validated content | The same interaction has a recognizable environmental effect across more than one context; instruction does not replace spatial exploration and play. |

- [ ] Reject the claim that terminal letters, generic hand shapes or high model confidence demonstrate linguistic mastery.
- [ ] Test camera denial, missing device, no hand, low confidence, disconnected service and slow provider response.
- [ ] Keep raw camera images local in the browser architecture; verify no provider keys or model file enter the public frontend bundle.

## P3 — campaign expansion, one finished chapter at a time

| Chapter | Build order and dependencies | Done means |
|---|---|---|
| **02 · Under the Ice** | Greybox navigable canal → moving-bridge state machine → route puzzle → recovery/checkpoints → visual pass | Bridge timing creates a genuine navigation choice; progress persists; no impossible configuration traps the player. |
| **03 · A Place to Grow** | Glasshouse light-routing prototype → growth/path states → revisitable puzzle spaces → discovery rewards → art | Light and growth change reachable space predictably; revisiting reveals something new; every puzzle has a recoverable state. |
| **04 · Beyond the Clouds** | Observatory reflector interaction → constellation rules → multi-platform traversal → combination challenge → sky presentation | Combinations use established mechanics; clues are readable without color or audio; alignment cannot be won through UI-only clicking. |
| **05 · The Returning Dawn** | NEXUS spire phase design → movement/defense/rerouting prototypes → checkpoints → final restoration → postgame route | Each phase changes player behavior, retries are fair, and completion restores the campaign world with replay access. |

Do not open a chapter node until its own start-to-finish journey, saves, failure recovery and accessibility checks pass. Complete each chapter's playable mechanics before multiplying environments, collectibles or cinematic scenes.

## Release gate

- [ ] Typecheck, production build and meaningful state/audio/practice tests pass.
- [ ] Test the production files on the actual intended host, including iframe camera restrictions when relevant.
- [ ] Confirm title, map, README and submission describe only verified playable chapters and integrations.
- [ ] Package a clean public source repository with setup instructions, architecture, asset provenance and honest model/provider limitations.
- [ ] Verify a free itch.io upload starts correctly and backend hosting is separately configured where needed.
- [ ] Prepare a five-minute demo: choose a character → brief training → real Louvre action → restoration → explain the four planned chapters and remaining educational validation.
