# Mobile controls and itch.io release

The mobile controller provides a left movement stick, right Interact/Run/View/Pause buttons and independent pointer ownership so another finger can drag the game camera. Run is a toggle; it resets on a mode change, pause/blur, hidden page or rotation/resize. Terminal mode removes movement controls because the terminal supplies its own large A/B/C/1/2/3 buttons and close action. Desktop keyboard controls remain available.

The controller appears for a coarse primary pointer or a device reporting touch capability. Its full-screen container ignores pointer events; only the stick and action controls intercept touches. There is no document-wide touch handler blocking the game canvas. Safe-area padding and responsive panels accommodate portrait and landscape layouts. Landscape gives the 3D courtyard more room, but orientation locking is optional and must not strand portrait users.

Integration API:

```ts
const touch = createTouchControls(ui, { interact, view: switchView, pause: pauseMenu });
touch.setMode(paused || intro || !active ? 'hidden' : inTerminal ? 'terminal' : 'explore');
// Combine these axes with keyboard input, then normalize the combined movement.
const { x, y, running } = touch.state; // x = screen right, y = forward
// Reset on gameplay transitions; dispose when tearing down the scene.
```

The canvas look controller must track its own pointer ID. Releasing the look finger must not release the movement stick, and vice versa. Do not register a second global joystick handler. The module imports its own `mobile.css`; main integration supplies game mode, input consumption and terminal buttons.

## Package and embed

Build with `npm run package:winter`. Upload the resulting ZIP as an **HTML Game** with `index.html` at the archive root, preserve relative asset paths and exact filename casing, and test the processed upload. Choose **Click to launch in fullscreen** or provide the fullscreen button. Keep click-to-play so the player's gesture can enable audio. Once the actual mobile build has been checked, enable **Mobile Friendly** in embed settings. itch.io uses a fullscreen launch flow on mobile; the canvas must resize to the changing viewport. The ZIP must stay within itch.io's current file-count and size limits. [Official itch.io HTML5 guide](https://itch.io/docs/creators/html5)

Use viewport metadata that fits the device and permits safe-area layout. Do not depend on a physical keyboard or force a desktop-sized fixed viewport. Start mobile devices with reduced effects, then let players change quality. Test sustained play and thermal throttling; desktop emulation does not establish phone performance.

## Camera and backend

Touch ciphers work without camera permissions. Optional webcam recognition requires a secure context, a supported camera API, user permission, and permission from the containing page when the game runs inside an iframe. A top-level HTTPS page working does not prove that an itch.io iframe permits camera access. Inspect the actual embed permissions; where camera access is blocked, keep touch input usable and offer a separately hosted direct HTTPS game URL for the camera path. [Browser camera and iframe requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

The Python model/partner service must run on a reachable HTTPS server for public play; a phone cannot reach a laptop through its own `localhost`. Configure the production frontend API URL and backend CORS for the actual game/embed origin. Do not place API keys or the H5 model in the public ZIP. The game should finish model warmup before asking for camera capture, and display a useful recovery action on denial or service failure. iframe permission, CORS and an HTTPS endpoint are separate checks.

## Acceptance checklist and evidence boundary

- [ ] On an actual iPhone and Android device, complete character selection, training and one relay using touch only.
- [ ] Hold the stick while dragging to look; lift either finger and verify the other input continues correctly.
- [ ] Cancel a touch, rotate, background the browser and return; verify no stuck movement or Run toggle.
- [ ] Open terminal/practice, enter all six supported inputs and close it without the movement layer blocking buttons.
- [ ] Check portrait and landscape, notches/safe areas, camera overlay, map scrolling and readable dialogs.
- [ ] Test audio start, pause and resume from a user gesture with sound disabled as well as enabled.
- [ ] Test the actual itch.io upload separately from localhost, including missing backend and denied camera permission.

Automated DOM tests cover joystick normalization/deadzone, independent pointers, cancellation, mode changes and disposal. They do not verify physical browser camera permission, touch latency, mobile graphics performance or the published itch.io embed. Leave those claims unverified until device testing is performed.
