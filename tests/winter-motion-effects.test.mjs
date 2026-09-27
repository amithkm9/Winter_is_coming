import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMotionEffects } from '../src/winter/motion-effects.ts';

function setup(t) {
  const scene = new THREE.Scene(),
    effects = createMotionEffects(scene);
  const group = scene.getObjectByName('winter-motion-contacts');
  t.after(() => effects.dispose());
  return {
    scene,
    effects,
    group,
    marks: () => group.children.filter((x) => x.name.startsWith('snow-footprint')),
    puffs: () => group.children.filter((x) => x.name.startsWith('snow-dust')),
  };
}
const visible = (nodes) => nodes.filter((node) => node.visible);
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
}

test('step pools stay bounded under repeated running contacts and introduce no lights', (t) => {
  const { effects, group, marks, puffs } = setup(t);
  for (let i = 0; i < 500; i++)
    effects.step(new THREE.Vector3(i * 0.1, 0, 0), 0, i % 2 ? 1 : -1, true);
  assert.equal(marks().length, 40);
  assert.equal(puffs().length, 64);
  assert.equal(visible(marks()).length, 40);
  assert.equal(visible(puffs()).length, 64);
  assert.equal(group.children.length, 104);
  assert.ok(group.children.every((node) => !node.isLight));
  assert.equal(new Set(marks().map((node) => node.geometry)).size, 1);
  assert.equal(new Set(puffs().map((node) => node.geometry)).size, 1);
});

for (const [heading, yaw, forward] of [
  ['-Z', 0, [0, 0, -1]],
  ['-X', Math.PI / 2, [-1, 0, 0]],
  ['+Z', Math.PI, [0, 0, 1]],
  ['+X', -Math.PI / 2, [1, 0, 0]],
]) {
  test(`foot contact orientation and alternating side follow heading ${heading}`, (t) => {
    const { effects, marks } = setup(t);
    const origin = new THREE.Vector3(3, 8, 5);
    effects.step(origin, yaw, -1, false);
    effects.step(origin, yaw, 1, false);
    const [left, right] = visible(marks());
    close(left.position.y, 0.03);
    close(right.position.y, 0.03);
    const worldForward = new THREE.Vector3(0, 1, 0).applyQuaternion(left.quaternion);
    forward.forEach((value, i) => close(worldForward.getComponent(i), value));
    const separation = right.position.clone().sub(left.position);
    close(separation.x, Math.cos(yaw) * 0.23);
    close(separation.z, -Math.sin(yaw) * 0.23);
    const midpoint = left.position.clone().add(right.position).multiplyScalar(0.5);
    close(midpoint.x, origin.x + forward[0] * 0.025);
    close(midpoint.z, origin.z + forward[2] * 0.025);
  });
}

test('contacts fade, dust grows gently, frozen time preserves state, and expired slots hide', (t) => {
  const { effects, marks, puffs } = setup(t);
  effects.update(0, false, true);
  effects.step(new THREE.Vector3(), 0, 1, false);
  const mark = visible(marks())[0],
    puff = visible(puffs())[0];
  const opacity = mark.material.opacity,
    scale = puff.scale.x;
  effects.update(0.1, false, true);
  assert.ok(mark.material.opacity < opacity && puff.scale.x > scale);
  const frozenOpacity = mark.material.opacity,
    frozenScale = puff.scale.x;
  effects.update(0.1, false, true);
  effects.update(0.1, false, true);
  assert.equal(mark.material.opacity, frozenOpacity);
  assert.equal(puff.scale.x, frozenScale);
  for (let i = 2; i <= 100; i++) effects.update(i * 0.1, false, true);
  assert.equal(visible(marks()).length, 0);
  assert.equal(visible(puffs()).length, 0);
});

test('large time jumps clamp particle integration rather than exploding or clearing everything', (t) => {
  const { effects, marks, puffs } = setup(t);
  effects.update(0, false, true);
  effects.step(new THREE.Vector3(), 0, 1, false);
  effects.update(1000, false, true);
  assert.equal(visible(marks()).length, 1);
  assert.ok(visible(puffs()).every((puff) => puff.position.y < 0.1));
});

test('reduced motion and disabled effects clear pending contacts and cannot accumulate', (t) => {
  const { effects, group, marks, puffs } = setup(t);
  for (const [reduced, enabled] of [
    [true, true],
    [false, false],
  ]) {
    effects.update(0, false, true);
    effects.step(new THREE.Vector3(), 0, 1, true);
    effects.update(0.1, reduced, enabled);
    for (let i = 0; i < 100; i++) effects.step(new THREE.Vector3(), 0, 1, true);
    assert.equal(group.visible, false);
    assert.equal(visible(marks()).length + visible(puffs()).length, 0);
    effects.update(0.2, false, true);
    assert.equal(visible(marks()).length + visible(puffs()).length, 0);
  }
});

test('invalid position, yaw, side and time never create corrupt geometry', (t) => {
  const { effects, group } = setup(t);
  for (const position of [
    new THREE.Vector3(NaN, 0, 0),
    new THREE.Vector3(0, Infinity, 0),
    new THREE.Vector3(0, 0, NaN),
  ]) {
    effects.step(position, 0, 1, false);
  }
  effects.step(new THREE.Vector3(), Infinity, 1, false);
  effects.step(new THREE.Vector3(), 0, 0, false);
  effects.update(NaN, false, true);
  assert.equal(visible(group.children).length, 0);
  assert.ok(group.children.every((node) => node.position.toArray().every(Number.isFinite)));
});

test('reset clears replay state and dispose releases pooled resources exactly once', (t) => {
  const { scene, effects, group, marks, puffs } = setup(t);
  const resources = new Set(
    [...marks(), ...puffs()].flatMap((node) => [node.geometry, node.material]),
  );
  let disposalCount = 0;
  for (const resource of resources) resource.addEventListener('dispose', () => disposalCount++);
  effects.step(new THREE.Vector3(), 0, 1, true);
  effects.reset();
  assert.equal(visible(group.children).length, 0);
  effects.step(new THREE.Vector3(), 0, -1, false);
  assert.equal(visible(marks()).length, 1);
  effects.dispose();
  effects.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(group.children.length, 0);
  assert.equal(disposalCount, resources.size);
  effects.step(new THREE.Vector3(), 0, 1, true);
  effects.update(1, false, true);
  assert.equal(scene.children.length, 0);
});
