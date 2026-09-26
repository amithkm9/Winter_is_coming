import Phaser from 'phaser';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const palette = { ink: '#102c31', mint: '#9bffcf', gold: '#ffdd8c', bark: '#25484a', blue: '#17424b' };

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
}
function path(c: Ctx, points: number[][], fill: string, stroke?: string, width = 2) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function line(c: Ctx, points: number[][], color: string, width = 2) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function glow(c: Ctx, x: number, y: number, r: number, color = '#9affdc') {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(.12, `${color}88`); g.addColorStop(1, `${color}00`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function texture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void, frames = 1) {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas'); canvas.width = w * frames; canvas.height = h;
  const c = canvas.getContext('2d')!; draw(c);
  const canvasTexture = scene.textures.addCanvas(key, canvas);
  if (frames > 1 && canvasTexture) scene.textures.addSpriteSheet('', canvasTexture, { frameWidth: w, frameHeight: h });
}

function hero(c: Ctx, frame: number) {
  const run = frame >= 2 && frame <= 5; const phase = run ? (frame - 2) * Math.PI / 2 : 0;
  const bob = frame === 1 ? -1 : run ? Math.sin(phase * 2 + .5) * 1.5 : 0;
  c.translate(0, bob); c.lineJoin = 'round';
  if (frame === 11) { c.translate(32, 58); c.rotate(-1.35); c.scale(.68, .68); c.translate(-30, -40); }
  const stretch = run ? Math.sin(phase) * 9 : frame === 6 ? -7 : frame === 7 ? 5 : 0;
  // Wind-tossed travelling cape, lined in warm jade.
  path(c, [[27, 32], [14, 33], [run ? 3 : 10, 48], [run ? 1 : 12, 62], [24, 59], [33, 45]], '#132f37', '#0b252d', 2);
  path(c, [[20, 35], [13, 40], [run ? 4 : 12, 56], [22, 54], [27, 38]], '#34716e');
  line(c, [[18, 40], [14, 52], [20, 53]], '#569083', 1);
  // Boots and trousers change their pose in every running frame.
  line(c, [[27, 54], [25 + stretch, 64], [23 + stretch, frame === 6 ? 67 : 73]], '#183941', 10);
  line(c, [[36, 54], [37 - stretch, 64], [38 - stretch, frame === 6 ? 68 : 73]], '#284952', 10);
  ellipse(c, 25 + stretch, frame === 6 ? 69 : 74, 7, 4, '#192d35');
  ellipse(c, 40 - stretch, frame === 6 ? 70 : 74, 7, 4, '#172a31');
  line(c, [[21 + stretch, 70], [28 + stretch, 70]], '#a8794c', 2);
  line(c, [[34 - stretch, 70], [42 - stretch, 70]], '#bb8752', 2);
  // Jacket silhouette and belt.
  path(c, [[23, 32], [37, 32], [43, 49], [39, 58], [23, 58], [21, 45]], '#32656a', '#142f35', 2);
  path(c, [[27, 35], [36, 35], [39, 52], [32, 57], [27, 52]], '#508782');
  line(c, [[28, 38], [30, 50]], '#77aca0', 1.5);
  line(c, [[23, 52], [40, 52]], '#795638', 4); ellipse(c, 32, 52, 3, 3, '#f0c87b');
  // Little leather pack and straps.
  c.fillStyle = '#9b7448'; c.beginPath(); c.roundRect(12, 35, 10, 18, 4); c.fill();
  line(c, [[15, 39], [20, 39]], '#d3a86a', 2); line(c, [[23, 35], [28, 48]], '#c39a60', 3);
  const handX = frame === 8 ? 54 : frame === 10 ? 49 : 42 + (run ? Math.sin(phase) * 4 : 0);
  const handY = frame === 10 ? 26 : frame === 8 ? 39 : 48;
  line(c, [[36, 37], [40, 43], [handX, handY]], '#21464b', 8);
  line(c, [[37, 37], [41, 43], [handX - 2, handY]], '#4e8480', 5);
  // Ancient gold wrist gauntlet, luminous crystal.
  ellipse(c, handX, handY, 6, 7, '#805d3b'); ellipse(c, handX + 1, handY - 1, 4.6, 5.5, '#dbb675');
  ellipse(c, handX + 1, handY - 2, 2.5, 3.3, '#aaffdd');
  if (frame === 8 || frame === 10) glow(c, handX, handY - 2, 13);
  // Neck, expressive face and ears.
  c.fillStyle = '#cb986a'; c.fillRect(27, 26, 10, 11);
  ellipse(c, 30, 20, 13, 15, '#513a2e'); ellipse(c, 33, 22, 11, 12, '#efc28a');
  ellipse(c, 21.5, 23, 3.5, 4.5, '#e8ae79'); ellipse(c, 22, 24, 1.5, 2, '#ca8964');
  // Tousled hair silhouette with a bright edge.
  path(c, [[19, 21], [15, 15], [20, 14], [17, 8], [24, 9], [27, 4], [32, 8], [38, 6], [45, 10], [43, 17], [36, 15], [31, 19], [26, 16], [24, 25]], '#49372d');
  line(c, [[21, 12], [27, 10], [32, 12], [38, 10]], '#8e633d', 2);
  ellipse(c, 38, 22, 2, 3, '#172d33'); ellipse(c, 38.5, 21.1, .7, 1, '#fff6de');
  line(c, [[35, 17], [40, 18]], '#6c4933', 1.5);
  line(c, frame === 9 ? [[35, 29], [38, 28]] : [[34, 29], [37, 30], [39, 29]], '#95624b', 1.2);
  ellipse(c, 40, 26, 2.5, 1.3, '#e7a27b');
  // Amber scarf provides a readable silhouette at game scale.
  path(c, [[23, 31], [33, 35], [40, 31], [40, 36], [31, 40], [23, 36]], '#e8b763');
  path(c, [[24, 34], [17, 34], [run ? 4 : 12, run ? 30 : 40], [15, 43], [26, 38]], '#c28b49');
  line(c, [[25, 33], [32, 36], [38, 33]], '#ffe0a0', 1.5);
  if (frame === 9) { c.globalAlpha = .25; ellipse(c, 32, 40, 24, 35, '#ffb9ab'); c.globalAlpha = 1; }
}

function enemy(c: Ctx, frame: number) {
  const bob = Math.sin(frame * Math.PI / 2) * 2;
  c.translate(0, bob);
  ellipse(c, 31, 56, 24, 5, '#10232b66');
  line(c, [[22, 43], [16 + frame % 2 * 3, 53], [12, 56]], '#24433f', 7);
  line(c, [[39, 43], [43 - frame % 2 * 3, 53], [50, 56]], '#24433f', 7);
  path(c, [[9, 37], [16, 19], [24, 22], [29, 11], [38, 22], [46, 19], [54, 38], [44, 50], [22, 52]], '#304f4b', '#102d34', 2);
  path(c, [[15, 29], [22, 17], [28, 24], [34, 14], [41, 24], [49, 26], [43, 36], [24, 36]], '#496751');
  line(c, [[22, 16], [18, 7], [14, 4]], '#514d44', 4);
  line(c, [[41, 18], [45, 10], [50, 8]], '#514d44', 4);
  ellipse(c, 14, 7, 5, 2, '#8fb48b'); ellipse(c, 49, 9, 5, 2, '#8fb48b');
  path(c, [[20, 29], [43, 28], [47, 41], [34, 47], [19, 42]], '#182f38');
  ellipse(c, 25, 35, 3, 3, '#e7a0d8'); ellipse(c, 39, 35, 3, 3, '#e7a0d8');
  glow(c, 25, 35, 10, '#e69aff'); glow(c, 39, 35, 10, '#e69aff');
  line(c, [[28, 42], [33, 44], [37, 41]], '#916187', 1.5);
  path(c, [[29, 15], [32, 3], [38, 13], [34, 21]], '#ae75b8');
}

function guardian(c: Ctx, frame: number) {
  const lift = Math.sin(frame * Math.PI / 2) * 3;
  c.translate(0, lift);
  ellipse(c, 81, 172, 57, 7, '#082b2c66');
  // Roots form the legs and huge, articulated arms.
  line(c, [[57, 119], [51, 148], [39, 162]], '#3e5147', 25);
  line(c, [[101, 119], [110, 146], [121, 163]], '#3e5147', 25);
  path(c, [[25, 155], [50, 151], [60, 170], [21, 172]], '#465c4d', '#223a3c', 2);
  path(c, [[99, 151], [122, 151], [141, 171], [102, 172]], '#465c4d', '#223a3c', 2);
  const leftY = frame === 2 ? 56 : 97 + lift; const rightY = frame === 3 ? 54 : 100 - lift;
  line(c, [[46, 67], [22, 85], [16, leftY + 27]], '#314c44', 28);
  line(c, [[112, 68], [135, 84], [144, rightY + 24]], '#314c44', 28);
  line(c, [[44, 65], [24, 86], [18, leftY + 19]], '#607454', 19);
  line(c, [[112, 65], [133, 86], [141, rightY + 16]], '#556b50', 19);
  ellipse(c, 17, leftY + 29, 16, 20, '#405b48'); ellipse(c, 143, rightY + 25, 16, 20, '#405b48');
  path(c, [[41, 56], [61, 43], [99, 44], [119, 61], [111, 113], [94, 138], [66, 137], [45, 113]], '#536a50', '#233e3b', 3);
  path(c, [[53, 67], [76, 58], [99, 66], [105, 103], [83, 128], [56, 111]], '#738367');
  line(c, [[62, 72], [65, 87], [57, 103], [71, 115]], '#3a5249', 3);
  line(c, [[99, 77], [89, 83], [96, 104]], '#3a5249', 3);
  path(c, [[76, 78], [90, 94], [79, 112], [66, 94]], '#bceacb', '#2b766d', 3);
  path(c, [[76, 83], [83, 94], [76, 106], [71, 94]], '#dfffe2');
  glow(c, 79, 94, 30, '#a1efc7');
  // Crown of branches and moss.
  line(c, [[55, 47], [43, 29], [44, 14], [37, 5]], '#4a5745', 9);
  line(c, [[105, 47], [118, 26], [115, 10], [123, 4]], '#4a5745', 9);
  line(c, [[43, 27], [28, 22], [23, 10]], '#4a5745', 5);
  line(c, [[116, 24], [136, 20], [141, 10]], '#4a5745', 5);
  ellipse(c, 30, 20, 12, 6, '#80a66a'); ellipse(c, 125, 12, 11, 5, '#7d9e65');
  path(c, [[55, 32], [79, 23], [103, 34], [103, 63], [81, 78], [57, 64]], '#6a7b5d', '#2c4541', 3);
  path(c, [[58, 34], [72, 26], [85, 28], [98, 35], [90, 41], [72, 38]], '#92a36d');
  path(c, [[60, 45], [77, 48], [74, 57], [60, 55]], '#153d3d');
  path(c, [[84, 48], [100, 43], [99, 54], [86, 56]], '#153d3d');
  line(c, [[64, 51], [73, 52]], '#c2ffcd', 3); line(c, [[88, 51], [97, 49]], '#c2ffcd', 3);
  line(c, [[72, 64], [83, 67], [92, 62]], '#324d43', 3);
  for (let i = 0; i < 7; i++) { ellipse(c, 40 + i * 12, 62 + Math.sin(i * 2) * 4, 10, 5, i % 2 ? '#849a62' : '#658659'); }
  line(c, [[42, 65], [38, 86]], '#97b377', 2); line(c, [[111, 64], [116, 91]], '#97b377', 2);
}

export function createTextures(scene: Phaser.Scene): void {
  texture(scene, 'hero', 64, 80, c => { for (let f = 0; f < 12; f++) { c.save(); c.translate(f * 64, 0); c.beginPath(); c.rect(0, 0, 64, 80); c.clip(); hero(c, f); c.restore(); } }, 12);
  texture(scene, 'enemy', 64, 64, c => { for (let f = 0; f < 4; f++) { c.save(); c.translate(f * 64, 0); enemy(c, f); c.restore(); } }, 4);
  texture(scene, 'guardian', 160, 180, c => { for (let f = 0; f < 4; f++) { c.save(); c.translate(f * 160, 0); guardian(c, f); c.restore(); } }, 4);
  texture(scene, 'ground', 128, 64, c => {
    const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#3c6555'); g.addColorStop(.18, '#2b4943'); g.addColorStop(1, '#142f35'); c.fillStyle = g; c.fillRect(0, 0, 128, 64);
    const r = rng(810); for (let i = 0; i < 50; i++) ellipse(c, r() * 128, 12 + r() * 50, 1 + r() * 4, 1 + r() * 2, '#64806b22');
    path(c, [[0, 0], [128, 0], [128, 7], [110, 10], [95, 7], [76, 12], [57, 8], [38, 12], [19, 8], [0, 10]], '#719273');
    line(c, [[0, 2], [128, 2]], '#b4c699', 2);
    for (let x = 2; x < 128; x += 5) line(c, [[x, 5], [x - 3, r() * 5]], x % 3 ? '#96b587' : '#bdd2a1', 1);
    line(c, [[20, 20], [33, 33], [35, 51]], '#213c39', 3); line(c, [[90, 12], [85, 29], [103, 42]], '#203b38', 3);
  });
  texture(scene, 'platform', 128, 32, c => {
    path(c, [[0, 3], [127, 3], [122, 19], [110, 23], [81, 22], [55, 29], [35, 23], [8, 21]], '#47685a', '#24473f', 2);
    path(c, [[0, 2], [127, 2], [124, 9], [101, 8], [85, 12], [62, 8], [39, 10], [10, 8]], '#9db889');
    line(c, [[6, 3], [122, 3]], '#c5d5a4', 2);
    line(c, [[19, 18], [38, 18]], '#2b4d44', 2); line(c, [[74, 16], [103, 14]], '#2b4d44', 2);
    line(c, [[32, 22], [34, 31]], '#71966c', 2); line(c, [[96, 21], [96, 29]], '#71966c', 2);
  });
  texture(scene, 'coin', 24, 24, c => {
    glow(c, 12, 12, 12, '#ffe397'); ellipse(c, 12, 12, 8, 9, '#b78342'); ellipse(c, 12, 11, 6.5, 7.5, '#f8cf77');
    line(c, [[12, 6], [15, 11], [12, 16], [9, 11], [12, 6]], '#ac763f', 1.3); ellipse(c, 9, 8, 1.5, 1.5, '#fff2bd');
  });
  texture(scene, 'star', 32, 32, c => { glow(c, 16, 16, 16, '#ffe4a1'); path(c, Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 5 : 12; return [16 + Math.cos(a) * r, 16 + Math.sin(a) * r]; }), '#ffe3a0', '#c39153', 1.2); });
  texture(scene, 'crystal', 48, 64, c => {
    glow(c, 24, 31, 28); path(c, [[24, 4], [39, 22], [34, 46], [24, 59], [12, 45], [8, 22]], '#8bdac1', '#d7ffe7', 1);
    path(c, [[24, 4], [25, 29], [8, 22]], '#d5ffda'); path(c, [[24, 4], [39, 22], [25, 29]], '#a6fbd6');
    path(c, [[8, 22], [25, 29], [24, 59], [12, 45]], '#4bbaa9'); path(c, [[25, 29], [39, 22], [34, 46], [24, 59]], '#81e5c7');
    line(c, [[24, 11], [24, 23]], '#f0ffdd', 2);
  });
  texture(scene, 'shrine', 80, 112, c => {
    ellipse(c, 40, 107, 37, 5, '#082e3366'); path(c, [[9, 93], [70, 93], [77, 109], [3, 109]], '#40665e', '#204b45', 2);
    path(c, [[24, 23], [41, 13], [58, 23], [63, 92], [17, 92]], '#4c7365', '#254a47', 2);
    path(c, [[24, 24], [40, 16], [40, 92], [20, 92]], '#6d8b71');
    path(c, [[31, 35], [49, 35], [52, 74], [29, 74]], '#244d48');
    line(c, [[40, 40], [40, 65]], '#b7ffd4', 2); line(c, [[32, 46], [40, 40], [48, 46]], '#b7ffd4', 2);
    line(c, [[32, 60], [40, 68], [48, 60]], '#b7ffd4', 2);
    glow(c, 40, 50, 29, '#b5ffd4');
    ellipse(c, 27, 91, 19, 5, '#709b69'); ellipse(c, 56, 96, 14, 4, '#89b67b');
    line(c, [[18, 99], [61, 99]], '#9cbb8c', 1.5); line(c, [[23, 81], [31, 84], [27, 92]], '#36594f', 2);
  });
  texture(scene, 'boulder', 100, 110, c => {
    path(c, [[6, 96], [3, 64], [17, 30], [43, 13], [73, 18], [91, 44], [98, 78], [83, 105], [29, 108]], '#567466', '#254940', 3);
    path(c, [[17, 30], [43, 13], [73, 18], [66, 45], [34, 51], [3, 64]], '#779381');
    path(c, [[34, 51], [66, 45], [83, 105], [29, 108]], '#4c6c61');
    line(c, [[45, 17], [38, 37], [48, 55], [38, 73], [44, 98]], '#2f514b', 3);
    line(c, [[61, 28], [57, 40], [68, 47]], '#adc4a5', 2);
    for (let i = 0; i < 7; i++) ellipse(c, 19 + i * 9, 27 - Math.sin(i * .7) * 12, 12, 5, i % 2 ? '#799b65' : '#91ac74');
    glow(c, 51, 63, 16, '#c4dca0'); line(c, [[46, 70], [51, 56], [57, 70]], '#d8e7ac', 2); line(c, [[48, 66], [55, 66]], '#d8e7ac', 2);
  });
  texture(scene, 'chest', 64, 48, c => {
    c.fillStyle = '#5c4535'; c.beginPath(); c.roundRect(7, 10, 50, 35, 5); c.fill();
    path(c, [[8, 20], [13, 7], [49, 7], [56, 20]], '#b0864f', '#493d30', 2);
    c.fillStyle = '#9a6d40'; c.fillRect(9, 23, 46, 18); line(c, [[10, 29], [54, 29]], '#704c31', 1); line(c, [[10, 36], [54, 36]], '#704c31', 1);
    line(c, [[17, 10], [17, 43]], '#d6b876', 5); line(c, [[47, 10], [47, 43]], '#d6b876', 5);
    line(c, [[8, 21], [56, 21]], '#ecc782', 3); c.fillStyle = '#e4c184'; c.fillRect(27, 19, 10, 12); ellipse(c, 32, 24, 2, 2.5, '#46655b');
  });
  texture(scene, 'projectile', 32, 32, c => { glow(c, 16, 16, 16); path(c, [[3, 16], [20, 9], [28, 16], [20, 23]], '#baffd7'); ellipse(c, 20, 16, 4, 4, '#f2ffe7'); });
  texture(scene, 'particle', 16, 16, c => { glow(c, 8, 8, 8, '#ffffff'); ellipse(c, 8, 8, 2, 2, '#ffffff'); });
  makeBackgroundTextures(scene);
}

