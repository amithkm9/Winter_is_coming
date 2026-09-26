import test from 'node:test';
import assert from 'node:assert/strict';
import { firstPersonPose, parseViewMode } from '../src/winter/view.ts';

const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-12, message ?? `${a} ≈ ${b}`);
const direction = pose => ({ x: pose.target.x - pose.position.x, y: pose.target.y - pose.position.y, z: pose.target.z - pose.position.z });

test('saved view settings accept only the explicit first-person value', () => {
  assert.equal(parseViewMode('first-person'), 'first-person');
  assert.equal(parseViewMode('third-person'), 'third-person');
  for (const invalid of [undefined, null, false, true, 1, '', 'first', 'FIRST-PERSON', {}, []]) assert.equal(parseViewMode(invalid), 'third-person');
});

test('first-person origin is exactly 1.6m above the player, without a trailing offset', () => {
  for (const yaw of [0, .4, Math.PI / 2, Math.PI, -Math.PI]) {
    const pose = firstPersonPose(7, 2.5, -11, yaw, .2);
    assert.deepEqual(pose.position, { x: 7, y: 4.1, z: -11 });
    const d = direction(pose); close(Math.hypot(d.x, d.y, d.z), 1);
  }
  const first = firstPersonPose(7, 2.5, -11, .4, .2), moved = firstPersonPose(8, 2.5, -13, .4, .2);
  close(moved.position.x - first.position.x, 1); close(moved.position.z - first.position.z, -2);
  close(moved.target.x - first.target.x, 1); close(moved.target.z - first.target.z, -2);
  assert.deepEqual(firstPersonPose(7, 2.5, -11, .4, .2), first, 'Repeated calls introduce no camera bob');
});

test('yaw shares courier -Z forward and an orthogonal horizontal screen-right basis', () => {
  const headings = [[0, 0, -1], [Math.PI / 2, -1, 0], [Math.PI, 0, 1], [-Math.PI / 2, 1, 0]];
  for (const [yaw, expectedX, expectedZ] of headings) {
    const d = direction(firstPersonPose(0, 0, 0, yaw, 0));
    close(d.x, expectedX); close(d.y, 0); close(d.z, expectedZ);
    // Camera right = forward cross world-up = (cos(yaw), 0, -sin(yaw)).
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    close(d.x * right.x + d.z * right.z, 0);
    close(Math.hypot(right.x, right.z), 1);
    close(-d.z, right.x); close(d.x, right.z);
  }
});

test('pitch looks upward when positive, clamps safely and preserves unit view direction', () => {
  for (const pitch of [-100, -.85, -.3, 0, .3, .85, 100]) {
    const d = direction(firstPersonPose(0, 0, 0, .7, pitch));
    const clamped = Math.min(.85, Math.max(-.85, pitch));
    close(d.y, Math.sin(clamped)); close(Math.hypot(d.x, d.z), Math.cos(clamped));
    close(Math.hypot(d.x, d.y, d.z), 1);
  }
  assert.deepEqual(firstPersonPose(0, 0, 0, .4, 100), firstPersonPose(0, 0, 0, .4, .85));
  assert.deepEqual(firstPersonPose(0, 0, 0, .4, -100), firstPersonPose(0, 0, 0, .4, -.85));
});

test('nonfinite coordinates and angles cannot contaminate camera transforms', () => {
  const pose = firstPersonPose(NaN, Infinity, -Infinity, NaN, Infinity);
  assert.deepEqual(pose, { position: { x: 0, y: 1.6, z: 0 }, target: { x: 0, y: 1.6, z: -1 } });
  for (const invalid of [NaN, Infinity, -Infinity]) {
    const result = firstPersonPose(3, 1, -8, invalid, invalid);
    assert.ok([...Object.values(result.position), ...Object.values(result.target)].every(Number.isFinite));
    assert.deepEqual(result.position, { x: 3, y: 2.6, z: -8 });
  }
});
