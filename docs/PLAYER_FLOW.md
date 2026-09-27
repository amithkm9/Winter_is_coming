# Playing Winter Is Coming

The opening screen offers **Watch intro** or **Skip to game**. Watch plays the supplied 29-second subtitled film with sound; pause, mute and skip remain available. The film ends at the game menu. It also pauses when you leave the tab, and you can resume when you return. No game progress depends on watching it.

At the title screen, choose **Begin your story**. The game is a browser adventure set in frozen Paris. Use a keyboard-equipped computer or touch controls on a phone/tablet. Landscape gives the widest view.

For a quick reminder inside the game, choose **How to play** on the title screen.

To start completely fresh, choose **Settings → Reset & replay intro**, or open `winter.html?reset=1` on the same site. This clears the Winter character profile, all five mission saves, memories and settings in that browser, then returns to the opening film. The reset flag is removed so ordinary refreshes preserve your new progress. Other games' saves are kept.

## Choose your student

Choose **Noor**, **Elio**, or **Mira**. Each has a different outfit and story, with the same movement and gameplay abilities. Select a portrait, then confirm your choice. Going back before confirmation keeps your previous selection.

## Choose a chapter

The chapter map shows six chapters. **The First Spark** is a safe introduction, and **The Louvre Relay** is the current field mission. Completing the Louvre unlocks **Under the Ice**, then **A Place to Grow**, **Beyond the Clouds**, and **The Returning Dawn**. Each is implemented with its own environment and ending.

## Learn the controls in The First Spark

Training uses a safe simulation of the courtyard. There is no drone danger.

1. Walk at least four meters with **WASD** or the arrow keys. **W** moves away from the camera, **S** moves toward it, and **A/D** move left/right relative to the view. Drag on the scene to turn the camera.
2. Approach the green practice beacon and press **Enter**.
3. Rehearse the **A** input with the keyboard, the simulation button, or the optional experimental camera.

Completing the introduction unlocks the Louvre mission. You can also skip training from Pause; this unlocks the mission without awarding a training completion badge. The introduction remains available to play later.

## Explore the Louvre

Follow the amber markers to three optical terminals. Press **Enter** near a terminal to open its interaction. The three cipher sequences are **A**, **B → C**, and **A → C → B**. They can be completed in any order.

A drone scan or danger zone starts a **five-second countdown**. Move completely outside the marked area to reset it. If it reaches zero, **Caught** freezes the run. Choose **Retry from checkpoint** or **Return to chapter map**; restored relays and memories are kept. A dangerous terminal closes automatically so the phone joystick is available for escape. Safe practice and the enlarged Study view prevent capture.

Press **V** or the **VIEW** button to switch between third-person and first-person (eye-level) views. Your choice is saved. In eye view, drag horizontally to turn and vertically to look up or down; the camera stays at the student’s eye height without walking bob. Story cinematics still use the cinematic camera, then return to your chosen view.

Movement runs by default; use **Shift** for a faster sprint. Press **Esc** or the pause button to take a break, change settings, return to the chapter map, or return to the title.

The student faces the direction they travel. If a wall blocks one direction, the character follows the direction they can actually move. The camera stays behind the area you are exploring; it does not force the character to face away from you. Moving toward the camera lets you see the character's face.

## Practise before committing

Choose **Practise First** at a terminal to rehearse without drone danger. Mistakes keep your current practice step, and completing practice does not restore the relay. Choose **Ready · Return to the Relay** when you want to attempt the actual cipher.

The terminal shows the **required ASL letter or number**, its hand-sign image and a short explanation automatically. The illustration changes with each sequence step. All six images ship with the game and work without internet. Tap **Study** for a larger, safe view; this stops camera capture and protects you from danger. Tap **Ready to try**, then choose **Use Camera**, or rehearse with the six on-screen inputs. Follow the written palm-direction guidance as well as the illustrated finger shape.

To use your own signs, choose **USE CAMERA** at a terminal, then **ENABLE CAMERA** and allow browser camera access. The game opens a live preview first, then warms up the H5 model and loads hand tracking. A service failure leaves the preview visible and explains how to retry. Show one hand fully in frame; the panel collects 30 frames and asks you to hold steady. Two confident matching predictions send one input. Lower your hand out of view briefly before the next sign. The camera panel shows the required input and recognition status. A matching input advances the sequence automatically; completing the relay restores it. **RESTART CAMERA** retries a failed setup.

The keyboard and on-screen simulation button always remain available. A valid camera label is handled as an experimental game input. The camera panel identifies its predictions and confidence as unverified.

**The images show ASL references, but the existing model has not been validated against those examples.** Its original label mapping and real-hand accuracy remain unverified. The game does not certify linguistic correctness or learning progress; tapping/typing a label is simulated input.

## Find memories and restore the light

Look for five golden memory sparks around the courtyard. Collecting them adds pages to the student’s journal. Finding all five unlocks a golden explorer scarf. These discoveries are optional.

After restoring all three relays, return to the core in front of the pyramid and press **Enter** or tap **ENTER**. An eight-second scene brings warmth and light back to the courtyard. The next chapter unlocks immediately and progress is saved before the supplied subtitled ending film is offered. Watch it with sound or choose Continue to reach the completion panel. **Next chapter unlocked · Open map** highlights that chapter, and the next-level play button starts it directly. You can also explore the liberated sector or replay the operation.

## Continue later

Progress is saved on the current browser and device. Continue restores completed relays and collected memories; an unfinished terminal cipher restarts. Training does not overwrite a saved Louvre mission. Character selection and campaign progress are stored separately from the mission save.

## Continue through Paris

| Chapter | Route and interactions |
|---|---|
| Canal | Restore the West Lock, Pump Station and North Lock in order. Number sequences open bridges over three icy channels. Activate the canal pump. |
| Glasshouse | Restore Root Circuit, Sunlight Array and Seed Archive using letters and numbers. Growth gates open the chambers; activate the garden heating core. |
| Observatory | Reconnect West Reflector, Star Tracker and North Alignment. Read mixed sequences, avoid the marked sweep zones, and activate the sky beacon. |
| Spire | Break Outer Firewall, Signal Router and NEXUS Access. The final sequence combines five inputs. Activate the central array to restore dawn to Paris. |

The amber marker shows the next available mechanism. Later chapters require the three links in order; their physical barriers open as progress is made. Warning fields show a quiet phase, an amber warning, then an active red phase. Step around or wait for them. Five optional memory pages are available in each sector. Safe practice suspends danger.

Each victory offers **NEXT CHAPTER**, restored-sector exploration, replay and the map. All mission saves are isolated, and Continue returns to the most recently played mission. The final Spire ending completes the campaign; previously completed chapters remain replayable.

## Touch controls

Move using the lower-left joystick. Drag an empty part of the scene with a second finger to look. Tap **RUN** to toggle faster movement, **ENTER** near a mechanism and **VIEW** to switch camera perspective. The terminal has six large simulation buttons; camera recognition is optional. Pause or leaving the app clears active touch movement. See [MOBILE_ITCH.md](MOBILE_ITCH.md) for deployment and device-test requirements.
