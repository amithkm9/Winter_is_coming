/** Offline geometry composition check. No browser automation or WebGL renderer. */
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { createCanvas } from '@napi-rs/canvas';
import { createChapterWorld } from '../src/winter/chapter-worlds.ts';

import { projectView } from './lib/world-preview.mjs';

const chapters = [
  {
    id: 'canal',
    label: '02 / UNDER THE ICE · CANAL SAINT-MARTIN',
    position: [26, 23, 38],
    target: [0, 2, -6],
  },
  {
    id: 'glasshouse',
    label: '03 / A PLACE TO GROW · THE GLASSHOUSE',
    position: [0, 8, 32],
    target: [0, 6, -15],
  },
  {
    id: 'observatory',
    label: '04 / BEYOND THE CLOUDS · OBSERVATORY',
    position: [24, 19, 34],
    target: [0, 7, -13],
  },
  {
    id: 'spire',
    label: '05 / THE RETURNING DAWN · NEXUS SPIRE',
    position: [24, 21, 37],
    target: [0, 13, -14],
  },
];
const canvas = createCanvas(1920, 1080),
  ctx = canvas.getContext('2d');
const stats = [];
for (const [index, chapter] of chapters.entries()) {
  const scene = new THREE.Scene(),
    world = createChapterWorld(scene, chapter.id);
  world.update(8.5, 0.2, [0, 1], false);
  world.group.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(
    chapter.id === 'spire' ? 61 : 57,
    1440 / 810,
    0.1,
    300,
  );
  camera.position.fromArray(chapter.position);
  camera.lookAt(new THREE.Vector3(...chapter.target));
  const picture = projectView(world, camera, chapter.label);
  ctx.drawImage(picture, (index % 2) * 960, Math.floor(index / 2) * 540, 960, 540);
  let drawObjects = 0,
    instances = 0,
    triangles = 0;
  world.group.traverse((o) => {
    if (o.isMesh) {
      drawObjects++;
      const n = o.isInstancedMesh ? o.count : 1;
      instances += n;
      triangles += ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) * n;
    }
  });
  stats.push({ chapter: chapter.id, drawObjects, instances, triangles });
  world.dispose();
}
await fs.mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
const output = new URL('../artifacts/chapter-worlds-preview.png', import.meta.url);
await fs.writeFile(output, canvas.toBuffer('image/png'));
console.log(JSON.stringify({ output: output.pathname, worlds: stats }, null, 2));
