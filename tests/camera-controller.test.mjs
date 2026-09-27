/** Camera pipeline integration with mocked hardware/model responses, not a physical-camera accuracy test. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { WinterMission } from '../src/winter/mission.ts';

const scratch = await mkdtemp(path.join(tmpdir(), 'winter-camera-test-'));
after(() => rm(scratch, { recursive: true, force: true }));
const output = path.join(scratch, 'camera.mjs');
await build({
  entryPoints: [path.resolve('src/services/camera.ts')],
  outfile: output,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  define: { 'import.meta.env.BASE_URL': "'./'" },
  plugins: [
    {
      name: 'hardware-and-api-boundaries',
      setup(build) {
        build.onResolve({ filter: /^\.\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
        build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
          contents:
            "export const API_BASE=''; export const API_HEADERS={'ngrok-skip-browser-warning':'1'};",
          loader: 'js',
        }));
        build.onResolve({ filter: /^@mediapipe\/tasks-vision$/ }, () => ({
          path: 'vision',
          namespace: 'vision-test',
        }));
        build.onLoad({ filter: /.*/, namespace: 'vision-test' }, () => ({
          contents: `
      export const FilesetResolver={forVisionTasks:async path=>{globalThis.__cameraFixture.assets.push(path);if(globalThis.__cameraFixture.trackingError)throw globalThis.__cameraFixture.trackingError;return {};}};
      export const HandLandmarker={createFromOptions:async(_files,options)=>{globalThis.__cameraFixture.assets.push(options.baseOptions.modelAssetPath);return globalThis.__cameraFixture.detector;}};
    `,
          loader: 'js',
        }));
      },
    },
  ],
});
const { CameraController } = await import(pathToFileURL(output).href);
const hand = Array.from({ length: 21 }, (_, i) => ({
  x: 0.2 + i * 0.015,
  y: 0.3 + i * 0.01,
  z: -0.01 * i,
}));
const response = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

