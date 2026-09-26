import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureGate } from '../src/services/gesture-gate.ts';
test('held gesture emits only once until hand is lowered long enough', () => {
  const gate = new GestureGate();
  assert.equal(gate.observe('A', .96, 100), null);
  assert.equal(gate.observe('A', .96, 800), 'A');
  assert.equal(gate.observe('A', .99, 1500), null);
  gate.observe(null, 0, 1600); gate.observe(null, 0, 2100);
  assert.equal(gate.observe('A', .96, 2300), null);
  assert.equal(gate.observe('A', .96, 3000), 'A');
});
test('unstable, low-confidence and stale results cannot cast', () => {
  const gate = new GestureGate();
  for (const [sign,score,time] of [['B',.9,100],['C',.9,200],['C',.4,300],['C',.99,400],['C',.99,350]]) assert.equal(gate.observe(sign,score,time),null);
  assert.equal(gate.observe('C',.99,5000),null);
  assert.equal(gate.observe('C',NaN,5100),null);
  assert.equal(gate.observe('unexpected',1,5200),null);
});
test('low-confidence predictions with a visible hand cannot rearm a held input', () => {
  const gate = new GestureGate(); gate.observe('A', .96, 100); assert.equal(gate.observe('A', .96, 800), 'A');
  gate.observe(null, 0, 1000, true); gate.observe(null, 0, 1600, true);
  assert.equal(gate.observe('A', .96, 2300), null); assert.equal(gate.observe('A', .96, 3000), null);
  assert.equal(gate.awaitingRelease, true);
});
test('brief hand losses separated by visible frames cannot count as one continuous release', () => {
  const gate = new GestureGate(); gate.observe('A', .96, 100); gate.observe('A', .96, 800);
  gate.observe(null, 0, 1000, false); gate.noteHandPresent();
  gate.observe(null, 0, 1600, false); assert.equal(gate.awaitingRelease, true);
  gate.observe(null, 0, 2100, false); assert.equal(gate.awaitingRelease, false);
});
test('confidence must be in range and confirmation must span at least 450 ms', () => {
  const gate = new GestureGate(); assert.equal(gate.observe('A', 2, 100), null);
  assert.equal(gate.observe('A', .96, 200), null); assert.equal(gate.observe('A', .96, 201), null);
  assert.equal(gate.observe('A', .96, 650), 'A');
});
