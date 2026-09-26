import test from 'node:test';
import assert from 'node:assert/strict';
import { movementDirection, facingYaw, turnToward, TURN_SPEED } from '../src/winter/movement.ts';

const close = (a, b, message = '') => assert.ok(Math.abs(a - b) < 1e-8, `${message}: ${a} ≠ ${b}`);
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

test('W goes away, S toward, D right and A left for all four camera directions', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    for (const [right, ahead, expected] of [
      [0, 1, forward], [0, -1, { x: -forward.x, z: -forward.z }],
      [1, 0, { x: -forward.z, z: forward.x }], [-1, 0, { x: forward.z, z: -forward.x }],
    ]) {
      const result = movementDirection(right, ahead, forward.x, forward.z);
      close(result.x, expected.x); close(result.z, expected.z);
    }
  }
});

test('diagonals have the same speed and flattened camera direction is normalized', () => {
  const forward = movementDirection(0, 1, 0, -9), diagonal = movementDirection(1, 1, 0, -9);
  close(Math.hypot(forward.x, forward.z), 1); close(Math.hypot(diagonal.x, diagonal.z), 1);
  close(diagonal.x, Math.SQRT1_2); close(diagonal.z, -Math.SQRT1_2);
  assert.deepEqual(movementDirection(0, 0, 1, 0), { x: 0, z: 0 });
});

test('invalid input and a vertical-only camera direction cannot produce NaN movement', () => {
  for (const args of [[NaN, 1, 0, -1], [0, 1, Infinity, 0], [0, 1, 0, 0], [Infinity, 0, 0, -1]]) {
    assert.deepEqual(movementDirection(...args), { x: 0, z: 0 });
  }
});

test('avatar local -Z front points along the actual movement in every direction', () => {
  for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [-1, 1]]) {
    const yaw = facingYaw(dx, dz, 0), length = Math.hypot(dx, dz);
    close(-Math.sin(yaw), dx / length); close(-Math.cos(yaw), dz / length);
  }
});

test('wall sliding faces the remaining displacement, while a fully blocked actor keeps its heading', () => {
  const desired = movementDirection(1, 1, 0, -1);
  const slideYaw = facingYaw(0, desired.z, .6); // X movement was blocked by a wall.
  close(slideYaw, 0);
  assert.equal(facingYaw(0, 0, .6), .6); assert.equal(facingYaw(NaN, 1, .6), .6);
  assert.equal(facingYaw(0, 0, NaN), 0);
});

test('turning crosses the ±pi boundary by the shortest path and never exceeds the speed limit', () => {
  const current = Math.PI - .1, target = -Math.PI + .1;
  const turned = turnToward(current, target, .005);
  close(angleDistance(turned, current), TURN_SPEED * .005);
  assert.ok(angleDistance(turned, target) < angleDistance(current, target));
  close(angleDistance(turnToward(current, target, 1 / 60), target), 0);
  const capped = turnToward(0, Math.PI, 100); assert.ok(angleDistance(capped, 0) <= TURN_SPEED * .1 + 1e-8);
});

test('normal frame partitions reach the same heading and invalid delta cannot change rotation', () => {
  let at60 = 0, at120 = 0;
  for (let i = 0; i < 6; i++) at60 = turnToward(at60, 2, 1 / 60);
  for (let i = 0; i < 12; i++) at120 = turnToward(at120, 2, 1 / 120);
  close(angleDistance(at60, at120), 0); close(angleDistance(at60, turnToward(0, 2, .1)), 0);
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(turnToward(.6, 1, dt), .6);
  assert.equal(turnToward(.6, NaN, .01), .6); assert.ok(Number.isFinite(turnToward(NaN, 1, .01)));
  assert.ok(Number.isFinite(turnToward(Number.MAX_VALUE, -Number.MAX_VALUE, .01)));
});
