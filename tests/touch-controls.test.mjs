import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { Window } from 'happy-dom';

const source = fs
  .readFileSync(new URL('../src/winter/touch-controls.ts', import.meta.url), 'utf8')
  .replace("import './styles/mobile.css';", '');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { createTouchControls } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

function fixture(t, { coarse = true, touches = 0 } = {}) {
  const window = new Window();
  const media = new window.EventTarget();
  media.matches = coarse;
  window.matchMedia = () => media;
  Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: touches });
  const parent = window.document.createElement('main');
  window.document.body.append(parent);
  const counts = { interact: 0, view: 0, pause: 0 };
  const controls = createTouchControls(
    parent,
    Object.fromEntries(Object.keys(counts).map((key) => [key, () => counts[key]++])),
  );
  const layer = parent.querySelector('.touch-controls'),
    stick = parent.querySelector('.touch-stick');
  stick.getBoundingClientRect = () => ({ left: 0, top: 0, width: 136, height: 136 });
  let captured = null;
  stick.setPointerCapture = (id) => {
    captured = id;
  };
  stick.releasePointerCapture = (id) => {
    if (captured === id) captured = null;
  };
  const event = (target, name, id, x = 68, y = 68) =>
    target.dispatchEvent(
      new window.PointerEvent(name, {
        pointerId: id,
        pointerType: 'touch',
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
      }),
    );
  t.after(() => {
    controls.dispose();
    window.happyDOM.cancelAsync();
  });
  return { window, parent, controls, layer, stick, counts, event, media, capture: () => captured };
}

test('controls require a touch-capable device and an explicit explore mode', (t) => {
  const { controls, layer, media, window } = fixture(t, { coarse: false });
  controls.setMode('explore');
  assert.equal(layer.hidden, true);
  media.matches = true;
  media.dispatchEvent(new window.Event('change'));
  assert.equal(layer.hidden, false);
  controls.setMode('hidden');
  assert.equal(layer.hidden, true);
});

test('touch capability enables controls even with a fine primary pointer', (t) => {
  const { controls, layer } = fixture(t, { coarse: false, touches: 5 });
  controls.setMode('explore');
  assert.equal(layer.hidden, false);
});

test('ENTER exposes the same accessible action and invokes interact once', (t) => {
  const { controls, parent, counts } = fixture(t);
  const enter = parent.querySelector('.touch-interact');
  assert.equal(enter.textContent, 'ENTER');
  assert.match(enter.getAttribute('aria-label'), /^Enter\b/);
  controls.setMode('explore');
  enter.click();
  assert.equal(counts.interact, 1);
  assert.equal(counts.view, 0);
  assert.equal(counts.pause, 0);
  controls.setMode('hidden');
  enter.click();
  assert.equal(counts.interact, 1, 'paused/title overlay cannot trigger a nearby object');
});

test('joystick has a deadzone and normalized screen-right/forward axes', (t) => {
  const { controls, stick, event, capture } = fixture(t);
  controls.setMode('explore');
  event(stick, 'pointerdown', 4);
  assert.equal(capture(), 4);
  event(stick, 'pointermove', 4, 71, 66);
  assert.equal(controls.state.x, 0);
  assert.equal(controls.state.y, 0);
  event(stick, 'pointermove', 4, 250, -200);
  assert.ok(controls.state.x > 0 && controls.state.y > 0);
  assert.ok(Math.abs(Math.hypot(controls.state.x, controls.state.y) - 1) < 1e-8);
});

test('second finger can look or press actions without stealing/releasing joystick', (t) => {
  const { controls, stick, event, window, parent, counts, capture } = fixture(t);
  const canvas = window.document.createElement('canvas');
  parent.append(canvas);
  let lookMoves = 0;
  canvas.addEventListener('pointermove', () => lookMoves++);
  controls.setMode('explore');
  event(stick, 'pointerdown', 1, 110, 68);
  const initial = controls.state.x;
  event(stick, 'pointerdown', 2, 0, 0);
  event(stick, 'pointermove', 2, 0, 0);
  event(canvas, 'pointermove', 2, 20, 20);
  event(window, 'pointerup', 2);
  assert.equal(lookMoves, 1);
  assert.equal(capture(), 1);
  assert.equal(controls.state.x, initial);
  parent.querySelector('.touch-interact').click();
  assert.equal(counts.interact, 1);
  assert.equal(controls.state.x, initial);
  event(window, 'pointerup', 1);
  assert.equal(controls.state.x, 0);
  assert.equal(capture(), null);
});

for (const interruption of ['pointercancel', 'lostpointercapture', 'blur', 'resize', 'hidden']) {
  test(`${interruption} releases movement without stuck input`, (t) => {
    const { controls, stick, event, window, parent, capture } = fixture(t);
    controls.setMode('explore');
    event(stick, 'pointerdown', 1, 110, 68);
    parent.querySelector('.touch-run').click();
    assert.equal(controls.state.running, true);
    if (['pointercancel', 'lostpointercapture'].includes(interruption))
      event(window, interruption, 1);
    else if (interruption === 'hidden') {
      Object.defineProperty(window.document, 'hidden', { configurable: true, value: true });
      window.document.dispatchEvent(new window.Event('visibilitychange'));
    } else window.dispatchEvent(new window.Event(interruption));
    assert.equal(controls.state.x, 0);
    assert.equal(controls.state.y, 0);
    assert.equal(capture(), null);
    assert.equal(controls.state.running, false);
    parent.querySelector('.touch-run').click();
    assert.equal(controls.state.running, true);
    controls.reset();
    assert.equal(controls.state.running, false);
  });
}

test('mode changes reset run and movement; hidden/terminal buttons cannot invoke actions', (t) => {
  const { controls, stick, event, parent, counts } = fixture(t);
  controls.setMode('explore');
  event(stick, 'pointerdown', 1, 110, 68);
  parent.querySelector('.touch-run').click();
  assert.equal(controls.state.running, true);
  controls.setMode('terminal');
  assert.deepEqual(controls.state, { x: 0, y: 0, running: false });
  parent.querySelector('.touch-interact').click();
  assert.equal(counts.interact, 0);
  controls.setMode('hidden');
  parent.querySelector('.touch-view').click();
  assert.equal(counts.view, 0);
  controls.setMode('explore');
  parent.querySelector('.touch-view').click();
  parent.querySelector('.touch-pause').click();
  assert.equal(counts.view, 1);
  assert.equal(counts.pause, 1);
});

test('dispose removes controls/listeners and cannot reactivate stale pointers', (t) => {
  const { controls, stick, event, parent, window } = fixture(t);
  controls.setMode('explore');
  event(stick, 'pointerdown', 1, 110, 68);
  controls.dispose();
  assert.equal(parent.querySelector('.touch-controls'), null);
  assert.deepEqual(controls.state, { x: 0, y: 0, running: false });
  event(stick, 'pointerdown', 2, 0, 0);
  controls.setMode('explore');
  window.dispatchEvent(new window.Event('resize'));
  assert.deepEqual(controls.state, { x: 0, y: 0, running: false });
});
