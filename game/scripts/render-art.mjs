/** Render the original canvas artwork without a browser or a game renderer.
 * This is an artwork/runtime smoke test, not gameplay or browser QA.
 * Run: node scripts/render-art.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const source = (await fs.readFile(path.join(root, 'src/game/art.ts'), 'utf8'))
  .replace("import Phaser from 'phaser';", 'const Phaser = { BlendModes: { SCREEN: 3, ADD: 1 } };');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { createTextures } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const textures = new Map();
globalThis.document = { createElement(tag) { assert.equal(tag, 'canvas'); return createCanvas(1, 1); } };
const scene = { textures: {
  exists: key => textures.has(key),
  addCanvas(key, canvas) { const entry = { key, canvas, frameWidth: canvas.width, frameHeight: canvas.height }; textures.set(key, entry); return entry; },
  addSpriteSheet(_key, texture, config) { texture.frameWidth = config.frameWidth; texture.frameHeight = config.frameHeight; return texture; },
} };
createTextures(scene);
assert.equal(textures.size, 19);
const c = createCanvas(1600, 1060);
const ctx = c.getContext('2d');
ctx.fillStyle = '#0c222b'; ctx.fillRect(0, 0, c.width, c.height);
const draw = (key, x, y, scale = 1, frame = 0) => {
  const t = textures.get(key); assert.ok(t, `Missing texture ${key}`);
  ctx.drawImage(t.canvas, frame * t.frameWidth, 0, t.frameWidth, t.frameHeight, x, y, t.frameWidth * scale, t.frameHeight * scale);
};
draw('forest-sky', 0, 0);
for (const key of ['forest-far', 'forest-near']) { const t = textures.get(key); ctx.drawImage(t.canvas, 0, 0, 1280, 720, 0, 0, 1280, 720); }
draw('forest-rays', 0, 0);
draw('forest-floor-decor', 0, 550);
for (let x = 0; x < 1280; x += 128) { draw('ground', x, 620); draw('ground', x, 680); }
draw('hero', 295, 540);
draw('shrine', 390, 508);
draw('boulder', 605, 510);
draw('chest', 816, 572);
draw('guardian', 1035, 440);
draw('enemy', 730, 556);
draw('platform', 540, 455);
draw('crystal', 404, 411);
draw('star', 589, 388);
draw('coin', 470, 565); draw('coin', 503, 565); draw('coin', 536, 565);
draw('forest-vignette', 0, 0);
ctx.fillStyle = '#e5edd4'; ctx.font = '22px Georgia'; ctx.fillText('WHISPERING FOREST · ORIGINAL CANVAS ART', 35, 46);
ctx.font = '14px sans-serif'; ctx.fillStyle = '#9fb7aa'; ctx.fillText('Artwork composition preview — not a browser gameplay screenshot', 35, 70);
ctx.fillStyle = '#152e35'; ctx.fillRect(1280, 0, 320, 720);
ctx.fillStyle = '#e5edd4'; ctx.font = '20px Georgia'; ctx.fillText('FOREST GUARDIAN', 1300, 36);
for (let i = 0; i < 4; i++) draw('guardian', 1280 + (i % 2) * 160, 62 + Math.floor(i / 2) * 190, 1, i);
ctx.font = '17px Georgia'; ctx.fillStyle = '#e5edd4'; ctx.fillText('CORRUPTED SPROUT', 1300, 500);
for (let i = 0; i < 4; i++) draw('enemy', 1290 + i * 72, 530, 1, i);
ctx.font = '20px Georgia'; ctx.fillStyle = '#e5edd4'; ctx.fillText('THE ADVENTURER · 12 ANIMATION FRAMES', 30, 763);
const labels = ['Idle 1', 'Idle 2', 'Run 1', 'Run 2', 'Run 3', 'Run 4', 'Jump', 'Fall', 'Attack', 'Hurt', 'Cast', 'Defeat'];
for (let i = 0; i < 12; i++) {
  const x = 14 + i * 131;
  draw('hero', x, 790, 1.9, i);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#9fb7aa'; ctx.fillText(labels[i], x + 28, 966);
}
ctx.font = '14px sans-serif'; ctx.fillStyle = '#9fb7aa'; ctx.fillText('19 deterministic textures · no downloaded art · parallax backgrounds / foliage / sunlight / atmospheric motes', 30, 1020);
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
const output = path.join(root, 'artifacts/art-contact-sheet.png');
await fs.writeFile(output, c.toBuffer('image/png'));
// Also rasterize the menu illustration to verify its SVG is valid and renderable.
const title = await loadImage(await fs.readFile(path.join(root, 'public/art/title-forest.svg')));
const titleCanvas = createCanvas(1440, 880);
titleCanvas.getContext('2d').drawImage(title, 0, 0, 1440, 880);
await fs.writeFile(path.join(root, 'artifacts/title-forest-preview.png'), titleCanvas.toBuffer('image/png'));
console.log(`Rendered ${textures.size} textures successfully.\n${output}\n${path.join(root, 'artifacts/title-forest-preview.png')}`);