function tree(c: Ctx, x: number, ground: number, height: number, width: number, color: string, detailed = false) {
  const top = ground - height;
  c.fillStyle = color; c.beginPath(); c.moveTo(x - width * .9, ground); c.bezierCurveTo(x - width * .28, ground - 75, x - width * .3, top + height * .4, x - width * .42, top); c.lineTo(x + width * .24, top); c.bezierCurveTo(x + width * .4, top + height * .4, x + width * .18, ground - 40, x + width, ground); c.closePath(); c.fill();
  for (let side = -1; side <= 1; side += 2) {
    c.strokeStyle = color; c.lineWidth = width * .34; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, top + height * .36); c.bezierCurveTo(x + side * width * 1.2, top + height * .36, x + side * width * 1.7, top + height * .12, x + side * width * 2.8, top + height * .14); c.stroke();
  }
  if (detailed) {
    line(c, [[x - width * .2, ground - 10], [x - width * .12, ground - height * .3], [x + width * .04, ground - height * .55]], '#78a58a20', 3);
    line(c, [[x + width * .2, ground - 20], [x + width * .13, ground - height * .2], [x + width * .26, ground - height * .43]], '#060f162a', 4);
  }
}
function leaf(c: Ctx, x: number, y: number, size: number, angle: number, color: string) {
  c.save(); c.translate(x, y); c.rotate(angle); c.fillStyle = color; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(size * .5, -size * .5, size, 0); c.quadraticCurveTo(size * .5, size * .32, 0, 0); c.fill(); c.restore();
}
function fern(c: Ctx, x: number, y: number, scale: number, color: string) {
  for (let branch = -2; branch <= 2; branch++) {
    const endX = x + branch * 11 * scale, endY = y - (36 - Math.abs(branch) * 7) * scale;
    line(c, [[x, y], [(x + endX) / 2, endY + 7 * scale], [endX, endY]], color, Math.max(1, scale));
    for (let k = 1; k < 6; k++) { const t = k / 6; const px = x + (endX - x) * t, py = y + (endY - y) * t; const sz = (9 - k) * scale; leaf(c, px, py, sz, -Math.PI / 3, color); leaf(c, px, py, sz, -Math.PI * .8, color); }
  }
}