function fixture(t) {
  const properties = ['window', 'navigator', 'performance', 'fetch', '__cameraFixture'];
  const previous = new Map(
    properties.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  const events = new EventTarget(),
    statuses = [],
    requests = [],
    inputs = [],
    cameraEvents = [];
  const state = {
    now: 0,
    scheduled: null,
    assets: [],
    captures: 0,
    stops: 0,
    closed: 0,
    warmup: () => response({ ready: true }),
    recognize: () => response({ sign: 'A', confidence: 0.98 }),
    detector: {
      currentHand: hand,
      detectForVideo() {
        return { landmarks: this.currentHand ? [this.currentHand] : [] };
      },
      close() {
        state.closed++;
      },
    },
  };
  const set = (name, value) =>
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  set('window', {
    dispatchEvent: events.dispatchEvent.bind(events),
    addEventListener: events.addEventListener.bind(events),
    setTimeout(callback) {
      state.scheduled = callback;
      return 0;
    },
  });
  const track = new EventTarget();
  track.stop = () => state.stops++;
  state.track = track;
  state.capture = () => ({ getTracks: () => [track], getVideoTracks: () => [track] });
  set('navigator', {
    mediaDevices: {
      async getUserMedia(options) {
        state.captures++;
        assert.equal(options.audio, false);
        return state.capture(options);
      },
    },
  });
  set('performance', { now: () => state.now });
  set('fetch', async (url, options) => {
    requests.push({ url, options });
    return url.endsWith('/warmup') ? state.warmup() : state.recognize();
  });
  set('__cameraFixture', state);
  const video = { srcObject: null, readyState: 2, currentTime: 0, async play() {} };
  const context = {
    clearRect() {},
    beginPath() {},
    lineTo() {},
    moveTo() {},
    stroke() {},
    arc() {},
    fill() {},
  };
  const canvas = { width: 320, height: 240, getContext: () => context };
  const controller = new CameraController(video, canvas, (text) => statuses.push(text));
  events.addEventListener('ls:gesture', (event) => inputs.push(event.detail));
  events.addEventListener('ls:camera', (event) => cameraEvents.push(event.detail.enabled));
  t.after(() => {
    controller.stop();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  const frame = async (ms = 34, visibleHand = hand, fresh = true) => {
    state.now += ms;
    if (fresh) video.currentTime += ms / 1000;
    state.detector.currentHand = visibleHand;
    const callback = state.scheduled;
    state.scheduled = null;
    callback?.();
    await flush();
  };
  const frames = async (count, visibleHand = hand) => {
    for (let i = 0; i < count; i++) await frame(34, visibleHand);
  };
  return {
    state,
    events,
    statuses,
    requests,
    inputs,
    cameraEvents,
    video,
    controller,
    frame,
    frames,
  };
}

test('camera permission is requested immediately and uses locally bundled tracking assets', async (t) => {
  const f = fixture(t);
  const starting = f.controller.start();
  assert.equal(f.state.captures, 1);
  assert.equal(f.requests.length, 0);
  assert.equal(await starting, true);
  assert.equal(f.controller.enabled, true);
  assert.equal(f.requests[0].url, '/api/recognition/warmup');
  assert.equal(f.requests[0].options.headers['ngrok-skip-browser-warning'], '1');
  assert.equal(f.state.captures, 1);
  assert.deepEqual(f.state.assets, ['./mediapipe/wasm', './mediapipe/hand_landmarker.task']);
  assert.ok(f.cameraEvents.includes(true));
  f.controller.stop();
  assert.equal(f.controller.enabled, false);
  assert.equal(f.state.stops, 1);
});

test('a backend failure leaves a live preview with a specific recognition error', async (t) => {
  const f = fixture(t);
  f.state.warmup = () => response({ ready: false, detail: 'Model cannot start.' }, 503);
  assert.equal(await f.controller.start(), false);
  assert.equal(f.requests[0].options.headers['ngrok-skip-browser-warning'], '1');
  assert.equal(f.state.captures, 1);
  assert.deepEqual(f.state.assets, []);
  assert.equal(f.controller.previewEnabled, true);
  assert.equal(f.controller.enabled, false);
  assert.equal(f.controller.starting, false);
  assert.equal(f.state.stops, 0);
  assert.match(f.statuses.at(-1), /Model cannot start.*Keyboard inputs still work/);
});

test('actual controller and gesture gate emit camera input that advances a real relay', async (t) => {
  const f = fixture(t),
    mission = new WinterMission();
  mission.start();
  mission.enterRelay(0);
  f.events.addEventListener('ls:gesture', (event) =>
    mission.submit(event.detail.sign, event.detail.source),
  );
  await f.controller.start();
  await f.frames(52);
  assert.deepEqual(f.inputs, [{ sign: 'A', source: 'camera' }]);
  assert.deepEqual(mission.state.completed, [0]);
  assert.equal(mission.state.lastSource, 'camera');
  const recognition = f.requests.filter((r) => r.url.endsWith('/recognize'));
  assert.equal(recognition.length, 2);
  assert.equal(recognition[0].options.headers['ngrok-skip-browser-warning'], '1');
  const payload = JSON.parse(recognition[0].options.body);
  assert.equal(payload.frames.length, 30);
  assert.equal(payload.frames[0].length, 21);
  assert.deepEqual(
    payload.frames[0][7],
    [hand[7].x, hand[7].y, hand[7].z],
    'raw normalized image coordinates are not transformed in the browser',
  );
  assert.match(f.statuses.at(-1), /A input sent.*Lower your hand/);
  await f.frames(20);
  assert.equal(f.inputs.length, 1);
  assert.match(
    f.statuses.at(-1),
    /A input sent/,
    'confirmation remains visible despite capture loops',
  );
});

test('duplicate video frames and tracking gaps cannot fill a stale sequence', async (t) => {
  const f = fixture(t);
  await f.controller.start();
  await f.frames(10);
  const count = f.controller.frames.length;
  for (let i = 0; i < 3; i++) await f.frame(34, hand, false);
  assert.equal(f.controller.frames.length, count);
  await f.frame(350);
  assert.equal(f.controller.frames.length, 1);
  assert.equal(f.requests.filter((r) => r.url.endsWith('/recognize')).length, 0);
});

test('hand disappearance aborts an in-flight result and prevents it from emitting', async (t) => {
  const f = fixture(t),
    late = deferred();
  f.state.recognize = () => late.promise;
  await f.controller.start();
  await f.frames(30);
  const request = f.requests.find((r) => r.url.endsWith('/recognize'));
  assert.ok(request);
  await f.frame(34, null);
  assert.equal(request.options.signal.aborted, true);
  late.resolve(response({ sign: 'A', confidence: 0.99 }));
  await flush();
  assert.deepEqual(f.inputs, []);
  assert.equal(f.controller.frames.length, 0);
});

test('resetRecognition preserves camera but rejects a late response from an earlier terminal', async (t) => {
  const f = fixture(t),
    mission = new WinterMission(),
    late = deferred();
  let prediction = 0;
  mission.start();
  mission.enterRelay(0);
  f.events.addEventListener('ls:gesture', (event) =>
    mission.submit(event.detail.sign, event.detail.source),
  );
  f.state.recognize = () =>
    ++prediction === 2 ? late.promise : response({ sign: 'A', confidence: 0.98 });
  await f.controller.start();
  await f.frames(51);
  assert.equal(prediction, 2);
  const old = f.requests.filter((r) => r.url.endsWith('/recognize'))[1];
  mission.exitRelay();
  mission.enterRelay(2);
  f.controller.resetRecognition();
  assert.equal(f.controller.enabled, true);
  assert.equal(f.state.stops, 0);
  assert.equal(old.options.signal.aborted, true);
  await f.frames(30);
  assert.equal(prediction, 3);
  assert.equal(mission.state.step, 0);
  f.state.now += 500;
  late.resolve(response({ sign: 'A', confidence: 0.99 }));
  await flush();
  assert.equal(mission.state.step, 0);
  assert.deepEqual(f.inputs, []);
});

test('stopping during preflight prevents any late model response from reopening the camera', async (t) => {
  const f = fixture(t),
    late = deferred();
  f.state.warmup = () => late.promise;
  const starting = f.controller.start();
  await flush();
  f.controller.stop();
  late.resolve(response({ ready: true }));
  assert.equal(await starting, false);
  assert.equal(f.controller.enabled, false);
  assert.equal(f.state.captures, 1);
  assert.equal(f.state.stops, 1);
});

test('a held gesture must be physically lowered before the same label can send again', async (t) => {
  const f = fixture(t);
  await f.controller.start();
  await f.frames(52);
  assert.equal(f.inputs.length, 1);
  await f.frames(16, null);
  await f.frames(52);
  assert.equal(f.inputs.length, 2);
});

test('preview plays while model startup is pending, and closing it cancels startup', async (t) => {
  const f = fixture(t),
    late = deferred();
  f.state.warmup = () => late.promise;
  const starting = f.controller.start();
  await flush();
  assert.equal(f.controller.previewEnabled, true);
  assert.equal(f.controller.starting, true);
  assert.ok(f.video.srcObject);
  assert.equal(f.video.muted, true);
  assert.equal(f.video.playsInline, true);
  f.controller.stop();
  assert.equal(f.controller.starting, false);
  assert.equal(f.video.srcObject, null);
  late.resolve(response({ ready: true }));
  assert.equal(await starting, false);
  assert.equal(f.controller.enabled, false);
  assert.deepEqual(f.state.assets, []);
});

test('camera permission denial identifies site and macOS settings without loading the model', async (t) => {
  const f = fixture(t);
  f.state.capture = () => {
    throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
  };
  assert.equal(await f.controller.start(), false);
  assert.equal(f.requests.length, 0);
  assert.equal(f.controller.previewEnabled, false);
  assert.equal(f.controller.starting, false);
  assert.match(f.statuses.at(-1), /site controls.*System Settings/);
});

test('busy camera has actionable recovery and makes no recognition requests', async (t) => {
  const f = fixture(t);
  f.state.capture = () => {
    throw Object.assign(new Error('busy'), { name: 'NotReadableError' });
  };
  assert.equal(await f.controller.start(), false);
  assert.equal(f.requests.length, 0);
  assert.match(f.statuses.at(-1), /Close other camera apps or video calls/);
});

test('unsupported camera constraints retry once with an unconstrained video request', async (t) => {
  const f = fixture(t),
    capture = f.state.capture;
  f.state.capture = (options) => {
    if (f.state.captures === 1)
      throw Object.assign(new Error('constraints'), { name: 'OverconstrainedError' });
    assert.equal(options.video, true);
    return capture();
  };
  assert.equal(await f.controller.start(), true);
  assert.equal(f.state.captures, 2);
});

test('cancelled permission request cannot reopen the preview over a newer successful start', async (t) => {
  const f = fixture(t),
    late = deferred(),
    capture = f.state.capture;
  f.state.capture = () => late.promise;
  const old = f.controller.start();
  f.controller.stop();
  assert.equal(f.controller.starting, false);
  f.state.capture = capture;
  assert.equal(await f.controller.start(), true);
  let staleStops = 0;
  late.resolve({
    getTracks: () => [
      {
        stop() {
          staleStops++;
        },
      },
    ],
  });
  assert.equal(await old, false);
  assert.equal(staleStops, 1);
  assert.equal(f.controller.enabled, true);
  assert.equal(f.controller.previewEnabled, true);
});

test('hand tracking failure preserves preview, and retry can recover recognition', async (t) => {
  const f = fixture(t);
  f.state.trackingError = new TypeError('tracking failed');
  assert.equal(await f.controller.start(), false);
  assert.equal(f.controller.previewEnabled, true);
  assert.match(f.statuses.at(-1), /Preview is live.*Hand tracking could not load/);
  f.state.trackingError = null;
  assert.equal(await f.controller.start(), true);
  assert.equal(f.state.stops, 1);
});

test('disconnected camera releases resources and offers restart', async (t) => {
  const f = fixture(t);
  await f.controller.start();
  f.state.track.dispatchEvent(new Event('ended'));
  assert.equal(f.controller.enabled, false);
  assert.equal(f.controller.previewEnabled, false);
  assert.equal(f.state.closed, 1);
  assert.match(f.statuses.at(-1), /camera disconnected.*RESTART CAMERA/);
});

test('insecure or unsupported origin explains the localhost recovery URL', async (t) => {
  const f = fixture(t);
  navigator.mediaDevices = undefined;
  assert.equal(await f.controller.start(), false);
  assert.equal(f.requests.length, 0);
  assert.match(f.statuses.at(-1), /http:\/\/127\.0\.0\.1:5173\//);
});
