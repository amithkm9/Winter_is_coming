/** Actual Phaser HEADLESS runtime smoke. This is not a browser or player-route test. */
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { createCanvas, Image } from '@napi-rs/canvas';

const browser = new Window({ url: 'http://localhost:5173' });
for (const name of ['window', 'document', 'navigator', 'screen', 'Element', 'HTMLElement', 'HTMLCanvasElement', 'HTMLVideoElement', 'CustomEvent', 'Event', 'localStorage', 'performance']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? browser : browser[name] });
}
globalThis.Image = Image;
browser.Image = Image;
globalThis.requestAnimationFrame = browser.requestAnimationFrame.bind(browser);
globalThis.cancelAnimationFrame = browser.cancelAnimationFrame.bind(browser);
const canvasStore = new WeakMap();
const nativeCanvas = element => {
  let native = canvasStore.get(element);
  if (!native) { native = createCanvas(element.width || 300, element.height || 150); canvasStore.set(element, native); }
  if (native.width !== element.width) native.width = element.width;
  if (native.height !== element.height) native.height = element.height;
  return native;
};
browser.HTMLCanvasElement.prototype.getContext = function(type) {
  if (type !== '2d') return null;
  const native = nativeCanvas(this);
  const context = native.getContext('2d');
  return new Proxy(context, {
    get(target, property) {
      if (property === 'drawImage') return (source, ...args) => target.drawImage(source instanceof browser.HTMLCanvasElement ? nativeCanvas(source) : source, ...args);
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) { return Reflect.set(target, property, value, target); },
  });
};
browser.HTMLCanvasElement.prototype.toDataURL = function(...args) { return nativeCanvas(this).toDataURL(...args); };

const scratch = await mkdtemp(path.join(tmpdir(), 'learnsign-runtime-'));
let game;
try {
  const output = path.join(scratch, 'game.mjs');
  await build({ stdin: { contents: "import Phaser from 'phaser'; import GameScene from './src/game/GameScene.ts'; export { Phaser, GameScene };", resolveDir: process.cwd() }, bundle: true, outfile: output, format: 'esm', platform: 'browser', logLevel: 'silent' });
  const { Phaser, GameScene } = await import(pathToFileURL(output).href);
  game = new Phaser.Game({ type: Phaser.HEADLESS, width: 1280, height: 720, banner: false,
    audio: { noAudio: true }, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1400 } } }, scene: [GameScene],
    fps: { forceSetTimeOut: true },
  });
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => { clearInterval(poll); reject(new Error('Phaser scene did not boot within 8 seconds')); }, 8000);
    const poll = setInterval(() => { const scene = game.scene.getScene('GameScene'); if (scene?.hero) { clearInterval(poll); clearTimeout(deadline); resolve(); } }, 20);
  });
  game.loop.stop();
  let scene = game.scene.getScene('GameScene');
  const dispatch = (name, detail = {}) => browser.dispatchEvent(new browser.CustomEvent(name, { detail }));
  let time = 0;
  const step = (count = 1) => { for (let i = 0; i < count; i++) { time += 1000 / 60; game.headlessStep(time, 1000 / 60); } };
  const cast = sign => { scene.signReady = 0; dispatch('ls:gesture', { sign, source: 'keyboard' }); };
  assert.equal(scene.textures.get('hero').frameTotal, 13, '12 actual hero animation frames plus base');
  assert.equal(scene.activeRun, false);
  dispatch('ls:start', { continue: false }); step(30);
  assert.equal(scene.activeRun, true);
  assert.ok(scene.hero.body.blocked.down, 'hero lands on real Arcade ground collider');
  const elapsed = scene.elapsed;
  dispatch('ls:pause', { paused: true }); step(20);
  assert.equal(scene.elapsed, elapsed, 'pause freezes elapsed gameplay');
  dispatch('ls:pause', { paused: false });
  scene.cursors.right.isDown = true; const beforeX = scene.hero.x; step(15); scene.cursors.right.isDown = false;
  assert.ok(scene.hero.x > beforeX + 30, 'actual physics advances movement');
  scene.hero.setPosition(300, 200).setVelocity(0, 0); step(30); const normalFall = scene.hero.y - 200;
  scene.hero.setPosition(300, 200).setVelocity(0, 0); dispatch('ls:focus'); step(30);
  assert.ok(scene.hero.y - 200 < normalFall * .25, 'focus slows actual gravity, not only game timers');
  dispatch('ls:focus'); assert.equal(scene.focused, false);
  cast('C'); assert.equal(scene.unlocked.has('C'), false, 'remote sign cannot unlock a shrine');
  for (const [sign, x] of [['A', 500], ['B', 1820], ['C', 3100]]) {
    scene.hero.setPosition(x, 550); cast(sign); assert.ok(scene.unlocked.has(sign), `${sign} shrine unlocks`); step(2);
  }
  scene.hero.setPosition(1130, 550); cast('A'); assert.equal(scene.gates.get('boulder').active, false);
  scene.hero.setPosition(3680, 550); cast('C'); assert.equal(scene.gates.get('ruins').active, false);
  scene.hero.setPosition(4090, 550); for (const sign of ['A', 'C', 'B']) cast(sign);
  assert.equal(scene.puzzleDone, true); assert.equal(scene.gates.get('puzzle').active, false);
  const enemy = scene.enemies[0]; scene.hitEnemy(enemy, 2);
  assert.ok(scene.defeated.has('enemy-0')); const rewards = scene.coins;
  scene.hitEnemy(enemy, 2); assert.equal(scene.coins, rewards, 'enemy reward cannot repeat');
  scene.hero.setPosition(4850, 550); step(1); assert.equal(scene.bossStarted, true);
  cast('B'); scene.spawnOrb(scene.hero.x + 30, scene.hero.y, 'boss'); scene.updateOrbs(16);
  assert.equal(scene.orbs.at(-1).reflected, true, 'B reflects a real Arcade projectile');
  scene.orbs.at(-1).sprite.setPosition(scene.boss.x - 20, scene.boss.y); scene.updateOrbs(16);
  assert.ok(scene.vulnerableUntil > scene.clock, 'reflected projectile opens vulnerability');
  cast('A'); assert.equal(scene.bossHealth, 5);
  while (scene.bossHealth > 0) { scene.vulnerableUntil = scene.clock + 1000; cast('A'); }
  cast('A'); cast('B'); cast('C'); assert.equal(scene.finished, true);
  scene.save(); const saved = JSON.parse(localStorage.getItem('learnsign-save-v1'));
  assert.equal(saved.complete, true); assert.ok(saved.defeated.includes('enemy-0'));
  dispatch('ls:start', { continue: true }); step(3); scene = game.scene.getScene('GameScene');
  assert.equal(scene.finished, true); assert.equal(scene.enemies[0].sprite.active, false, 'Continue restores defeated enemy');
  dispatch('ls:restart'); step(3); scene = game.scene.getScene('GameScene');
  assert.equal(scene.finished, false); assert.equal(scene.unlocked.size, 0); assert.equal(scene.coins, 0);
  console.log('PASS: Phaser HEADLESS scene/textures/colliders, movement, pause, focus gravity, shrines, gates, puzzle, enemy rewards, boss reflect/finish, save/continue/restart.');
  console.log('This emulated runtime test does not verify browser rendering, real keyboard timing, or the complete player route.');
} finally {
  if (game) { game.destroy(true); if (game.runDestroy) game.runDestroy(); }
  await browser.happyDOM.close();
  await rm(scratch, { recursive: true, force: true });
}
