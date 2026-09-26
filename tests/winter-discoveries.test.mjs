import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDiscoveries, MEMORY_SPARKS } from '../src/winter/discoveries.ts';
import { createWinterWorld } from '../src/winter/world.ts';

const at = memory => new THREE.Vector3(memory.position[0], 0, memory.position[1]);

test('disabled discoveries never collect; nearby memories collect once and return journal content', () => {
  const scene = new THREE.Scene(), discoveries = createDiscoveries(scene);
  try {
    for (const memory of MEMORY_SPARKS) assert.equal(discoveries.update(0, at(memory), false, false), null);
    assert.deepEqual(discoveries.collected(), []);
    for (const memory of MEMORY_SPARKS) {
      assert.equal(discoveries.update(1, at(memory).add(new THREE.Vector3(1.21, 0, 0)), true, false), null);
      assert.deepEqual(discoveries.update(2, at(memory), true, false), { id: memory.id, title: memory.title, text: memory.text });
      assert.equal(discoveries.update(3, at(memory), true, false), null);
    }
    assert.deepEqual(discoveries.collected(), [0, 1, 2, 3, 4]);
  } finally { discoveries.dispose(); }
});

test('restoring a journal filters invalid/duplicate IDs and never revives already collected tokens', () => {
  const scene = new THREE.Scene(), discoveries = createDiscoveries(scene);
  try {
    discoveries.reset([4, 0, 4, -1, 1.5, NaN, Infinity, 5, '2']);
    assert.deepEqual(discoveries.collected(), [0, 4]);
    for (const id of [0, 4]) {
      assert.equal(discoveries.update(1, at(MEMORY_SPARKS[id]), true, false), null);
      assert.equal(discoveries.group.getObjectByName(MEMORY_SPARKS[id].title).visible, false);
    }
    const returnedIDs = discoveries.collected(); returnedIDs.push(2);
    assert.deepEqual(discoveries.collected(), [0, 4], 'Callers cannot mutate stored collection state');
    assert.equal(discoveries.update(2, at(MEMORY_SPARKS[1]), true, false)?.id, 1);
    discoveries.reset([]);
    assert.deepEqual(discoveries.collected(), []);
    assert.equal(discoveries.update(3, at(MEMORY_SPARKS[0]), true, false)?.id, 0);
  } finally { discoveries.dispose(); }
});

test('every memory can be reached from spawn within real courtyard bounds and collider clearance', () => {
  const scene = new THREE.Scene(), world = createWinterWorld(scene);
  try {
    const blocked = (x, z) => world.colliders.some(b => x > b.min.x - .35 && x < b.max.x + .35 && z > b.min.z - .35 && z < b.max.z + .35);
    const queue = [[0, 52]], visited = new Set(['0,52']);
    assert.equal(blocked(0, 26), false);
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = x + dx, b = z + dz, key = `${a},${b}`;
        if (a < -60 || a > 60 || b < -54 || b > 66 || visited.has(key) || blocked(a / 2, b / 2)) continue;
        visited.add(key); queue.push([a, b]);
      }
    }
    for (const memory of MEMORY_SPARKS) {
      const [x, z] = memory.position;
      assert.ok(x >= -30 && x <= 30 && z >= -27 && z <= 33, `${memory.title} lies inside playable bounds`);
      assert.equal(blocked(x, z), false, `${memory.title} does not overlap a collider`);
      assert.ok(queue.some(([a, b]) => Math.hypot(a / 2 - x, b / 2 - z) < 1.15), `${memory.title} has a walkable route from spawn`);
    }
  } finally { world.dispose(); }
});

test('reduced-motion mode keeps pickups usable and suppresses burst animation', () => {
  const scene = new THREE.Scene(), discoveries = createDiscoveries(scene);
  try {
    const first = MEMORY_SPARKS[0];
    assert.equal(discoveries.update(0, at(first), true, true)?.id, first.id);
    discoveries.celebrate(at(first));
    let points; discoveries.group.traverse(o => { if (o.isPoints) points = o; });
    assert.ok(points); assert.equal(points.visible, false);
    assert.ok(points.geometry.attributes.sparkAlpha.array.every(alpha => alpha === 0));
    const token = discoveries.group.getObjectByName(MEMORY_SPARKS[1].title);
    const before = token.children.map(o => [o.position.toArray(), o.rotation.toArray(), o.scale.toArray()]);
    discoveries.update(5, new THREE.Vector3(0, 0, 26), false, true);
    assert.deepEqual(token.children.map(o => [o.position.toArray(), o.rotation.toArray(), o.scale.toArray()]), before);
  } finally { discoveries.dispose(); }
});

test('disposal removes the group and releases shared resources exactly once', () => {
  const scene = new THREE.Scene(), discoveries = createDiscoveries(scene);
  const resources = new Set(), counts = new Map();
  discoveries.group.traverse(o => {
    if (o.geometry) resources.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => resources.add(m));
  });
  resources.forEach(resource => { counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1)); });
  discoveries.dispose(); discoveries.dispose();
  assert.equal(scene.children.length, 0);
  resources.forEach(resource => assert.equal(counts.get(resource), 1));
  discoveries.reset([]); discoveries.celebrate(new THREE.Vector3());
  assert.equal(discoveries.update(10, at(MEMORY_SPARKS[0]), true, false), null);
});
