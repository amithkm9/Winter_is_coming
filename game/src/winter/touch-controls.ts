import './mobile.css';

export type TouchMode = 'hidden' | 'explore' | 'terminal';
export interface TouchActions { interact(): void; view(): void; pause(): void }
export interface TouchController {
  readonly state: { x: number; y: number; running: boolean };
  setMode(mode: TouchMode): void;
  reset(): void;
  dispose(): void;
}

/** The joystick owns exactly one pointer. Other fingers remain available for
 * canvas look or action buttons; no document-wide touch prevention is used. */
export function createTouchControls(parent: HTMLElement, actions: TouchActions): TouchController {
  const document = parent.ownerDocument, window = document.defaultView!;
  const media = window.matchMedia?.('(pointer: coarse)');
  const state = { x: 0, y: 0, running: false };
  const layer = document.createElement('section');
  layer.className = 'touch-controls'; layer.setAttribute('aria-label', 'Touch game controls'); layer.hidden = true;
  layer.innerHTML = `<div class="touch-stick" role="group" aria-label="Movement joystick"><span class="touch-stick-ring"></span><span class="touch-stick-knob"></span><span class="touch-stick-label">MOVE</span></div><div class="touch-actions"><button type="button" class="touch-action touch-run" aria-pressed="false">RUN</button><button type="button" class="touch-action touch-view" aria-label="Switch camera view">VIEW</button><button type="button" class="touch-action touch-interact">INTERACT</button><button type="button" class="touch-action touch-pause" aria-label="Pause game">Ⅱ</button></div>`;
  parent.append(layer);
  const stick = layer.querySelector<HTMLElement>('.touch-stick')!;
  const knob = layer.querySelector<HTMLElement>('.touch-stick-knob')!;
  const run = layer.querySelector<HTMLButtonElement>('.touch-run')!;
  let mode: TouchMode = 'hidden', pointer: number | null = null, disposed = false;
  let centerX = 0, centerY = 0, radius = 45;
  const listeners: (() => void)[] = [];
  function on(target: EventTarget, name: string, handler: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(name, handler, options); listeners.push(() => target.removeEventListener(name, handler, options));
  }
  const capable = () => Boolean(media?.matches || window.navigator.maxTouchPoints > 0);
  function stopStick() {
    const previous = pointer; pointer = null;
    state.x = 0; state.y = 0; knob.style.transform = 'translate(-50%, -50%)'; stick.classList.remove('engaged');
    if (previous !== null) { try { stick.releasePointerCapture(previous); } catch { /* Capture may already be cancelled. */ } }
  }
  function reset() { stopStick(); state.running = false; run.setAttribute('aria-pressed', 'false'); }
  function refresh() {
    const available = capable(); parent.classList.toggle('has-touch-controls', available);
    layer.hidden = disposed || !available || mode === 'hidden'; layer.dataset.mode = mode;
    if (layer.hidden) reset();
  }
  function move(event: PointerEvent) {
    if (event.pointerId !== pointer || layer.hidden || mode !== 'explore') return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) { stopStick(); return; }
    const rawX = (event.clientX - centerX) / radius, rawY = (centerY - event.clientY) / radius;
    const distance = Math.hypot(rawX, rawY), visual = Math.min(1, distance);
    const strength = Math.max(0, (Math.min(1, distance) - .16) / .84);
    state.x = distance ? rawX / distance * strength : 0;
    state.y = distance ? rawY / distance * strength : 0;
    const offsetX = distance ? rawX / distance * visual * radius : 0;
    const offsetY = distance ? -rawY / distance * visual * radius : 0;
    knob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    event.preventDefault(); event.stopPropagation();
  }
  on(stick, 'pointerdown', ((event: PointerEvent) => {
    if (disposed || layer.hidden || mode !== 'explore' || pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const bounds = stick.getBoundingClientRect();
    centerX = bounds.left + bounds.width / 2; centerY = bounds.top + bounds.height / 2;
    radius = Math.max(24, Math.min(bounds.width, bounds.height) * .34);
    pointer = event.pointerId; stick.classList.add('engaged');
    try { stick.setPointerCapture(pointer); } catch { /* Window release listener is a fallback. */ }
    move(event);
  }) as EventListener);
  on(stick, 'pointermove', ((event: PointerEvent) => move(event)) as EventListener);
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    on(window, name, ((event: PointerEvent) => {
      if (event.pointerId === pointer) { if (name === 'pointerup') stopStick(); else reset(); }
    }) as EventListener);
  }
  function button(selector: string, action: () => void) {
    const element = layer.querySelector<HTMLButtonElement>(selector)!;
    on(element, 'pointerdown', event => event.stopPropagation());
    on(element, 'click', event => {
      event.stopPropagation();
      if (!disposed && !layer.hidden && mode === 'explore') action();
    });
  }
  button('.touch-interact', actions.interact); button('.touch-view', actions.view); button('.touch-pause', actions.pause);
  button('.touch-run', () => { state.running = !state.running; run.setAttribute('aria-pressed', String(state.running)); });
  on(window, 'blur', reset); on(window, 'resize', reset); on(window, 'orientationchange', reset);
  on(document, 'visibilitychange', () => { if (document.hidden) reset(); });
  if (media) on(media, 'change', refresh);
  refresh();
  return {
    state,
    setMode(next) {
      if (disposed || !['hidden', 'explore', 'terminal'].includes(next)) return;
      if (mode !== next) { reset(); mode = next; }
      refresh();
    },
    reset,
    dispose() {
      if (disposed) return;
      disposed = true; reset(); for (const remove of listeners) remove();
      layer.remove(); parent.classList.remove('has-touch-controls');
    },
  };
}