function makeBackgroundTextures(scene: Phaser.Scene) {
  texture(scene, 'forest-sky', 1280, 720, c => {
    const g = c.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, '#133e49'); g.addColorStop(.38, '#51837c'); g.addColorStop(.7, '#789b84'); g.addColorStop(1, '#193f43'); c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
    glow(c, 860, 160, 320, '#dfe9bb'); glow(c, 860, 160, 140, '#fff0b9'); ellipse(c, 860, 160, 44, 44, '#f2edc480');
    const r = rng(27); for (let j = 0; j < 3; j++) {
      const pts: number[][] = [[0, 720], [0, 400]]; for (let x = 0; x <= 1350; x += 90) pts.push([x, 380 + j * 65 - r() * 110]); pts.push([1280, 720]); path(c, pts, ['#749789', '#527f77', '#37665f'][j]);
    }
    // Distant ruins and an impossibly long, broken viaduct.
    c.fillStyle = '#739689'; c.fillRect(380, 258, 26, 134); c.fillRect(412, 279, 22, 128); c.fillRect(363, 256, 87, 10);
    c.fillRect(1020, 270, 36, 140); path(c, [[1012, 273], [1037, 228], [1064, 273]], '#739689');
    const mist = c.createLinearGradient(0, 340, 0, 660); mist.addColorStop(0, '#b2cda600'); mist.addColorStop(.55, '#b2cda633'); mist.addColorStop(1, '#b2cda600'); c.fillStyle = mist; c.fillRect(0, 340, 1280, 320);
  });
  texture(scene, 'forest-far', 2560, 720, c => {
    const r = rng(621); for (let i = 0; i < 30; i++) { const x = i * 90 + r() * 70; const h = 350 + r() * 400; tree(c, x, 650, h, 18 + r() * 29, '#204e4d70'); }
    const g = c.createLinearGradient(0, 450, 0, 650); g.addColorStop(0, '#74aa9500'); g.addColorStop(1, '#74aa9544'); c.fillStyle = g; c.fillRect(0, 450, 2560, 200);
  });
  texture(scene, 'forest-near', 2560, 720, c => {
    const r = rng(549); for (let i = 0; i < 10; i++) {
      const x = i * 280 + 60 + r() * 90; tree(c, x, 634, 720 + r() * 220, 54 + r() * 40, '#183c3ee8', true);
      for (let k = 0; k < 8; k++) { const lx = x - 140 + r() * 280, ly = r() * 135; ellipse(c, lx, ly, 60 + r() * 70, 30 + r() * 50, k % 2 ? '#183e3c' : '#204b43'); }
      const vineX = x + 85; c.strokeStyle = '#4e78636b'; c.lineWidth = 2; c.beginPath(); c.moveTo(vineX, 20); c.bezierCurveTo(vineX - 32, 120, vineX + 28, 160, vineX + 4, 240 + r() * 60); c.stroke();
      for (let n = 0; n < 6; n++) leaf(c, vineX + Math.sin(n) * 9, 80 + n * 26, 15, n % 2 ? .7 : 2.5, '#58886b88');
      fern(c, x + 50, 628, 1.5, '#497b63'); fern(c, x - 75, 628, 1, '#375f51');
    }
  });
  texture(scene, 'forest-rays', 1280, 720, c => {
    const g = c.createLinearGradient(700, 0, 100, 650); g.addColorStop(0, '#f4ecc425'); g.addColorStop(1, '#f4ecc400');
    c.fillStyle = g;
    [[745, 770, 430, 260], [865, 876, 650, 555], [960, 1008, 1010, 780], [1110, 1120, 1120, 1030]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, 0); c.lineTo(b, 0); c.lineTo(d, 660); c.lineTo(e, 660); c.closePath(); c.fill(); });
  });
  texture(scene, 'forest-floor-decor', 1280, 130, c => {
    const r = rng(531); for (let i = 0; i < 42; i++) { const x = r() * 1280; fern(c, x, 80 + r() * 45, .5 + r() * .7, i % 2 ? '#497858' : '#335f4e'); }
    for (let i = 0; i < 15; i++) { const x = r() * 1280, y = 45 + r() * 60; line(c, [[x, y + 10], [x, y]], '#9abc8d', 2); ellipse(c, x, y, 5 + r() * 4, 3, '#87dbbb'); glow(c, x, y, 15, '#89dab4'); }
  });
  texture(scene, 'forest-vignette', 1280, 720, c => {
    const g = c.createRadialGradient(640, 350, 190, 640, 350, 760); g.addColorStop(0, '#061e2900'); g.addColorStop(.65, '#061e2911'); g.addColorStop(1, '#061e29a0'); c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
  });
}

