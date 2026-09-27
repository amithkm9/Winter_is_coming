import test from 'node:test';
import assert from 'node:assert/strict';
import { WinterOnboarding } from '../src/winter/onboarding.ts';

test('academy milestones require four meters, beacon interaction, then accepted rehearsal input', () => {
  const onboarding = new WinterOnboarding();
  assert.equal(onboarding.enterBeacon(), false);
  assert.equal(onboarding.confirmInput(), false);
  onboarding.move(2.5);
  onboarding.move(1.4);
  assert.equal(onboarding.state.stage, 0);
  onboarding.move(0.2);
  assert.equal(onboarding.state.stage, 1);
  assert.equal(onboarding.state.distance, 4);
  assert.equal(onboarding.confirmInput(), false);
  assert.equal(onboarding.enterBeacon(), true);
  assert.equal(onboarding.state.stage, 2);
  assert.equal(onboarding.enterBeacon(), false);
  assert.equal(onboarding.confirmInput(), true);
  assert.equal(onboarding.state.stage, 3);
  assert.equal(onboarding.state.complete, true);
  assert.equal(onboarding.confirmInput(), false);
});

test('invalid movement cannot advance progress and later movement cannot skip another milestone', () => {
  const onboarding = new WinterOnboarding();
  for (const distance of [NaN, Infinity, -1, 0]) onboarding.move(distance);
  assert.equal(onboarding.state.stage, 0);
  assert.equal(onboarding.state.distance, 0);
  onboarding.move(50);
  onboarding.move(50);
  assert.equal(onboarding.state.stage, 1);
});

test('immutable snapshots and reset permit a fresh guided replay', () => {
  const onboarding = new WinterOnboarding(),
    snapshot = onboarding.state;
  assert.throws(() => {
    snapshot.stage = 3;
  }, TypeError);
  onboarding.move(4);
  onboarding.enterBeacon();
  onboarding.confirmInput();
  assert.equal(snapshot.stage, 0);
  onboarding.reset();
  assert.deepEqual(onboarding.state, { stage: 0, distance: 0, complete: false });
});
