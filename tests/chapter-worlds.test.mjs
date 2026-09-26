import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createChapterWorld } from '../src/winter/chapter-worlds.ts';
import { WinterMission, CAPTURE_SECONDS } from '../src/winter/mission.ts';

const CHAPTERS = ['canal', 'glasshouse', 'observatory', 'spire'];
const MEMORIES = [[-6, 24], [-18, 18], [18, 5], [-18, -10], [0, -21]];
function reachable(world) {
  const { minX, maxX, minZ, maxZ } = world.bounds;
  const blocked = (x, z) => world.colliders.some(b => x > b.min.x - .35 && x < b.max.x + .35 && z > b.min.z - .35 && z < b.max.z + .35);
  const queue = [[world.spawn.x * 2, world.spawn.z * 2]], seen = new Set([queue[0].join(',')]);
  assert.equal(blocked(world.spawn.x, world.spawn.z), false, 'Spawn is clear');
  for (let index = 0; index < queue.length; index++) {
    const [x, z] = queue[index];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, key = `${nx},${nz}`;
      if (nx < minX * 2 || nx > maxX * 2 || nz < minZ * 2 || nz > maxZ * 2 || seen.has(key) || blocked(nx / 2, nz / 2)) continue;
      seen.add(key); queue.push([nx, nz]);
    }
  }
  return { near: (position, radius) => queue.some(([x, z]) => Math.hypot(x / 2 - position.x, z / 2 - position.z) < radius), count: queue.length };
}

