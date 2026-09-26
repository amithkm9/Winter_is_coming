import test from 'node:test';
import assert from 'node:assert/strict';
import { WinterMission, RELAY_SEQUENCES } from '../src/winter/mission.ts';

function completeRelay(mission, id) {
  assert.equal(mission.enterRelay(id), true);
  for (const sign of RELAY_SEQUENCES[id]) assert.equal(mission.submit(sign), true);
}

test('three relay ciphers may be solved in any order; remote and duplicate submission cannot advance', () => {
  const mission = new WinterMission();
  assert.equal(mission.enterRelay(0), false); assert.equal(mission.submit('A'), false);
  assert.equal(mission.start(), true); assert.equal(mission.start(), false);
  for (const id of [2, 0, 1]) completeRelay(mission, id);
  assert.deepEqual(mission.state.completed, [2, 0, 1]);
  assert.equal(mission.state.phase, 'explore');
  assert.equal(mission.enterRelay(0), false); assert.equal(mission.submit('A'), false);
});

test('invalid inputs are ignored and incorrect valid ciphers reset only the current relay', () => {
  const mission = new WinterMission(); mission.start(); completeRelay(mission, 0); mission.enterRelay(2);
  assert.equal(mission.submit('A'), true);
  assert.equal(mission.submit('NOT_A_SIGN'), false); assert.equal(mission.state.step, 1); assert.equal(mission.state.mistakes, 0);
  assert.equal(mission.submit('C', 'forged'), false); assert.equal(mission.state.step, 1);
  assert.equal(mission.submit('B'), false); assert.equal(mission.state.step, 0); assert.equal(mission.state.mistakes, 1);
  assert.deepEqual(mission.state.completed, [0]);
  mission.submit('A', 'camera'); assert.equal(mission.state.lastSource, 'camera');
  mission.exitRelay(); assert.equal(mission.state.step, 0); assert.equal(mission.state.activeRelay, null);
});

test('final core requires three relays and liberation takes eight seconds without drone interruption', () => {
  const mission = new WinterMission(); mission.start();
  assert.equal(mission.finishAtCore(), false);
  for (const id of [0, 1, 2]) completeRelay(mission, id);
  assert.equal(mission.finishAtCore(), true); assert.equal(mission.finishAtCore(), false);
  assert.equal(mission.enterRelay(0), false);
  mission.tick(4, true); assert.equal(mission.state.phase, 'liberating'); assert.equal(mission.state.liberation, .5); assert.equal(mission.state.alert, 0);
  mission.tick(4, true); assert.equal(mission.state.phase, 'complete'); assert.equal(mission.state.liberation, 1);
  const elapsed = mission.state.elapsed; mission.tick(50, true); assert.equal(mission.state.elapsed, elapsed);
});

test('scan exposure halves at terminals; full alert extracts player but retains liberated relays', () => {
  const mission = new WinterMission(); mission.start(); completeRelay(mission, 0);
  mission.tick(2, true); assert.equal(mission.state.alert, 40);
  mission.enterRelay(2); mission.submit('A'); mission.tick(2, true); assert.equal(mission.state.alert, 60);
  mission.tick(4, true); assert.equal(mission.state.alert, 25); assert.equal(mission.state.respawns, 1);
  assert.equal(mission.state.phase, 'explore'); assert.equal(mission.state.activeRelay, null); assert.equal(mission.state.step, 0);
  assert.deepEqual(mission.state.completed, [0]);
  mission.tick(3, false); assert.equal(mission.state.alert, 0);
});

test('snapshot and relay definitions are immutable; invalid time cannot corrupt the mission', () => {
  const mission = new WinterMission(); mission.start();
  assert.throws(() => { mission.state.completed.push(2); }, TypeError);
  assert.throws(() => { mission.state.phase = 'complete'; }, TypeError);
  assert.throws(() => { RELAY_SEQUENCES[0].push('C'); }, TypeError);
  for (const dt of [-1, NaN, Infinity, 0]) mission.tick(dt, true);
  assert.equal(mission.state.elapsed, 0); assert.equal(mission.state.alert, 0);
});

test('save resumes completed relays while abandoning partial ciphers, and preserves liberation progress', () => {
  const mission = new WinterMission(); mission.start(); completeRelay(mission, 2); mission.enterRelay(1); mission.submit('B'); mission.tick(2, true);
  const resumed = new WinterMission(); assert.equal(resumed.restore(mission.serialize()), true);
  assert.equal(resumed.state.phase, 'explore'); assert.equal(resumed.state.activeRelay, null); assert.equal(resumed.state.step, 0);
  assert.deepEqual(resumed.state.completed, [2]); assert.equal(resumed.state.alert, 20);
  completeRelay(resumed, 1); completeRelay(resumed, 0); resumed.finishAtCore(); resumed.tick(3, false);
  assert.equal(mission.restore(resumed.serialize()), true); assert.equal(mission.state.liberation, .375);
  mission.tick(5, false); assert.equal(mission.state.phase, 'complete');
});

test('malformed or inconsistent saves are rejected without modifying existing progress', () => {
  const mission = new WinterMission(); mission.start(); completeRelay(mission, 0);
  const base = JSON.parse(mission.serialize());
  const invalid = ['{', 'null', '[]', ...[
    { completed: [0, 0] }, { completed: [3] }, { completed: ['0'] }, { phase: 'complete', liberation: 1 },
    { phase: 'terminal' }, { phase: 'explore', liberation: .5 }, { phase: 'briefing' },
    { alert: 100 }, { mistakes: -1 }, { respawns: 1.5 }, { elapsed: null }, { lastSource: 'verified' }, { version: 2 },
  ].map(patch => JSON.stringify({ ...base, ...patch }))];
  for (const raw of invalid) { assert.equal(mission.restore(raw), false); assert.deepEqual(mission.state.completed, [0]); }
  mission.reset(); assert.equal(mission.state.phase, 'briefing'); assert.deepEqual(mission.state.completed, []);
});
