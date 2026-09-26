import Phaser from 'phaser';
import { createTextures, buildForest } from './art';
import { emit, type GameSnapshot, type Sign } from './contracts';
import { SAVE_KEY, parseSave, advanceSequence, type SavedAdventure } from './progress';

const WIDTH = 5900;
type Enemy = { id: string; sprite: Phaser.Physics.Arcade.Sprite; home: number; hp: number; nextHit: number };
type Shrine = { sign: Sign; x: number; sprite: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text };

/** A deterministic adventure: AI proposes dialogue and signs, never physics or rewards. */
export default class GameScene extends Phaser.Scene {
  private hero!: Phaser.Physics.Arcade.Sprite;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: Enemy[] = [];
  private shrines: Shrine[] = [];
  private pickups: { id: string; kind: 'coin' | 'star'; image: Phaser.GameObjects.Image }[] = [];
  private chests: { id: string; image: Phaser.GameObjects.Image }[] = [];
  private gates = new Map<string, Phaser.Physics.Arcade.Image>();
  private orbs: { sprite: Phaser.Physics.Arcade.Image; owner: 'boss' | 'trap'; reflected: boolean }[] = [];
  private forest!: ReturnType<typeof buildForest>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private activeRun = false;
  private paused = false;
  private focused = false;
  private reducedMotion = false;
  private health = 5;
  private coins = 0;
  private stars = 0;
  private unlocked = new Set<Sign>();
  private picked = new Set<string>();
  private opened = new Set<string>();
  private defeated = new Set<string>();
  private checkpoint = 140;
  private elapsed = 0;
  private clock = 0;
  private hurtUntil = 0;
  private shieldUntil = 0;
  private castUntil = 0;
  private dashUntil = 0;
  private dashReady = 0;
  private attackReady = 0;
  private attackUntil = 0;
  private signReady = 0;
  private lastGround = 0;
  private facing = 1;
  private lastSnapshot = 0;
  private lastSave = 0;
  private trapReady = 0;
  private puzzleIndex = 0;
  private puzzleDone = false;
  private puzzleText!: Phaser.GameObjects.Text;
  private contextText!: Phaser.GameObjects.Text;
  private glow!: Phaser.GameObjects.Graphics;
  private boss!: Phaser.Physics.Arcade.Sprite;
  private bossHealth = 6;
  private bossStarted = false;
  private bossNext = 0;
  private bossFireAt = 0;
  private vulnerableUntil = 0;
  private comboIndex = 0;
  private finished = false;
  private crystal!: Phaser.GameObjects.Image;
  private hintSeen = new Set<string>();
  private subscriptions: Array<[string, EventListener]> = [];

  constructor() { super('GameScene'); }

  create() {
    createTextures(this);
    this.forest = buildForest(this, WIDTH);
    this.physics.world.setBounds(0, -300, WIDTH, 1400);
    this.cameras.main.setBounds(0, 0, WIDTH, 720);
    this.ground = this.physics.add.staticGroup();
    this.buildTerrain();
    this.hero = this.physics.add.sprite(140, 540, 'hero', 0).setDepth(20);
    this.hero.setSize(30, 64).setOffset(17, 13).setCollideWorldBounds(true);
    this.hero.setMaxVelocity(680, 1050);
    this.physics.add.collider(this.hero, this.ground);
    this.makeAnimations();
    this.hero.play('hero-idle');
    this.cameras.main.startFollow(this.hero, true, .09, .09, -190, 0);
    this.buildAdventure();
    this.glow = this.add.graphics().setDepth(22);
    this.contextText = this.add.text(640, 592, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fff9dc',
      backgroundColor: '#102e29dd', padding: { x: 18, y: 10 }, align: 'center',
    }).setOrigin(.5).setScrollFactor(0).setDepth(100).setVisible(false);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('SPACE,SHIFT,J,E,Q,A,B,C,ONE,TWO,THREE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.listen('ls:start', (d) => this.startRun(Boolean(d.continue)));
    this.listen('ls:restart', () => this.startRun(false));
    this.listen('ls:pause', (d) => this.setPaused(Boolean(d.paused)));
    this.listen('ls:focus', () => this.toggleFocus());
    this.listen('ls:gesture', (d) => this.cast(d.sign));
    this.listen('ls:settings', (d) => { this.reducedMotion = Boolean(d.reducedMotion); });
    const blur = () => {
      this.input.keyboard?.resetKeys();
      if (this.activeRun && !this.finished) {
        this.setPaused(true);
        emit('ls:pause-request', { paused: true });
      }
    };
    window.addEventListener('blur', blur);
    this.events.once('shutdown', () => {
      this.subscriptions.forEach(([name, fn]) => window.removeEventListener(name, fn));
      window.removeEventListener('blur', blur);
      this.forest.destroy();
    });
    this.physics.pause();
    this.publish();
  }

