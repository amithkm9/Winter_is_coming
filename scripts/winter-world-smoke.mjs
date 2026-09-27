/** Geometry + navigation smoke test and CPU artwork preview.
 * Does not launch a browser or claim to validate WebGL rendering.
 * Run: node scripts/winter-world-smoke.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createWinterWorld } from '../src/winter/world.ts';
import { projectView, width, height } from './lib/world-preview.mjs';
import * as THREE from 'three';
import { createCanvas } from '@napi-rs/canvas';

const root = path.resolve(import.meta.dirname, '..');
const scene = new THREE.Scene();
const world = createWinterWorld(scene);
assert.equal(world.relays.length, 3);
assert.equal(world.drones.length, 3);
assert.equal(scene.children.length, 1);
assert.deepEqual(
  world.relays.map((r) => r.id),
  [0, 1, 2],
);
assert.ok(
  world.colliders.every((b) => !b.isEmpty()),
  'Every collider must have finite extent',
);

let meshes = 0,
  renderedInstances = 0,
  triangles = 0;
world.group.traverse((o) => {
  if (o.isMesh) {
    meshes++;
    const count = o.isInstancedMesh ? o.count : 1;
    renderedInstances += count;
    triangles += ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) * count;
    assert.ok(o.geometry.attributes.position.count > 0, 'Geometry must have vertices');
  }
});
for (const state of [
  [0, 0, [], false],
  [16, 0.5, [0], false],
  [40, 1, [0, 1, 2], true],
]) {
  world.update(...state);
  world.group.updateMatrixWorld(true);
  world.group.traverse((o) => {
    assert.ok(
      o.matrixWorld.elements.every(Number.isFinite),
      `Finite transform: ${o.name || o.type}`,
    );
    if (o.isMesh) {
      assert.ok(o.geometry.attributes.position.array.every(Number.isFinite), 'Finite vertices');
    }
  });
}

// Half-meter grid; player body radius 0.4m. Do not walk through low basins/benches.
const blocked = (x, z) =>
  world.colliders.some(
    (b) => x > b.min.x - 0.4 && x < b.max.x + 0.4 && z > b.min.z - 0.4 && z < b.max.z + 0.4,
  );
const queue = [[0, 52]],
  seen = new Set(['0,52']);
assert.equal(blocked(0, 26), false, 'Start must be walkable');
for (let i = 0; i < queue.length; i++) {
  const [x, z] = queue[i];
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const a = x + dx,
      b = z + dz,
      key = `${a},${b}`;
    if (a < -60 || a > 60 || b < -54 || b > 66 || seen.has(key) || blocked(a / 2, b / 2)) continue;
    seen.add(key);
    queue.push([a, b]);
  }
}
for (const relay of [...world.relays, { name: 'Core', position: world.core }]) {
  assert.ok(
    queue.some(([x, z]) => Math.hypot(x / 2 - relay.position.x, z / 2 - relay.position.z) < 1.8),
    `Reach ${relay.name} within interaction range`,
  );
}

// Project the actual mesh triangles into an offline canvas. A deliberately simple
// depth-buffer renderer checks composition, mesh orientation and object placement.
// It omits WebGL materials, shadows, bloom, snow effects and the game HUD.

world.update(8, 0, [], false);
world.group.updateMatrixWorld(true);
const aerial = new THREE.PerspectiveCamera(54, width / height, 0.1, 300);
aerial.position.set(34, 29, 47);
aerial.lookAt(0, 5, -8);
const street = new THREE.PerspectiveCamera(62, width / height, 0.1, 300);
street.position.set(0, 3.6, 31);
street.lookAt(0, 5.2, -10);
const canvas = createCanvas(width, height * 2);
const ctx = canvas.getContext('2d');
ctx.drawImage(projectView(world, aerial, 'WINTER IS COMING / THE FROZEN LOUVRE'), 0, 0);
ctx.drawImage(projectView(world, street, 'COUR NAPOLÉON / APPROACH TO THE CORE'), 0, height);
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
const output = path.join(root, 'artifacts/winter-world-preview.png');
await fs.writeFile(output, canvas.toBuffer('image/png'));

world.dispose();
world.dispose();
assert.equal(scene.children.length, 0, 'Disposal must remove world and be idempotent');
console.log(
  JSON.stringify(
    {
      meshes,
      renderedInstances,
      triangles,
      colliders: world.colliders.length,
      reachableCells: seen.size,
      allRelaysAndCoreReachableWithin: 1.8,
      finiteTransforms: true,
      disposal: 'passed',
      preview: output,
    },
    null,
    2,
  ),
);