export function buildForest(scene: Phaser.Scene, worldWidth: number): { update(time: number, cameraX: number): void; destroy(): void } {
  createTextures(scene);
  const objects: Phaser.GameObjects.GameObject[] = [];
  const sky = scene.add.image(0, 0, 'forest-sky').setOrigin(0).setScrollFactor(0).setDepth(-100); objects.push(sky);
  const far = scene.add.tileSprite(0, 0, 1280, 720, 'forest-far').setOrigin(0).setScrollFactor(0).setDepth(-90); objects.push(far);
  const near = scene.add.tileSprite(0, 0, 1280, 720, 'forest-near').setOrigin(0).setScrollFactor(0).setDepth(-80); objects.push(near);
  const rays = scene.add.image(0, 0, 'forest-rays').setOrigin(0).setScrollFactor(0).setDepth(-70).setBlendMode(Phaser.BlendModes.SCREEN); objects.push(rays);
  const scenery = scene.add.tileSprite(0, 550, worldWidth, 130, 'forest-floor-decor').setOrigin(0).setDepth(-30); objects.push(scenery);
  const motes: { image: Phaser.GameObjects.Image; x: number; y: number; phase: number; speed: number }[] = [];
  const r = rng(540); for (let i = 0; i < 36; i++) {
    const x = r() * 1280, y = 160 + r() * 430;
    const image = scene.add.image(x, y, 'particle').setScrollFactor(0).setDepth(-20).setTint(i % 3 ? 0xc4ecc1 : 0xffd49c).setScale(.2 + r() * .4).setBlendMode(Phaser.BlendModes.ADD);
    objects.push(image); motes.push({ image, x, y, phase: r() * TAU, speed: .4 + r() * .7 });
  }
  const vignette = scene.add.image(0, 0, 'forest-vignette').setOrigin(0).setScrollFactor(0).setDepth(80); objects.push(vignette);
  return {
    update(time, cameraX) {
      far.tilePositionX = cameraX * .18; near.tilePositionX = cameraX * .42;
      rays.setAlpha(.78 + Math.sin(time * .0002) * .12);
      motes.forEach(m => {
        const t = time * .00045 * m.speed + m.phase;
        m.image.setPosition(((m.x - cameraX * .1 + Math.sin(t) * 25) % 1280 + 1280) % 1280, m.y + Math.cos(t * .7) * 19);
        m.image.setAlpha(.25 + (Math.sin(t * 2) + 1) * .3);
      });
    },
    destroy() { objects.forEach(o => o.destroy()); },
  };
}