  private listen(name: string, handler: (detail: any) => void) {
    const fn = ((event: CustomEvent) => handler(event.detail ?? {})) as EventListener;
    this.subscriptions.push([name, fn]); window.addEventListener(name, fn);
  }

  private makeAnimations() {
    const define = (key: string, frames: number[], rate: number, repeat = -1) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: frames.map(frame => ({ key: 'hero', frame })), frameRate: rate, repeat });
    };
    define('hero-idle', [0, 1], 3); define('hero-run', [2, 3, 4, 5], 11);
    define('hero-jump', [6], 1); define('hero-fall', [7], 1);
    define('hero-attack', [8], 1); define('hero-hurt', [9], 1); define('hero-cast', [10], 1);
  }

  private buildTerrain() {
    // Ground gaps are short enough to cross with the regular jump; every fall has a checkpoint.
    const stretches = [[0, 1420], [1550, 2660], [2800, 5900]];
    for (const [start, end] of stretches) {
      this.add.tileSprite(start, 620, end - start, 150, 'ground').setOrigin(0).setDepth(4);
      const floor = this.add.rectangle((start + end) / 2, 692, end - start, 144, 0x000000, 0);
      this.ground.add(floor);
    }
    const platforms = [[710, 492, 170], [920, 410, 160], [1350, 500, 170], [1630, 505, 170],
      [2380, 484, 160], [2580, 440, 150], [2820, 500, 170], [3350, 500, 180], [3520, 380, 170], [4320, 500, 180]];
    for (const [x, y, width] of platforms) {
      this.add.tileSprite(x, y, width, 32, 'platform').setDepth(7);
      const top = this.add.rectangle(x, y + 4, width - 6, 23, 0, 0);
      this.ground.add(top);
    }
    this.label(170, 435, 'WHISPERING FOREST', 15, '#bce7cf');
    this.label(1450, 345, 'THE FALLEN CROSSING', 14, '#bce7cf');
    this.label(3240, 280, 'ROOTBOUND RUINS', 14, '#bce7cf');
  }

  private buildAdventure() {
    this.shrines = ([['A', 500], ['B', 1820], ['C', 3100]] as [Sign, number][]).map(([sign, x]) => {
      const sprite = this.add.image(x, 565, 'shrine').setDepth(8);
      const label = this.label(x, 477, `${sign}  ·  ${sign === 'A' ? 'FORCE' : sign === 'B' ? 'SHIELD' : 'REVEAL'}`, 16, '#eddfaa');
      return { sign, x, sprite, label };
    });
    this.addGate('boulder', 1160, 'boulder');
    this.addGate('ruins', 3720, 'boulder');
    this.addGate('puzzle', 4480, 'boulder');
    this.gates.get('ruins')!.setTint(0x6cc6ba);
    this.gates.get('puzzle')!.setTint(0xb893e0);
    this.label(3720, 460, 'C · ANCIENT SEAL', 15, '#a3f8e9');
    this.label(4090, 392, 'THE THREE WATCHERS', 15, '#ecd8b0');
    this.label(4090, 420, '“Force wakes. Reveal guides. Shield protects.”', 13, '#c0d4ca');
    this.puzzleText = this.label(4090, 460, 'A  →  C  →  B', 23, '#ffe8a0');
    [3990, 4090, 4190].forEach((x, i) => {
      this.add.image(x, 582, 'shrine').setScale(.57).setTint([0xffc95e, 0x7de9e0, 0xb8a5ff][i]).setDepth(8);
    });
    this.label(2210, 415, 'FALLING STAR PASS', 15, '#dacbad');
    this.label(2210, 445, 'B · Shield against the sentry', 14, '#c3d9ce');
    for (let i = 0; i < 42; i++) {
      const x = 285 + i * 119;
      if ((x > 1400 && x < 1570) || (x > 2650 && x < 2820)) continue;
      this.pickups.push({ id: `coin-${i}`, kind: 'coin', image: this.add.image(x, 562 - Math.sin(i) * 10, 'coin').setDepth(11) });
    }
    [[920, 357], [2580, 387], [3520, 327], [4320, 447], [5530, 550]].forEach(([x, y], i) => {
      this.pickups.push({ id: `star-${i}`, kind: 'star', image: this.add.image(x, y, 'star').setDepth(11) });
    });
    [850, 3450, 4300].forEach((x, i) => this.chests.push({ id: `chest-${i}`, image: this.add.image(x, 594, 'chest').setDepth(9) }));
    [900, 1600, 2420, 3300, 3920, 4370].forEach((x, i) => {
      const sprite = this.physics.add.sprite(x, 570, 'enemy', 0).setDepth(13).setSize(40, 45).setOffset(12, 17);
      this.physics.add.collider(sprite, this.ground);
      this.enemies.push({ id: `enemy-${i}`, sprite, home: x, hp: 2, nextHit: 0 });
    });
    this.boss = this.physics.add.sprite(5330, 521, 'guardian', 0).setDepth(15).setImmovable(true);
    this.boss.setSize(115, 157).setOffset(22, 19);
    (this.boss.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.crystal = this.add.image(5570, 510, 'crystal').setDepth(16).setVisible(false);
    this.label(5150, 317, 'THE FOREST GUARDIAN', 24, '#e7d5b4');
  }

  private addGate(id: string, x: number, texture: string) {
    const gate = this.physics.add.staticImage(x, 520, texture).setDisplaySize(140, 200).setDepth(12);
    gate.refreshBody();
    this.gates.set(id, gate);
    this.physics.add.collider(this.hero, gate);
  }

  private label(x: number, y: number, text: string, size: number, color: string) {
    return this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: `${size}px`, color, stroke: '#102b25', strokeThickness: 4, align: 'center' }).setOrigin(.5).setDepth(10);
  }

  private startRun(continuing: boolean) {
    if (this.activeRun) {
      // Restart the scene so every collider, enemy and collectible returns to a known state.
      this.scene.restart({ start: true, continuing });
      return;
    }
    this.activeRun = true;
    const saved = continuing ? this.readSave() : null;
    if (saved) {
      this.checkpoint = saved.checkpoint; this.coins = saved.coins; this.stars = saved.stars;
      this.unlocked = new Set(saved.unlocked); this.picked = new Set(saved.picked); this.opened = new Set(saved.opened);
      this.defeated = new Set(saved.defeated);
      this.puzzleDone = saved.puzzle; this.finished = saved.complete; this.elapsed = saved.elapsed;
      this.pickups.forEach(p => { if (this.picked.has(p.id)) p.image.setVisible(false); });
      this.chests.forEach(c => { if (this.opened.has(c.id)) c.image.setTint(0x6a8274).setAlpha(.65); });
      this.enemies.forEach(e => { if (this.defeated.has(e.id)) { e.hp = 0; e.sprite.disableBody(true, true); } });
      if (this.unlocked.has('A')) this.removeGate('boulder', false);
      if (this.checkpoint >= 3890 || this.puzzleDone) this.removeGate('ruins', false);
      if (this.puzzleDone) { this.removeGate('puzzle', false); this.puzzleText.setText('THE PATH REMEMBERS').setColor('#93e0b6'); }
      if (this.finished) { this.bossHealth = 0; this.boss.setVisible(false); this.crystal.setVisible(true); }
    }
    this.hero.setPosition(this.checkpoint, 520).setVelocity(0, 0);
    this.cameras.main.stopFollow(); this.cameras.main.centerOn(this.hero.x + 190, 360);
    this.cameras.main.startFollow(this.hero, true, .09, .09, -190, 0);
    this.setPaused(false);
    this.input.keyboard?.resetKeys();
    this.shrines.forEach(s => { if (this.unlocked.has(s.sign)) s.sprite.setTint(0x95ffe0); });
    this.toast(saved ? 'Your adventure continues' : 'The forest is waiting', saved ? 'Your powers and treasures are safe.' : 'Arrows to move · Space to jump · J to strike');
    this.dialogue('Luma', saved ? 'The roots remember your journey. Let’s bring the light back.' : 'That shrine is still glowing. Come closer—something inside it is waiting for you.');
    this.publish();
    if (!saved) this.save();
  }

  init(data: { start?: boolean; continuing?: boolean }) {
    // Phaser reuses scene instances; reset mutable gameplay state on every restart.
    this.activeRun = false; this.paused = false; this.focused = false; this.health = 5;
    this.coins = 0; this.stars = 0; this.checkpoint = 140; this.elapsed = 0; this.clock = 0;
    this.enemies = []; this.shrines = []; this.pickups = []; this.chests = []; this.gates = new Map(); this.orbs = [];
    this.unlocked = new Set(); this.picked = new Set(); this.opened = new Set(); this.defeated = new Set(); this.hintSeen = new Set(); this.subscriptions = [];
    this.hurtUntil = 0; this.shieldUntil = 0; this.castUntil = 0; this.dashUntil = 0; this.dashReady = 0; this.attackReady = 0; this.attackUntil = 0; this.signReady = 0;
    this.lastGround = 0; this.lastSnapshot = 0; this.lastSave = 0; this.trapReady = 0; this.puzzleIndex = 0; this.puzzleDone = false;
    this.bossHealth = 6; this.bossStarted = false; this.bossNext = 0; this.bossFireAt = 0; this.vulnerableUntil = 0; this.comboIndex = 0; this.finished = false;
    if (data.start) this.events.once('create', () => this.startRun(Boolean(data.continuing)));
  }

  private setPaused(value: boolean) {
    this.paused = value; this.input.keyboard?.resetKeys();
    if (value || !this.activeRun) { this.physics.pause(); this.hero?.anims.pause(); }
    else { this.physics.resume(); this.hero?.anims.resume(); }
    this.publish();
  }

  private toggleFocus() {
    if (!this.activeRun || this.paused) return;
    this.focused = !this.focused;
    this.toast(this.focused ? 'Gauntlet focus' : 'Back to the adventure', this.focused ? 'Time slows. Release the controls and make your sign.' : undefined);
    this.publish();
  }

  update(_time: number, rawDelta: number) {
    this.forest?.update(this.reducedMotion ? 0 : this.clock, this.cameras.main.scrollX);
    if (!this.activeRun || this.paused) return;
    const delta = Math.min(rawDelta, 50);
    const speed = this.focused ? .18 : 1;
    // Arcade scales the duration between fixed steps: larger values mean slower physics.
    // Keep its fixedStep default enabled so gravity, movement and collision share this clock.
    this.physics.world.timeScale = this.focused ? 1 / .18 : 1;
    this.clock += delta * speed;
    if (!this.finished) this.elapsed += delta / 1000;
    this.handleControls();
    this.updateHero();
    this.updateEnemies();
    this.updatePickups();
    this.updateOrbs(delta * speed);
    this.updateBoss();
    this.updateContext();
    this.drawPowerEffects();
    if (this.hero.y > 790) this.respawn();
    if (this.clock - this.lastSnapshot > 150) { this.lastSnapshot = this.clock; this.publish(); }
    if (this.clock - this.lastSave > 5000) { this.lastSave = this.clock; this.save(); }
  }

  private handleControls() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.toggleFocus();
    const signs: [string, Sign][] = [['A', 'A'], ['B', 'B'], ['C', 'C'], ['ONE', '1'], ['TWO', '2'], ['THREE', '3']];
    signs.forEach(([key, sign]) => { if (Phaser.Input.Keyboard.JustDown(this.keys[key])) this.cast(sign); });
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      const shrine = this.shrines.find(s => Math.abs(s.x - this.hero.x) < 115 && !this.unlocked.has(s.sign));
      if (shrine) this.cast(shrine.sign);
      else if (Math.abs(this.hero.x - 4090) < 190 && !this.puzzleDone) this.toast('Read the watchers', 'Force → Reveal → Shield. Cast A, then C, then B.');
    }
    const direction = Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);
    if (direction) this.facing = direction;
    this.hero.setFlipX(this.facing < 0);
    if (this.focused) this.hero.setVelocityX(0);
    else if (this.clock < this.dashUntil) this.hero.setVelocityX(this.facing * 650);
    else this.hero.setVelocityX(direction * 285);
    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) this.lastGround = this.clock;
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && !this.focused && this.clock - this.lastGround < 100) {
      this.hero.setVelocityY(-650); this.lastGround = -999;
      this.burst(this.hero.x, this.hero.y + 35, 0xc9e4c3, 6);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) && !this.focused && this.clock > this.dashReady) {
      this.dashUntil = this.clock + 170; this.dashReady = this.clock + 900;
      this.burst(this.hero.x, this.hero.y + 5, 0x92e9d1, 10);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.J) && this.clock > this.attackReady) {
      this.attackReady = this.clock + 340; this.attackUntil = this.clock + 190;
      this.burst(this.hero.x + this.facing * 44, this.hero.y, 0xffe6a1, 10);
      const slash = this.add.graphics({ x: this.hero.x, y: this.hero.y }).setDepth(24).setScale(this.facing, 1);
      slash.lineStyle(6, 0xffe9b1, .9).beginPath().arc(0, 0, 72, -1.05, 1.05, false).strokePath();
      this.tweens.add({ targets: slash, alpha: 0, duration: 190, onComplete: () => slash.destroy() });
      this.enemies.forEach(e => {
        if (e.hp > 0 && Math.abs(e.sprite.x - this.hero.x) < 110 && Math.abs(e.sprite.y - this.hero.y) < 85) this.hitEnemy(e);
      });
    }
  }

  private updateHero() {
    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    let animation = 'hero-idle';
    if (this.clock < this.hurtUntil - 1120) animation = 'hero-hurt';
    else if (this.clock < this.castUntil) animation = 'hero-cast';
    else if (this.clock < this.attackUntil) animation = 'hero-attack';
    else if (!body.blocked.down) animation = body.velocity.y < 0 ? 'hero-jump' : 'hero-fall';
    else if (Math.abs(body.velocity.x) > 10) animation = 'hero-run';
    this.hero.play(animation, true);
    this.hero.setAlpha(this.clock < this.hurtUntil && Math.floor(this.clock / 90) % 2 === 0 ? .4 : 1);
  }

  private cast(sign: Sign) {
    if (!this.activeRun || this.paused || !['A', 'B', 'C', '1', '2', '3'].includes(sign)) return;
    if (this.clock < this.signReady) return;
    this.signReady = this.clock + 280;
    if (!this.unlocked.has(sign)) {
      const shrine = this.shrines.find(s => s.sign === sign && Math.abs(s.x - this.hero.x) < 130 && Math.abs(this.hero.y - 560) < 120);
      if (!shrine) { this.toast('A sleeping power', ['1', '2', '3'].includes(sign) ? 'Number powers await in the Lost Island expansion.' : `Find the ${sign} shrine to awaken this power.`); return; }
      const previous: Sign | null = sign === 'B' ? 'A' : sign === 'C' ? 'B' : null;
      if (previous && !this.unlocked.has(previous)) { this.toast('The shrine waits for your Gauntlet', `Awaken the ${previous} shrine along the path first.`); return; }
      this.unlocked.add(sign); shrine.sprite.setTint(0xa8ffdb);
      this.checkpoint = shrine.x + 95; this.health = 5;
      const power = sign === 'A' ? 'FORCE' : sign === 'B' ? 'SHIELD' : 'REVEAL';
      this.toast(`${power} AWAKENED`, `Sign ${sign} is now a power of your Gauntlet.`);
      this.dialogue('Luma', sign === 'A' ? 'The roots are listening! Try your new Force power on the great stone ahead.' : sign === 'B' ? 'A shield of living light. Time it against the sentry’s falling stars.' : 'Reveal wakes forgotten things. Try it near sealed ruins—and treasure chests.');
      this.burst(shrine.x, 520, 0xffdb7b, 32); this.save();
    }
    this.castUntil = this.clock + 250;
    this.burst(this.hero.x + this.facing * 30, this.hero.y, sign === 'A' ? 0xffcf74 : sign === 'B' ? 0x9eb9ff : 0x76f5dc, 15);
    if (sign === 'A') {
      const blast = this.add.image(this.hero.x + this.facing * 28, this.hero.y, 'projectile').setTint(0xffde8b).setScale(1.6).setDepth(23);
      this.tweens.add({ targets: blast, x: blast.x + this.facing * 270, scaleY: 2.7, alpha: 0, duration: 300, onComplete: () => blast.destroy() });
      const rock = this.gates.get('boulder');
      if (rock?.active && Math.abs(rock.x - this.hero.x) < 245) { this.removeGate('boulder'); this.toast('The old path opens', 'Follow the light through the forest.'); }
      this.enemies.forEach(e => { if (e.hp > 0 && Math.abs(e.sprite.x - this.hero.x) < 280 && Math.abs(e.sprite.y - this.hero.y) < 120) this.hitEnemy(e, 2); });
      if (!this.finished && this.bossStarted && this.bossHealth > 0 && this.clock < this.vulnerableUntil && Math.abs(this.boss.x - this.hero.x) < 640) this.hitBoss();
    }
    if (sign === 'B') this.shieldUntil = this.clock + 2500;
    if (sign === 'C') {
      const reveal = this.add.graphics({ x: this.hero.x, y: this.hero.y }).setDepth(23);
      reveal.lineStyle(3, 0x87ffe0, .9).strokeCircle(0, 0, 35);
      this.tweens.add({ targets: reveal, scale: 5, alpha: 0, duration: this.reducedMotion ? 180 : 600, onComplete: () => reveal.destroy() });
      const gate = this.gates.get('ruins');
      if (gate?.active && Math.abs(gate.x - this.hero.x) < 250) { this.removeGate('ruins'); this.checkpoint = 3890; this.save(); this.toast('Ancient seal restored', 'The three watchers guard the Guardian’s grove.'); }
      this.chests.forEach(chest => {
        if (!this.opened.has(chest.id) && Math.abs(chest.image.x - this.hero.x) < 220) {
          this.opened.add(chest.id); this.coins += 15; chest.image.setTint(0x7a9583).setAlpha(.65);
          this.burst(chest.image.x, chest.image.y - 20, 0xffd679, 25); this.toast('A forgotten treasure', '+15 forest coins'); this.save();
        }
      });
    }
    if (!this.puzzleDone && Math.abs(this.hero.x - 4090) < 230) {
      const sequence: Sign[] = ['A', 'C', 'B'];
      this.puzzleIndex = advanceSequence(sequence, this.puzzleIndex, sign);
      this.puzzleText.setText(sequence.map((s, i) => i < this.puzzleIndex ? '✦' : s).join('  →  '));
      if (this.puzzleIndex === 3) {
        this.puzzleDone = true; this.removeGate('puzzle'); this.puzzleText.setText('THE PATH REMEMBERS').setColor('#93e0b6');
        this.checkpoint = 4570; this.health = 5; this.coins += 20; this.save();
        this.toast('The watchers awaken', '+20 coins · Guardian’s grove unlocked');
        this.dialogue('Luma', 'Something huge is moving beyond the roots. Keep your shield ready.');
      }
    }
    if (this.bossStarted && this.bossHealth <= 0 && !this.finished) {
      const final: Sign[] = ['A', 'B', 'C'];
      this.comboIndex = advanceSequence(final, this.comboIndex, sign);
      if (this.comboIndex === 3) this.finishAdventure();
      else this.toast('Restore the Guardian', final.map((s, i) => i < this.comboIndex ? '✓' : s).join(' → '));
    }
    if (this.focused) this.focused = false;
    this.publish();
  }

  private updateEnemies() {
    this.enemies.forEach(e => {
      if (e.hp <= 0 || !e.sprite.active) return;
      const distance = this.hero.x - e.sprite.x;
      if (Math.abs(distance) < 320 && Math.abs(distance) > 45) e.sprite.setVelocityX(Math.sign(distance) * 66);
      else e.sprite.setVelocityX(Math.sin(this.clock / 800 + e.home) * 38);
      if (Math.abs(e.sprite.x - e.home) > 160) e.sprite.setVelocityX(Math.sign(e.home - e.sprite.x) * 70);
      e.sprite.setFlipX(e.sprite.body!.velocity.x < 0).setFrame(Math.floor(this.clock / 190) % 4);
      if (Math.abs(distance) < 47 && Math.abs(this.hero.y - e.sprite.y) < 55 && this.clock > e.nextHit) {
        e.nextHit = this.clock + 1500;
        if (this.clock < this.shieldUntil) { this.hitEnemy(e); this.burst(e.sprite.x, e.sprite.y, 0xaccfff, 12); }
        else this.hurt();
      }
    });
  }

  private hitEnemy(enemy: Enemy, damage = 1) {
    enemy.hp -= damage;
    this.burst(enemy.sprite.x, enemy.sprite.y, 0xb3d9b0, 14);
    if (enemy.hp <= 0) {
      enemy.sprite.disableBody(true, true);
      if (!this.defeated.has(enemy.id)) { this.defeated.add(enemy.id); this.coins += 3; this.save(); }
    }
    else { enemy.sprite.setVelocityY(-150); enemy.sprite.setTint(0xffffff); this.time.delayedCall(130, () => enemy.sprite.active && enemy.sprite.clearTint()); }
  }

  private updatePickups() {
    this.pickups.forEach(p => {
      if (this.picked.has(p.id)) return;
      p.image.setAngle(Math.sin(this.clock / 500 + p.image.x) * (p.kind === 'star' ? 12 : 0));
      if (Phaser.Math.Distance.Between(this.hero.x, this.hero.y, p.image.x, p.image.y) < 48) {
        this.picked.add(p.id); p.image.setVisible(false);
        if (p.kind === 'coin') this.coins++; else { this.stars++; this.toast('Hidden star discovered', `${this.stars} / 5 forest stars`); }
        this.burst(p.image.x, p.image.y, 0xffdf83, 7); this.save();
      }
    });
  }

  private updateOrbs(_delta: number) {
    if (this.hero.x > 1990 && this.hero.x < 2390 && this.clock > this.trapReady) {
      this.trapReady = this.clock + 2400; this.spawnOrb(2310, 375, 'trap');
    }
    this.orbs = this.orbs.filter(orb => {
      if (!orb.sprite.active) return false;
      if (orb.reflected && Math.abs(orb.sprite.x - this.boss.x) < 85) {
        this.burst(this.boss.x, this.boss.y, 0x9af9e4, 25); this.vulnerableUntil = this.clock + 4200;
        this.boss.setTint(0xb8ffda); this.toast('The armor is broken!', 'Cast A · Force while the Guardian glows.');
        orb.sprite.destroy(); return false;
      }
      if (!orb.reflected && Phaser.Math.Distance.Between(orb.sprite.x, orb.sprite.y, this.hero.x, this.hero.y) < (this.clock < this.shieldUntil ? 82 : 43)) {
        if (this.clock < this.shieldUntil) {
          this.burst(orb.sprite.x, orb.sprite.y, 0xb7cbff, 14);
          if (orb.owner === 'boss') { orb.reflected = true; orb.sprite.setTint(0x92ffcd); this.physics.moveToObject(orb.sprite, this.boss, 620); return true; }
          this.onceHint('blocked', 'The shield holds', 'Good timing. You can also jump over the sentry’s stars.');
        } else this.hurt();
        orb.sprite.destroy(); return false;
      }
      if (orb.sprite.x < this.cameras.main.scrollX - 200 || orb.sprite.y > 760 || orb.sprite.x > WIDTH + 100) { orb.sprite.destroy(); return false; }
      return true;
    });
  }

  private spawnOrb(x: number, y: number, owner: 'boss' | 'trap') {
    const sprite = this.physics.add.image(x, y, 'projectile').setDepth(21);
    (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.physics.moveTo(sprite, this.hero.x, this.hero.y, owner === 'boss' ? 260 : 205);
    this.orbs.push({ sprite, owner, reflected: false });
  }

  private updateBoss() {
    if (this.finished) return;
    if (!this.bossStarted && this.hero.x > 4730 && this.puzzleDone) {
      this.bossStarted = true; this.bossNext = this.clock + 1800; this.checkpoint = 4570; this.save();
      this.toast('THE FOREST GUARDIAN', 'Reflect its seed with B · Break its armor with A');
      this.dialogue('Luma', 'It isn’t evil—the stolen crystal left it hollow. Turn its own magic against the corruption.');
    }
    if (!this.bossStarted || this.bossHealth <= 0) return;
    this.boss.setFrame(Math.floor(this.clock / 330) % 4);
    if (this.clock > this.vulnerableUntil && !this.bossFireAt) this.boss.clearTint();
    if (this.clock > this.bossNext && this.bossFireAt === 0 && this.clock > this.vulnerableUntil) {
      this.bossFireAt = this.clock + 1400; this.boss.setTint(0xffcc91);
      this.toast('The Guardian gathers a seed…', 'Wait for the shot, then cast B to reflect it.');
      this.burst(this.boss.x - 60, this.boss.y, 0xfbc975, 15);
    }
    if (this.bossFireAt > 0 && this.clock > this.bossFireAt) {
      this.spawnOrb(this.boss.x - 85, 552, 'boss'); this.bossFireAt = 0;
      this.bossNext = this.clock + (this.bossHealth < 3 ? 2700 : 3400);
    }
    if (Math.abs(this.hero.x - this.boss.x) < 90 && Math.abs(this.hero.y - this.boss.y) < 130) {
      this.hurt(); this.hero.setVelocityX(-380);
    }
  }

  private hitBoss() {
    this.bossHealth--; this.vulnerableUntil = 0; this.bossNext = this.clock + 1800;
    this.burst(this.boss.x, this.boss.y, 0xffde9b, 32);
    if (!this.reducedMotion) this.cameras.main.shake(130, .003);
    if (this.bossHealth <= 0) {
      this.orbs.forEach(o => o.sprite.destroy()); this.orbs = [];
      this.boss.setTint(0xa8dab1).setAlpha(.7);
      this.toast('The corruption is fading', 'Restore the Guardian: A → B → C');
      this.dialogue('Luma', 'One last weave of light. Force, Shield, Reveal. Bring our guardian home.');
    }
  }

  private hurt() {
    if (this.clock < this.hurtUntil || this.clock < this.shieldUntil || this.finished) return;
    this.health--; this.hurtUntil = this.clock + 1400;
    this.burst(this.hero.x, this.hero.y, 0xf59c8b, 8);
    if (!this.reducedMotion) this.cameras.main.shake(110, .002);
    if (this.health <= 0) this.respawn();
    this.publish();
  }

  private respawn() {
    this.health = 5; this.hurtUntil = this.clock + 1800;
    this.focused = false; this.hero.setPosition(this.checkpoint, 510).setVelocity(0, 0);
    this.orbs.forEach(o => o.sprite.destroy()); this.orbs = [];
    if (this.bossStarted && !this.finished) { this.bossHealth = 6; this.bossStarted = false; this.bossFireAt = 0; this.vulnerableUntil = 0; this.comboIndex = 0; }
    this.toast('The shrine calls you back', 'Treasures and unlocked powers are kept.');
    this.publish();
  }

  private updateContext() {
    let message = '';
    const shrine = this.shrines.find(s => Math.abs(s.x - this.hero.x) < 125 && !this.unlocked.has(s.sign));
    if (shrine) message = `Ancient shrine · Press E to awaken ${shrine.sign} · keyboard preview`;
    else if (this.gates.get('boulder')?.active && Math.abs(this.hero.x - 1160) < 220) message = 'A · Force moves the great stone';
    else if (this.gates.get('ruins')?.active && Math.abs(this.hero.x - 3720) < 230) message = 'C · Reveal wakes the ancient seal';
    else if (!this.puzzleDone && Math.abs(this.hero.x - 4090) < 220) message = 'Cast the watchers’ sequence: A → C → B';
    else if (this.bossStarted && this.bossHealth <= 0 && !this.finished) message = `Restore the Guardian: ${['A', 'B', 'C'].map((s, i) => i < this.comboIndex ? '✓' : s).join(' → ')}`;
    else if (this.focused) message = 'GAUNTLET FOCUS · Make a sign or press A / B / C · Q to cancel';
    else if (this.chests.some(c => !this.opened.has(c.id) && Math.abs(c.image.x - this.hero.x) < 150)) message = this.unlocked.has('C') ? 'C · Reveal the chest’s treasure' : 'A sealed chest. Return with the Reveal power.';
    this.contextText.setText(message).setVisible(Boolean(message));
    if (this.hero.x > 1240) this.onceHint('gap', 'Leap over the broken crossing', 'Space to jump · Shift to dash in the air');
    if (this.hero.x > 2020 && this.hero.x < 2350) this.onceHint('shield', 'An old sentry still stands watch', 'Press B for a shield. Q slows time while you sign.');
  }

  private drawPowerEffects() {
    this.glow.clear();
    if (this.clock < this.shieldUntil) {
      this.glow.lineStyle(3, 0xa7caff, .9).strokeCircle(this.hero.x, this.hero.y, 58);
      this.glow.fillStyle(0x8faeff, .12).fillCircle(this.hero.x, this.hero.y, 58);
    }
    if (this.focused) this.glow.lineStyle(2, 0xf6d38c, .65).strokeCircle(this.hero.x, this.hero.y, 76);
  }

  private removeGate(id: string, effects = true) {
    const gate = this.gates.get(id);
    if (!gate?.active) return;
    if (effects) this.burst(gate.x, gate.y, 0xb7dbb0, 26);
    gate.disableBody(true, true);
  }

  private burst(x: number, y: number, color: number, amount: number) {
    if (this.reducedMotion) amount = Math.min(amount, 4);
    for (let i = 0; i < amount; i++) {
      const particle = this.add.image(x, y, 'particle').setTint(color).setDepth(30).setScale(Phaser.Math.FloatBetween(.25, .7));
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2), distance = Phaser.Math.Between(25, 100);
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, scale: 0, duration: this.reducedMotion ? 180 : 480, onComplete: () => particle.destroy() });
    }
  }

  private finishAdventure() {
    this.finished = true; this.focused = false; this.hero.setVelocity(0, 0); this.crystal.setVisible(true);
    this.coins += 100; this.health = 5; this.boss.setTint(0xb0ffcd).setAlpha(1);
    this.burst(this.boss.x, 400, 0xf6df95, 60);
    this.toast('THE FOREST HAS ITS VOICE AGAIN', 'First Sign Crystal restored · +100 coins');
    this.dialogue('Luma', 'Listen. The forest remembers its song. And somewhere beyond the sea, another crystal is calling.');
    this.save(); this.publish(); emit('ls:complete', this.snapshot());
  }

  private objective() {
    if (this.finished) return 'Forest restored · First Sign Crystal recovered';
    if (this.bossStarted) return this.bossHealth <= 0 ? 'Restore the Guardian: A → B → C' : 'Reflect with B · Strike the glowing Guardian with A';
    if (this.puzzleDone) return 'Enter the Guardian’s grove';
    if (this.unlocked.has('C')) return 'Open the ruins · Awaken the three watchers';
    if (this.unlocked.has('B')) return 'Cross the sentry pass · Find the Reveal shrine';
    if (this.unlocked.has('A')) return 'Move the great stone · Find the Shield shrine';
    return 'Find the ancient shrine · Awaken the Gauntlet';
  }

  private snapshot(): GameSnapshot {
    return { health: this.health, maxHealth: 5, coins: this.coins, stars: this.stars, unlocked: [...this.unlocked],
      objective: this.objective(), region: this.hero?.x > 4650 ? 'Guardian’s Grove' : this.hero?.x > 3000 ? 'Rootbound Ruins' : 'Whispering Forest',
      checkpoint: this.checkpoint, bossHealth: this.bossStarted ? this.bossHealth : 0, bossMaxHealth: this.bossStarted ? 6 : 0,
      complete: this.finished, elapsed: this.elapsed, focus: this.focused };
  }
  private publish() { emit('ls:state', this.snapshot()); }
  private toast(title: string, text?: string) { emit('ls:toast', { title, text }); }
  private dialogue(speaker: string, text: string) { emit('ls:dialogue', { speaker, text }); }
  private onceHint(id: string, title: string, text: string) { if (!this.hintSeen.has(id)) { this.hintSeen.add(id); this.toast(title, text); } }

  private save() {
    if (!this.activeRun) return;
    const save: SavedAdventure = { version: 1, checkpoint: this.checkpoint, coins: this.coins, stars: this.stars,
      unlocked: [...this.unlocked], picked: [...this.picked], opened: [...this.opened], defeated: [...this.defeated], puzzle: this.puzzleDone, complete: this.finished, elapsed: this.elapsed };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { this.onceHint('save-error', 'Saving is unavailable', 'Your browser’s storage is full or disabled. This adventure remains playable.'); }
  }

  private readSave(): SavedAdventure | null {
    try { return parseSave(localStorage.getItem(SAVE_KEY)); } catch { return null; }
  }
}
