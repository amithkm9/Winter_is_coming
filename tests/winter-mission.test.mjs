import test from 'node:test';
import assert from 'node:assert/strict';
import { WinterMission, RELAY_SEQUENCES, CAPTURE_SECONDS } from '../src/winter/mission.ts';

function completeRelay(mission, id) {
  assert.equal(mission.enterRelay(id), true);
  for (const sign of RELAY_SEQUENCES[id]) assert.equal(mission.submit(sign), true);
}

test('three relay ciphers may be solved in any order; remote and duplicate submission cannot advance', () => {
  const mission = new WinterMission();
  assert.equal(mission.enterRelay(0), false);
  assert.equal(mission.submit('A'), false);
  assert.equal(mission.start(), true);
  assert.equal(mission.start(), false);
  for (const id of [2, 0, 1]) completeRelay(mission, id);
  assert.deepEqual(mission.state.completed, [2, 0, 1]);
  assert.equal(mission.state.phase, 'explore');
  assert.equal(mission.enterRelay(0), false);
  assert.equal(mission.submit('A'), false);
});

test('invalid inputs are ignored and incorrect valid ciphers reset only the current relay', () => {
  const mission = new WinterMission();
  mission.start();
  completeRelay(mission, 0);
  mission.enterRelay(2);
  assert.equal(mission.submit('A'), true);
  assert.equal(mission.submit('NOT_A_SIGN'), false);
  assert.equal(mission.state.step, 1);
  assert.equal(mission.state.mistakes, 0);
  assert.equal(mission.submit('C', 'forged'), false);
  assert.equal(mission.state.step, 1);
  assert.equal(mission.submit('B'), false);
  assert.equal(mission.state.step, 0);
  assert.equal(mission.state.mistakes, 1);
  assert.deepEqual(mission.state.completed, [0]);
  mission.submit('A', 'camera');
  assert.equal(mission.state.lastSource, 'camera');
  mission.exitRelay();
  assert.equal(mission.state.step, 0);
  assert.equal(mission.state.activeRelay, null);
});

test('final core requires three relays and liberation takes eight seconds without drone interruption', () => {
  const mission = new WinterMission();
  mission.start();
  assert.equal(mission.finishAtCore(), false);
  for (const id of [0, 1, 2]) completeRelay(mission, id);
  assert.equal(mission.finishAtCore(), true);
  assert.equal(mission.finishAtCore(), false);
  assert.equal(mission.enterRelay(0), false);
  mission.tick(4, true);
  assert.equal(mission.state.phase, 'liberating');
  assert.equal(mission.state.liberation, 0.5);
  assert.equal(mission.state.alert, 0);
  mission.tick(4, true);
  assert.equal(mission.state.phase, 'complete');
  assert.equal(mission.state.liberation, 1);
  const elapsed = mission.state.elapsed;
  mission.tick(50, true);
  assert.equal(mission.state.elapsed, elapsed);
});

test('five continuous seconds capture the player equally across exploration and terminal input', () => {
  const mission = new WinterMission();
  mission.start();
  completeRelay(mission, 0);
  assert.equal(CAPTURE_SECONDS, 5);
  mission.tick(2, true);
  assert.equal(mission.state.alert, 40);
  assert.equal(mission.state.captureSecondsRemaining, 3);
  mission.enterRelay(2);
  mission.submit('A');
  mission.tick(2, true);
  assert.equal(mission.state.alert, 80);
  assert.equal(mission.state.captureSecondsRemaining, 1);
  assert.equal(mission.state.phase, 'terminal');
  mission.tick(1, true);
  assert.equal(mission.state.alert, 100);
  assert.equal(mission.state.respawns, 1);
  assert.equal(mission.state.phase, 'caught');
  assert.equal(mission.state.activeRelay, null);
  assert.equal(mission.state.step, 0);
  assert.equal(mission.state.captureSecondsRemaining, 0);
  assert.deepEqual(mission.state.completed, [0]);
});

test('leaving danger immediately clears exposure and a later scan starts a fresh countdown', () => {
  const mission = new WinterMission();
  mission.start();
  mission.tick(4.5, true);
  assert.equal(mission.state.captureSecondsRemaining, 0.5);
  mission.tick(0.01, false);
  assert.equal(mission.state.captureSecondsRemaining, CAPTURE_SECONDS);
  assert.equal(mission.state.alert, 0);
  mission.tick(4, true);
  assert.equal(mission.state.phase, 'explore');
  assert.equal(mission.state.captureSecondsRemaining, 1);
  mission.enterRelay(1);
  mission.tick(0.1, false);
  assert.equal(mission.state.captureSecondsRemaining, CAPTURE_SECONDS);
  assert.equal(mission.state.phase, 'terminal');
});

