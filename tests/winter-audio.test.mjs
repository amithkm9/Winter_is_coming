import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/winter/audio.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { WinterAudio } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

// A deterministic clock models source lifetime, not sound quality. These tests
// protect audible behavior at the API boundary without requiring speakers.
class FakeParam {
  value = 0;
  setValueAtTime(value) {
    this.value = value;
  }
  linearRampToValueAtTime(value) {
    this.value = value;
  }
  exponentialRampToValueAtTime(value) {
    this.value = value;
  }
  setTargetAtTime(value) {
    this.value = value;
  }
}
class FakeNode {
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
}
class FakeSource extends FakeNode {
  frequency = new FakeParam();
  onended = null;
  constructor(context) {
    super();
    this.context = context;
  }
  start() {
    this.context.live.add(this);
    this.context.started++;
  }
  stop(time) {
    if (time === undefined) {
      this.context.live.delete(this);
      this.onended?.();
    } else this.endsAt = time;
  }
}
class FakeContext {
  state = 'suspended';
  currentTime = 0;
  sampleRate = 100;
  destination = new FakeNode();
  live = new Set();
  started = 0;
  resumeCalls = 0;
  gains = [];
  createGain() {
    const node = new FakeNode();
    node.gain = new FakeParam();
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    return new FakeSource(this);
  }
  createBufferSource() {
    return new FakeSource(this);
  }
  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeParam();
    node.Q = new FakeParam();
    return node;
  }
  createBuffer(_channels, size) {
    return { getChannelData: () => new Float32Array(size) };
  }
  async resume() {
    this.resumeCalls++;
    this.state = 'running';
  }
  async suspend() {
    this.state = 'suspended';
  }
  async close() {
    this.state = 'closed';
  }
  advance(dt) {
    this.currentTime += dt;
    for (const voice of [...this.live]) {
      if (voice.endsAt <= this.currentTime) {
        this.live.delete(voice);
        voice.onended?.();
      }
    }
  }
}

