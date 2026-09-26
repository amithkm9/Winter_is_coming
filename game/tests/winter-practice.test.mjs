import test from 'node:test';
import assert from 'node:assert/strict';
import { WinterPractice } from '../src/winter/practice.ts';
import { WinterMission } from '../src/winter/mission.ts';

test('practice completes in order and stays active until explicitly stopped', () => {
  const practice = new WinterPractice();
  assert.equal(practice.state.active, false);
  practice.begin(['A', 'C', 'B']);
  for (const sign of ['A', 'C', 'B']) assert.equal(practice.submit(sign, 'keyboard'), true);
  assert.equal(practice.state.complete, true); assert.equal(practice.state.active, true); assert.equal(practice.state.step, 3);
  assert.equal(practice.submit('B', 'keyboard'), false); assert.equal(practice.state.step, 3);
  practice.stop(); assert.equal(practice.state.active, false); assert.equal(practice.state.complete, false);
  assert.equal(practice.state.step, 0); assert.deepEqual(practice.state.sequence, []); assert.equal(practice.state.lastSource, null);
});

test('wrong supported input keeps the current step and encourages another attempt', () => {
  const practice = new WinterPractice(); practice.begin(['A', 'B']); practice.submit('A', 'keyboard');
  assert.equal(practice.submit('C', 'keyboard'), false); assert.equal(practice.state.step, 1);
  assert.match(practice.state.message, /Try B again/);
  assert.equal(practice.submit('B', 'keyboard'), true); assert.equal(practice.state.complete, true);
});

test('begin replays a finished sequence and clears earlier progress and source', () => {
  const practice = new WinterPractice(); practice.begin(['A']); practice.submit('A', 'camera');
  practice.begin(['A']); assert.equal(practice.state.step, 0); assert.equal(practice.state.complete, false); assert.equal(practice.state.lastSource, null);
  assert.equal(practice.submit('A', 'keyboard'), true);
});

test('missing, empty and unsupported sequences leave rehearsal safely inactive', () => {
  const practice = new WinterPractice();
  for (const sequence of [undefined, null, [], new Array(2), 'ABC', ['D'], ['A', '1'], ['A', null]]) {
    practice.begin(['A']); practice.begin(sequence);
    assert.equal(practice.state.active, false); assert.deepEqual(practice.state.sequence, []);
    assert.equal(practice.submit('A', 'keyboard'), false);
  }
});

test('invalid inputs and source values are ignored without mutating the current state', () => {
  const practice = new WinterPractice(); practice.begin(['A']); const before = practice.state;
  for (const [sign, source] of [['1', 'keyboard'], ['a', 'keyboard'], ['', 'camera'], ['A', 'verified'], ['A', undefined]]) {
    assert.equal(practice.submit(sign, source), false); assert.deepEqual(practice.state, before);
  }
});

test('input sequences and snapshots are independent and immutable', () => {
  const practice = new WinterPractice(), sequence = ['A', 'B']; practice.begin(sequence); sequence[0] = 'C';
  assert.deepEqual(practice.state.sequence, ['A', 'B']);
  assert.throws(() => practice.state.sequence.push('C'), TypeError);
  assert.throws(() => { practice.state.step = 1; }, TypeError);
  const snapshot = practice.state; practice.submit('A', 'keyboard'); assert.equal(snapshot.step, 0);
});

test('keyboard and model sources are explicitly distinguished without verification claims', () => {
  const practice = new WinterPractice(); practice.begin(['A', 'B']);
  practice.submit('A', 'keyboard'); assert.equal(practice.state.lastSource, 'keyboard'); assert.match(practice.state.message, /Keyboard input received/);
  practice.submit('B', 'camera'); assert.equal(practice.state.lastSource, 'camera'); assert.match(practice.state.message, /Experimental model input received/);
  assert.doesNotMatch(practice.state.message, /verified|correct sign|recognized correctly/i);
});

test('rehearsal has no effect on relay or mission progress', () => {
  const mission = new WinterMission(); mission.start(); mission.enterRelay(2); const before = mission.state;
  const practice = new WinterPractice(); practice.begin(before.sequence);
  for (const sign of before.sequence) practice.submit(sign, 'keyboard');
  assert.equal(practice.state.complete, true); assert.deepEqual(mission.state, before);
});
