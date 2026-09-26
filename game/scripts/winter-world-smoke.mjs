/** Geometry + navigation smoke test and CPU artwork preview.
 * Does not launch a browser or claim to validate WebGL rendering.
 * Run: node scripts/winter-world-smoke.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';
import { createCanvas } from '@napi-rs/canvas';

const root = path.resolve(import.meta.dirname, '..');
const source = await fs.readFile(path.join(root, 'src/winter/world.ts'), 'utf8');
const threeURL = pathToFileURL(path.join(root, 'node_modules/three/build/three.module.js')).href;
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace("from 'three'", `from '${threeURL}'`);
const { createWinterWorld } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const scene = new THREE.Scene();
const world = createWinterWorld(scene);
assert.equal(world.relays.length, 3);
assert.equal(world.drones.length, 3);
assert.equal(scene.children.length, 1);
assert.deepEqual(world.relays.map(r => r.id), [0, 1, 2]);
assert.ok(world.colliders.every(b => !b.isEmpty()), 'Every collider must have finite extent');

let meshes = 0, renderedInstances = 0, triangles = 0;
world.group.traverse(o => {
  if (o.isMesh) {
    meshes++; const count = o.isInstancedMesh ? o.count : 1; renderedInstances += count;
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * count;
    assert.ok(o.geometry.attributes.position.count > 0, 'Geometry must have vertices');
  }
});
for (const state of [[0, 0, [], false], [16, .5, [0], false], [40, 1, [0, 1, 2], true]]) {
  world.update(...state);
  world.group.updateMatrixWorld(true);
  world.group.traverse(o => {
    assert.ok(o.matrixWorld.elements.every(Number.isFinite), `Finite transform: ${o.name || o.type}`);
    if (o.isMesh) { assert.ok(o.geometry.attributes.position.array.every(Number.isFinite), 'Finite vertices'); }
  });
}

// Half-meter grid; player body radius 0.4m. Do not walk through low basins/benches.
const blocked = (x, z) => world.colliders.some(b => x > b.min.x - .4 && x < b.max.x + .4 && z > b.min.z - .4 && z < b.max.z + .4);
const queue = [[0, 52]], seen = new Set(['0,52']);
assert.equal(blocked(0, 26), false, 'Start must be walkable');
for (let i = 0; i < queue.length; i++) {
  const [x, z] = queue[i];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = x + dx, b = z + dz, key = `${a},${b}`;
    if (a < -60 || a > 60 || b < -54 || b > 66 || seen.has(key) || blocked(a / 2, b / 2)) continue;
    seen.add(key); queue.push([a, b]);
  }
}
for (const relay of [...world.relays, { name: 'Core', position: world.core }]) {
  assert.ok(queue.some(([x, z]) => Math.hypot(x / 2 - relay.position.x, z / 2 - relay.position.z) < 1.8), `Reach ${relay.name} within interaction range`);
}

// Project the actual mesh triangles into an offline canvas. A deliberately simple
// depth-buffer renderer checks composition, mesh orientation and object placement.
// It omits WebGL materials, shadows, bloom, snow effects and the game HUD.
const width = 1440, height = 810;
const fogColor = new THREE.Color(0x172635);
const sunlight = new THREE.Vector3(-.6, 1, .4).normalize();
function projectView(camera, label) {
  camera.aspect = width / height; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const canvas = createCanvas(width, height), ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#0c1624'); sky.addColorStop(.65, '#213a4d'); sky.addColorStop(1, '#1a2c3c'); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  const moon = ctx.createRadialGradient(width * .23, height * .18, 0, width * .23, height * .18, 160); moon.addColorStop(0, '#9ed3e82a'); moon.addColorStop(1, '#9ed3e800'); ctx.fillStyle = moon; ctx.fillRect(0, 0, width, height);
  const primitives = [];
  const worldMatrix = new THREE.Matrix4(), instanceMatrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const vertices = [], screenVertices = [], depths = [], normals = [];
  world.group.traverse(o => {
    if (!(o.isMesh || o.isLine) || !o.visible) return;
    const geometry = o.geometry, pos = geometry.attributes.position, nor = geometry.attributes.normal;
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    if (material.visible === false || material.opacity === 0) return;
    const instances = o.isInstancedMesh ? o.count : 1;
    for (let n = 0; n < instances; n++) {
      worldMatrix.copy(o.matrixWorld);
      if (o.isInstancedMesh) { o.getMatrixAt(n, instanceMatrix); worldMatrix.multiply(instanceMatrix); }
      normalMatrix.getNormalMatrix(worldMatrix);
      for (let i = 0; i < pos.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(worldMatrix); vertices[i] = vertex;
        depths[i] = -vertex.clone().applyMatrix4(camera.matrixWorldInverse).z;
        const clip = vertex.clone().applyMatrix4(projection); screenVertices[i] = [(clip.x * .5 + .5) * width, (-clip.y * .5 + .5) * height];
        if (nor) normals[i] = new THREE.Vector3().fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
      }
      const indices = geometry.index, count = indices?.count ?? pos.count;
      if (o.isLine) {
        const jump = o.isLineSegments ? 2 : 1;
        for (let i = 0; i < count - 1; i += jump) {
          const a = indices ? indices.getX(i) : i, b = indices ? indices.getX(i + 1) : i + 1;
          if (depths[a] < .5 || depths[b] < .5) continue;
          const color = (material.color ?? new THREE.Color(0xffffff)).clone().convertLinearToSRGB();
          primitives.push({ points: [screenVertices[a], screenVertices[b]], depths: [depths[a], depths[b]], depth: (depths[a] + depths[b]) / 2 - .02, rgb: [color.r * 255, color.g * 255, color.b * 255], alpha: (material.opacity ?? 1) * .85, line: true });
        }
        continue;
      }
      for (let i = 0; i < count; i += 3) {
        const a = indices ? indices.getX(i) : i, b = indices ? indices.getX(i + 1) : i + 1, c = indices ? indices.getX(i + 2) : i + 2;
        if (depths[a] < .5 || depths[b] < .5 || depths[c] < .5) continue;
        const pa = screenVertices[a], pb = screenVertices[b], pc = screenVertices[c];
        if ([pa, pb, pc].every(p => p[0] < -20) || [pa, pb, pc].every(p => p[0] > width + 20) || [pa, pb, pc].every(p => p[1] < -20) || [pa, pb, pc].every(p => p[1] > height + 20)) continue;
        const area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
        if (material.side !== THREE.DoubleSide && area > 0) continue;
        const normal = nor ? normals[a].clone().add(normals[b]).add(normals[c]).normalize() : vertices[b].clone().sub(vertices[a]).cross(vertices[c].clone().sub(vertices[a])).normalize();
        const light = .24 + Math.max(0, normal.dot(sunlight)) * .65 + Math.max(0, normal.y) * .12;
        const color = (material.color ?? new THREE.Color(0xffffff)).clone();
        if (!material.isMeshBasicMaterial) { color.multiplyScalar(light); if (material.emissive) color.add(material.emissive.clone().multiplyScalar((material.emissiveIntensity ?? 1) * .48)); }
        const depth = (depths[a] + depths[b] + depths[c]) / 3;
        color.lerp(fogColor, Math.min(.72, 1 - Math.exp(-depth * depth / 26000)));
        color.convertLinearToSRGB();
        primitives.push({ points: [pa, pb, pc], depths: [depths[a], depths[b], depths[c]], depth, rgb: [color.r * 255, color.g * 255, color.b * 255].map(v => Math.min(255, Math.max(0, v))), alpha: material.opacity ?? 1, line: false });
      }
    }
  });
  const pixels = ctx.getImageData(0, 0, width, height), data = pixels.data;
  const zbuffer = new Float64Array(width * height); zbuffer.fill(Infinity);
  const blend = (offset, rgb, alpha) => { for (let k = 0; k < 3; k++) data[offset + k] = data[offset + k] * (1 - alpha) + rgb[k] * alpha; };
  function raster(p, writeDepth) {
    if (p.line) {
      const [a, b] = p.points, steps = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])));
      for (let i = 0; i <= steps; i++) {
        const t = steps ? i / steps : 0, x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t);
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const index = y * width + x, depth = 1 / ((1 - t) / p.depths[0] + t / p.depths[1]);
        if (depth <= zbuffer[index] + .06) blend(index * 4, p.rgb, p.alpha);
      }
      return;
    }
    const [a, b, c] = p.points;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < .01) return;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + .5, py = y + .5;
      const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
      const w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const depth = 1 / (w0 / p.depths[0] + w1 / p.depths[1] + w2 / p.depths[2]), index = y * width + x;
      if (depth > zbuffer[index] + .001) continue;
      blend(index * 4, p.rgb, p.alpha); if (writeDepth) zbuffer[index] = depth;
    }
  }
  for (const p of primitives) if (!p.line && p.alpha >= .999) raster(p, true);
  for (const p of primitives.filter(p => p.line || p.alpha < .999).sort((a, b) => b.depth - a.depth)) raster(p, false);
  ctx.putImageData(pixels, 0, 0);
  const shade = ctx.createLinearGradient(0, 0, 0, 100); shade.addColorStop(0, '#081421e8'); shade.addColorStop(1, '#08142100'); ctx.fillStyle = shade; ctx.fillRect(0, 0, width, 100);
  ctx.fillStyle = '#e1edf2'; ctx.font = '23px Georgia'; ctx.fillText(label, 32, 39);
  ctx.fillStyle = '#9db7c7'; ctx.font = '14px sans-serif'; ctx.fillText('CPU projection of actual world geometry · composition check · not a browser screenshot', 32, 64);
  return canvas;
}

world.update(8, 0, [], false); world.group.updateMatrixWorld(true);
const aerial = new THREE.PerspectiveCamera(54, width / height, .1, 300); aerial.position.set(34, 29, 47); aerial.lookAt(0, 5, -8);
const street = new THREE.PerspectiveCamera(62, width / height, .1, 300); street.position.set(0, 3.6, 31); street.lookAt(0, 5.2, -10);
const canvas = createCanvas(width, height * 2); const ctx = canvas.getContext('2d');
ctx.drawImage(projectView(aerial, 'WINTER IS COMING / THE FROZEN LOUVRE'), 0, 0);
ctx.drawImage(projectView(street, 'COUR NAPOLÉON / APPROACH TO THE CORE'), 0, height);
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
const output = path.join(root, 'artifacts/winter-world-preview.png'); await fs.writeFile(output, canvas.toBuffer('image/png'));

world.dispose(); world.dispose(); assert.equal(scene.children.length, 0, 'Disposal must remove world and be idempotent');
console.log(JSON.stringify({ meshes, renderedInstances, triangles, colliders: world.colliders.length, reachableCells: seen.size, allRelaysAndCoreReachableWithin: 1.8, finiteTransforms: true, disposal: 'passed', preview: output }, null, 2));