const frame = { walking: false, running: false, alert: 0, liberation: 0, active: true };
function fixture(t) {
  const previousDocument = globalThis.document;
  const document = new EventTarget();
  document.hidden = false;
  globalThis.document = document;
  const context = new FakeContext();
  let creations = 0;
  const audio = new WinterAudio(() => {
    creations++;
    return context;
  });
  t.after(() => {
    audio.dispose();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  return { audio, context, document, creations: () => creations };
}

test('audio never starts from update or play until a gesture unlocks it', async (t) => {
  const { audio, context, creations } = fixture(t);
  audio.update(0.016, frame);
  audio.play('win');
  assert.equal(creations(), 0);
  await audio.unlock();
  audio.update(0.016, frame);
  assert.equal(context.resumeCalls, 1);
  assert.ok(context.live.size > 0);
});

test('music can stop independently of wind and volume stays bounded', async (t) => {
  const { audio, context } = fixture(t);
  await audio.unlock();
  audio.update(0.016, frame);
  const fullAmbience = context.live.size;
  audio.configure({ enabled: true, music: false, volume: 99 });
  assert.equal(context.gains[0].gain.value, 0.8);
  assert.ok(context.live.size > 0 && context.live.size < fullAmbience);
  audio.configure({ enabled: true, music: true, volume: NaN });
  audio.update(0.016, frame);
  assert.equal(context.gains[0].gain.value, 0.45);
  assert.equal(context.live.size, fullAmbience);
  audio.configure({ enabled: true, music: true, volume: -2 });
  assert.equal(context.live.size, 0);
  assert.equal(context.state, 'suspended');
});

test('disable/re-enable and pause/resume restore audible configured volume', async (t) => {
  const { audio, context } = fixture(t);
  await audio.unlock();
  audio.update(0.016, frame);
  audio.configure({ enabled: false, music: true, volume: 0.37 });
  assert.equal(context.live.size, 0);
  audio.configure({ enabled: true, music: true, volume: 0.37 });
  audio.update(0.016, frame);
  assert.equal(context.state, 'suspended', 'configuration alone must not resume');
  await audio.unlock();
  audio.update(0.016, frame);
  assert.equal(context.gains[0].gain.value, 0.37);
  assert.ok(context.live.size > 0);
  audio.play('win');
  audio.setPaused(true);
  assert.equal(context.live.size, 0, 'scheduled liberation notes are cancelled');
  audio.setPaused(false);
  audio.update(0.016, frame);
  assert.equal(context.state, 'suspended');
  await audio.unlock();
  audio.update(0.016, frame);
  assert.equal(context.gains[0].gain.value, 0.37, 'resume remains audible without reconfiguration');
  assert.ok(context.live.size > 0);
});

test('title and hidden pages stop audio and returning visibility cannot autoplay', async (t) => {
  const { audio, context, document } = fixture(t);
  await audio.unlock();
  audio.update(0.016, frame);
  audio.play('win');
  audio.update(0.016, { ...frame, active: false });
  assert.equal(context.live.size, 0);
  assert.equal(context.state, 'suspended');
  await audio.unlock();
  audio.update(0.016, frame);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(context.live.size, 0);
  assert.equal(context.state, 'suspended');
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  audio.update(0.016, frame);
  assert.equal(context.state, 'suspended');
});

test('footsteps require movement and running has a faster bounded cadence', async (t) => {
  const { audio, context } = fixture(t);
  await audio.unlock();
  audio.update(0.016, frame);
  function runFor(seconds, input) {
    const before = context.started;
    for (let i = 0; i < seconds * 60; i++) {
      context.advance(1 / 60);
      audio.update(1 / 60, input);
    }
    return context.started - before;
  }
  assert.equal(runFor(2, frame), 0, 'standing still produces no steps');
  const walking = runFor(2, { ...frame, walking: true });
  audio.update(0.016, frame);
  const running = runFor(2, { ...frame, walking: true, running: true });
  assert.ok(walking > 0 && running > walking);
  assert.ok(running < 20, 'frame updates cannot generate one cue per frame');
});

test('alarm calls are rate bounded and transient spam cannot leak sources', async (t) => {
  const { audio, context } = fixture(t);
  await audio.unlock();
  audio.update(0.016, frame);
  const baseline = context.started;
  audio.play('danger');
  const oneCue = context.started - baseline;
  for (let i = 0; i < 100; i++) audio.play('danger');
  assert.equal(context.started - baseline, oneCue);
  context.advance(2);
  audio.play('danger');
  assert.equal(context.started - baseline, 2 * oneCue);
  for (let i = 0; i < 100; i++) audio.play('pickup');
  assert.ok(context.live.size <= 28);
  context.advance(10);
  assert.ok(context.live.size <= 3, 'ended transient sources leave only ambience');
});

test('disposing closes the context and later calls cannot recreate it', async (t) => {
  const { audio, context, creations, document } = fixture(t);
  await audio.unlock();
  audio.update(0.016, frame);
  audio.play('win');
  audio.dispose();
  assert.equal(context.state, 'closed');
  assert.equal(context.live.size, 0);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  audio.setPaused(false);
  audio.configure({ enabled: true, music: true, volume: 0.45 });
  await audio.unlock();
  audio.update(0.016, frame);
  audio.play('start');
  assert.equal(creations(), 1);
  assert.equal(context.live.size, 0);
});

test('unsupported audio remains a nonfatal silent fallback', async (t) => {
  const { audio: unused } = fixture(t);
  unused.dispose();
  const unavailable = new WinterAudio(() => {
    throw new Error('Audio unavailable');
  });
  t.after(() => unavailable.dispose());
  await assert.doesNotReject(() => unavailable.unlock());
  assert.doesNotThrow(() => {
    unavailable.update(0.016, frame);
    unavailable.play('start');
  });
});