for (const chapter of CHAPTERS) {
  test(`${chapter}: each real gate prevents skipping, and restoring it opens the next route`, () => {
    const scene = new THREE.Scene(), world = createChapterWorld(scene, chapter), colliderReference = world.colliders;
    try {
      assert.deepEqual(world.spawn.toArray(), [0, 0, 26]); assert.deepEqual(world.core.toArray(), [0, 0, -23]);
      assert.deepEqual(world.relays.map(r => r.position.toArray()), [[-10, 0, 18], [10, 0, 5], [-10, 0, -10]]);
      let previousArea = 0;
      for (let completed = 0; completed <= 3; completed++) {
        const ids = Array.from({ length: completed }, (_, i) => i); world.update(completed, 0, ids, false);
        assert.equal(world.colliders, colliderReference, 'Collider references stay live across gate changes');
        const route = reachable(world);
        assert.ok(route.count > previousArea, 'Each gate opens additional ground'); previousArea = route.count;
        for (let i = 0; i < 3; i++) assert.equal(route.near(world.relays[i].position, i <= completed ? 2 : 4.5), i <= completed, `Relay ${i} cannot be activated through a preceding locked gate`);
        assert.equal(route.near(world.core, completed === 3 ? 2 : 4.5), completed === 3, 'The core only becomes reachable after all three gates');
        for (let gate = 0; gate < 3; gate++) {
          assert.equal(world.group.getObjectByName(`closed-gate-${gate}`).visible, gate >= completed);
          assert.equal(world.group.getObjectByName(`open-gate-${gate}`).visible, gate < completed);
        }
      }
      for (const [x, z] of MEMORIES) assert.ok(reachable(world).near(new THREE.Vector3(x, 0, z), 1.15), `Optional memory (${x},${z}) is reachable`);
      world.update(20, 0, [], false); assert.ok(reachable(world).near(world.core, 2), 'Restored gates never unexpectedly close');
    } finally { world.dispose(); }
  });

  test(`${chapter}: timed hazards exactly match their marked areas and stop after liberation`, () => {
    const scene = new THREE.Scene(), world = createChapterWorld(scene, chapter);
    try {
      const center = new THREE.Vector3(1, 0, 21);
      const ring = world.group.getObjectByName('hazard-ring-0');
      for (const time of [0, 3.5, 4.99, 12, 13.99, 14, 18.99]) {
        world.update(time, 0, [], false); assert.equal(world.isHazard(center, time), false);
        assert.notEqual(ring.material.color.getHex(), 0xed708e, 'Safe or warning fields never show the active color');
      }
      for (const time of [5, 6, 7.2, 10, 11.99, 19, 25.99]) {
        world.update(time, 0, [], false); assert.equal(world.isHazard(center, time), true);
        assert.equal(ring.material.color.getHex(), 0xed708e, 'A damaging field is visibly red');
      }
      for (const time of [3.4, 4.99]) { world.update(time, 0, [], false); assert.equal(ring.material.color.getHex(), 0xf3bd73, 'Amber telegraph precedes the active field'); }
      assert.equal(world.isHazard(center.clone().add(new THREE.Vector3(3.16, 0, 0)), 6), false, 'Stepping outside the visible radius is safe');
      assert.equal(world.isHazard(world.spawn, 6), false, 'Spawn is never inside a hazard');
      world.update(6, 1, [0, 1, 2], false); assert.equal(world.isHazard(center, 6), false);
      world.update(15, 0, [], false); assert.equal(world.isHazard(center, 15), false, 'A liberated chapter cannot silently re-enable hazards');
    } finally { world.dispose(); }
  });

  test(`${chapter}: standing in an active field causes capture before the seven-second burst ends`, () => {
    const world = createChapterWorld(new THREE.Scene(), chapter), mission = new WinterMission(chapter);
    const center = new THREE.Vector3(1, 0, 21); mission.start();
    try {
      for (let frame = 1; frame <= CAPTURE_SECONDS * 4; frame++) {
        const time = 5 + frame / 4; world.update(time, 0, [], false);
        assert.equal(world.isHazard(center, time), true);
        mission.tick(.25, world.isHazard(center, time));
      }
      assert.equal(mission.state.phase, 'caught'); assert.equal(mission.state.respawns, 1);
      assert.equal(world.isHazard(center, 10), true, 'Capture happens while the hazard is still active');
    } finally { world.dispose(); }
  });

  test(`${chapter}: leaving the marked field before capture clears its continuous countdown`, () => {
    const world = createChapterWorld(new THREE.Scene(), chapter), mission = new WinterMission(chapter);
    const center = new THREE.Vector3(1, 0, 21), outside = center.clone().add(new THREE.Vector3(3.16, 0, 0)); mission.start();
    try {
      world.update(9, 0, [], true); mission.tick(4, world.isHazard(center, 9));
      assert.equal(mission.state.captureSecondsRemaining, 1);
      mission.tick(.25, world.isHazard(outside, 9.25));
      assert.equal(mission.state.captureSecondsRemaining, CAPTURE_SECONDS); assert.equal(mission.state.alert, 0);
      for (let frame = 1; frame <= 12; frame++) {
        const time = 9.25 + frame / 4; world.update(time, 0, [], true); mission.tick(.25, world.isHazard(center, time));
      }
      assert.equal(mission.state.phase, 'explore'); assert.equal(mission.state.respawns, 0);
      assert.equal(mission.state.captureSecondsRemaining, CAPTURE_SECONDS);
    } finally { world.dispose(); }
  });

  test(`${chapter}: geometry stays finite, reduced motion is static, quality lowers decoration, and disposal is idempotent`, () => {
    const scene = new THREE.Scene(), world = createChapterWorld(scene, chapter);
    const resources = new Set(), counts = new Map();
    const snapshot = () => { world.group.updateMatrixWorld(true); const matrices = []; world.group.traverse(o => matrices.push([...o.matrixWorld.elements])); return matrices; };
    world.group.traverse(o => {
      if (o.geometry) { resources.add(o.geometry); assert.ok(o.geometry.attributes.position.array.every(Number.isFinite)); }
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => resources.add(m));
      if (o.isInstancedMesh) assert.ok(o.instanceMatrix.array.every(Number.isFinite));
    });
    world.update(1, 0, [], true); const first = snapshot(); world.update(18, 0, [], true); assert.deepEqual(snapshot(), first);
    assert.ok(first.flat().every(Number.isFinite));
    world.setQuality(true); world.update(20, 0, [], false);
    assert.equal(world.group.getObjectByName('chapter-motes').visible, false);
    assert.ok(world.relays.every(r => r.light.intensity === 0));
    world.setQuality(false); world.update(21, 0, [], false); assert.equal(world.group.getObjectByName('chapter-motes').visible, true);
    resources.forEach(resource => { counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1)); });
    world.dispose(); world.dispose(); assert.equal(scene.children.length, 0);
    resources.forEach(resource => assert.equal(counts.get(resource), 1, 'Every shared GPU resource is released exactly once'));
    assert.equal(world.isHazard(new THREE.Vector3(1, 0, 21), 6), false);
  });
}