test('capture freezes time and inputs until an explicit checkpoint retry, counting each capture once', () => {
  const mission = new WinterMission();
  mission.start();
  completeRelay(mission, 0);
  assert.equal(mission.retryFromCheckpoint(), false);
  mission.tick(CAPTURE_SECONDS, true);
  const captured = mission.state;
  for (const danger of [true, false]) mission.tick(30, danger);
  assert.equal(mission.enterRelay(1), false);
  assert.equal(mission.submit('B', 'camera'), false);
  assert.equal(mission.finishAtCore(), false);
  assert.equal(mission.exitRelay(), false);
  assert.deepEqual(mission.state, captured);
  assert.equal(mission.retryFromCheckpoint(), true);
  assert.equal(mission.retryFromCheckpoint(), false);
  assert.equal(mission.state.phase, 'explore');
  assert.equal(mission.state.alert, 0);
  assert.equal(mission.state.captureSecondsRemaining, 5);
  assert.deepEqual(mission.state.completed, [0]);
  assert.equal(mission.state.respawns, 1);
  mission.tick(5, true);
  assert.equal(mission.state.phase, 'caught');
  assert.equal(mission.state.respawns, 2);
});

test('capture timing is stable across frame subdivisions and never triggers before five seconds', () => {
  const mission = new WinterMission();
  mission.start();
  for (let i = 0; i < 299; i++) mission.tick(1 / 60, true);
  assert.equal(mission.state.phase, 'explore');
  assert.ok(mission.state.captureSecondsRemaining > 0);
  mission.tick(1 / 60, true);
  assert.equal(mission.state.phase, 'caught');
});

test('snapshot and relay definitions are immutable; invalid time cannot corrupt the mission', () => {
  const mission = new WinterMission();
  mission.start();
  assert.throws(() => {
    mission.state.completed.push(2);
  }, TypeError);
  assert.throws(() => {
    mission.state.phase = 'complete';
  }, TypeError);
  assert.throws(() => {
    RELAY_SEQUENCES[0].push('C');
  }, TypeError);
  for (const dt of [-1, NaN, Infinity, 0]) mission.tick(dt, true);
  assert.equal(mission.state.elapsed, 0);
  assert.equal(mission.state.alert, 0);
});

test('save resumes completed relays while abandoning partial ciphers, and preserves liberation progress', () => {
  const mission = new WinterMission();
  mission.start();
  completeRelay(mission, 2);
  mission.enterRelay(1);
  mission.submit('B');
  mission.tick(2, true);
  const resumed = new WinterMission();
  assert.equal(resumed.restore(mission.serialize()), true);
  assert.equal(resumed.state.phase, 'explore');
  assert.equal(resumed.state.activeRelay, null);
  assert.equal(resumed.state.step, 0);
  assert.deepEqual(resumed.state.completed, [2]);
  assert.equal(resumed.state.alert, 40);
  assert.equal(resumed.state.captureSecondsRemaining, 3);
  completeRelay(resumed, 1);
  completeRelay(resumed, 0);
  resumed.finishAtCore();
  resumed.tick(3, false);
  assert.equal(mission.restore(resumed.serialize()), true);
  assert.equal(mission.state.liberation, 0.375);
  mission.tick(5, false);
  assert.equal(mission.state.phase, 'complete');
});

test('caught saves resume safely while legacy alert-only saves remain readable', () => {
  const mission = new WinterMission();
  mission.start();
  completeRelay(mission, 0);
  mission.tick(5, true);
  const saved = JSON.parse(mission.serialize());
  assert.equal(saved.phase, 'explore');
  assert.equal(saved.alert, 0);
  assert.equal(saved.captureSecondsRemaining, 5);
  const resumed = new WinterMission();
  assert.equal(resumed.restore(JSON.stringify(saved)), true);
  assert.equal(resumed.state.phase, 'explore');
  assert.deepEqual(resumed.state.completed, [0]);
  assert.equal(resumed.state.respawns, 1);
  delete saved.captureSecondsRemaining;
  delete saved.chapter;
  saved.alert = 40;
  assert.equal(resumed.restore(JSON.stringify(saved)), true);
  assert.equal(resumed.state.captureSecondsRemaining, 3);
  resumed.tick(0.1, false);
  assert.equal(resumed.state.alert, 0);
  assert.equal(resumed.state.captureSecondsRemaining, 5);
});

test('malformed or inconsistent saves are rejected without modifying existing progress', () => {
  const mission = new WinterMission();
  mission.start();
  completeRelay(mission, 0);
  const base = JSON.parse(mission.serialize());
  const invalid = [
    '{',
    'null',
    '[]',
    ...[
      { completed: [0, 0] },
      { completed: [3] },
      { completed: ['0'] },
      { phase: 'complete', liberation: 1 },
      { phase: 'terminal' },
      { phase: 'explore', liberation: 0.5 },
      { phase: 'briefing' },
      { alert: 100 },
      { mistakes: -1 },
      { respawns: 1.5 },
      { elapsed: null },
      { lastSource: 'verified' },
      { version: 2 },
      { phase: 'caught' },
      { captureSecondsRemaining: 0 },
      { captureSecondsRemaining: 6 },
      { captureSecondsRemaining: null },
      { captureSecondsRemaining: '5' },
      { captureSecondsRemaining: 3 },
    ].map((patch) => JSON.stringify({ ...base, ...patch })),
  ];
  for (const raw of invalid) {
    assert.equal(mission.restore(raw), false);
    assert.deepEqual(mission.state.completed, [0]);
  }
  mission.reset();
  assert.equal(mission.state.phase, 'briefing');
  assert.deepEqual(mission.state.completed, []);
});
