import Phaser from 'phaser';
import GameScene from './game/GameScene';
import { emit, type GameSnapshot, type Sign } from './game/contracts';
import { parseSave, SAVE_KEY } from './game/progress';
import { health, getHint, speak, stopVoice, type ServiceHealth } from './services/api';
import { CameraController } from './services/camera';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
const storedSettings = (() => { try { return JSON.parse(localStorage.getItem('learnsign-settings-v1') || '{}'); } catch { return {}; } })();
const settings = { sound: storedSettings.sound !== false, voice: storedSettings.voice === true, reducedMotion: storedSettings.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches };
let started = false, introStep = 0, modalOpen = false, cameraStarting = false, service: ServiceHealth | null = null;
let snapshot: GameSnapshot | null = null, toastTimer = 0, dialogueTimer = 0, hintAttempts = 0;
let soundContext: AudioContext | null = null;
let lastUnlocked = 0, previousCoins = 0;
const escaped = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

app.innerHTML = `
  <section class="menu" id="menu">
    <div class="motes">${Array.from({length:18},(_,i)=>`<i style="--x:${20+i*4.3}%;--y:${15+(i*31)%70}%;--d:${3+i%5}s"></i>`).join('')}</div>
    <header class="menu-header"><div class="brand"><span class="sigil">◇</span><div>LEARNSIGN<small>The Lost Signs</small></div></div><div class="header-right"><a href="./winter.html">3D Paris preview ↗</a><span><i class="status-dot"></i>A little magic. In your hands.</span><button class="outline" id="settings-menu">Settings &nbsp; ⚙</button></div></header>
    <div class="menu-content"><div class="chapter-marker eyebrow">Chapter one · Whispering Forest</div><h1>The world<br>has lost<br><em>its voice.</em></h1><p class="menu-desc">A forgotten gauntlet. A forest waiting to wake.<br>Discover the magic in your hands, and bring<br>the lost signs home.</p>
      <div class="menu-actions"><button class="primary" id="new-game">Begin your adventure <span>↗</span></button><button class="secondary" id="continue-game" hidden>Continue ↗</button></div>
      <p class="menu-note"><span>⌨</span> Keyboard adventure · Optional experimental webcam powers</p><p class="mobile-note">Best played on a laptop or desktop with a keyboard.</p>
    </div>
    <div class="floating-note"><span>THE FIRST CRYSTAL AWAITS</span>Follow the light.</div>
    <footer class="menu-bottom"><div class="world-route"><div class="world active"><span>01</span> Whispering Forest</div><div class="world"><span>02</span> Lost Island</div><div class="world"><span>03</span> Frozen Peaks</div><div class="world"><span>04</span> Silent Castle</div></div><div class="menu-credit">AN ADVENTURE THROUGH INDIAN SIGN LANGUAGE<br><strong>Forest prototype · Other worlds planned</strong></div></footer>
  </section>
  <section class="intro" id="intro" hidden data-step="0"><div class="intro-crystals">${Array.from({length:6},(_,i)=>`<i style="--x:${20+(i%3)*30}%;--y:${(i<3?10:50)+(i%2)*8}%;--delay:${i*.2}s"></i>`).join('')}</div><div class="eyebrow" id="intro-kicker"></div><h2 id="intro-title"></h2><p id="intro-text"></p><div class="intro-actions"><button class="primary" id="intro-next">Continue story →</button><button class="text-button" id="intro-skip">Skip to adventure</button></div><div class="intro-pages" id="intro-pages"></div></section>
  <section class="hud" id="hud" hidden aria-label="Game status"><div class="hud-top"><div class="player-status"><div class="portrait">✦</div><div><div class="health" id="health" aria-label="Health"></div><div class="stats"><span id="coins">◈ 0</span><span id="stars">✧ 0 / 5</span></div></div></div><div class="objective"><div class="eyebrow" id="region">Whispering Forest</div><p id="objective">Find the ancient shrine.</p></div><div class="hud-actions"><button id="hint" title="Ask your companion for a hint" aria-label="Ask for a hint">✧</button><button id="camera-toggle" title="Experimental webcam powers" aria-label="Enable webcam">▣</button><button id="pause" title="Pause" aria-label="Pause game">Ⅱ</button></div></div>
    <div class="boss-bar" id="boss-bar" hidden><label>THE FOREST GUARDIAN</label><div class="boss-track"><div id="boss-fill"></div></div></div>
    <div class="focus-banner" id="focus-banner" hidden><strong>Gauntlet focus</strong><span>Time slows. Cast a power, or tap Q to return.</span></div>
    <div class="hud-bottom"><div><div class="mode-badge" id="mode-badge">Keyboard powers</div><div class="power-bar">${(['A','B','C'] as Sign[]).map((s,i)=>`<button class="power locked" data-sign="${s}" aria-label="Cast ${['Force','Shield','Reveal'][i]} (${s})"><kbd>${s}</kbd><small>${['FORCE','SHIELD','REVEAL'][i]}</small></button>`).join('')}</div></div><div class="control-guide"><span><kbd>← →</kbd> Move</span><span><kbd>Space</kbd> Jump</span><span><kbd>Shift</kbd> Dash</span><span><kbd>J</kbd> Attack</span><span><kbd>E</kbd> Discover</span><span><kbd>Q</kbd> Focus</span></div></div>
  </section>
  <aside class="toast" id="toast" hidden aria-live="polite"><div class="eyebrow">THE GAUNTLET AWAKENS</div><h2 id="toast-title"></h2><p id="toast-text"></p></aside>
  <aside class="dialogue" id="dialogue" hidden aria-live="polite"><div class="orb"></div><div><div class="speaker" id="speaker">Luma · your companion</div><p id="dialogue-text"></p><div class="service-label" id="dialogue-source"></div></div><button id="dialogue-close" aria-label="Dismiss dialogue">×</button></aside>
  <aside class="camera" id="camera-panel" hidden><header>GAUNTLET VISION <button id="camera-close" aria-label="Stop webcam">×</button></header><div class="camera-media"><video id="camera-video" muted playsinline></video><canvas id="camera-overlay"></canvas></div><p id="camera-status">Camera off.</p></aside>
  <section class="overlay" id="modal" hidden><div class="panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" id="modal-panel"></div></section>
  <div class="sr-only" id="announcer" aria-live="polite"></div>
`;

const camera = new CameraController(get<HTMLVideoElement>('camera-video'), get<HTMLCanvasElement>('camera-overlay'), text => { get('camera-status').textContent = text; });
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 1280, height: 720, backgroundColor: '#0b2429',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1400 }, debug: false } },
  render: { antialias: true, roundPixels: false }, scene: [GameScene],
  audio: { noAudio: true },
  callbacks: { postBoot: () => emit('ls:settings', settings) },
});

function hasSave() { try { return parseSave(localStorage.getItem(SAVE_KEY)) !== null; } catch { return false; } }
function applySettings() {
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  try { localStorage.setItem('learnsign-settings-v1', JSON.stringify(settings)); } catch { /* Private mode can disable storage. */ }
  emit('ls:settings', settings);
  if (!settings.voice) stopVoice();
}
applySettings(); get('continue-game').hidden = !hasSave();

const story = [
  ['BEFORE THE SILENCE', 'Six crystals. One living world.', 'Their light flowed through the roots, the rivers, and the words between friends. Every corner of LearnSign was connected.'],
  ['THE NIGHT EVERYTHING CHANGED', 'Then came the Silencer.', 'One by one, the Sign Crystals vanished. Bridges fell dark. Ancient gates closed. Even the forest forgot how to answer.'],
  ['A SMALL SPARK REMAINS', 'Some magic cannot be stolen.', 'Beneath an old tree, you discover a forgotten gauntlet. It stirs at your touch. A tiny light emerges from the roots.'],
  ['YOUR ADVENTURE BEGINS', 'The forest is listening.', '“I’m Luma. That gauntlet remembers the lost powers. Find the shrines, awaken their signs, and we can bring the light back.”'],
];
function renderIntro() {
  get('intro').dataset.step = String(introStep);
  get('intro-kicker').textContent = story[introStep][0]; get('intro-title').textContent = story[introStep][1]; get('intro-text').textContent = story[introStep][2];
  get('intro-pages').innerHTML = story.map((_,i)=>`<i class="${i===introStep?'active':''}"></i>`).join('');
  get('intro-next').textContent = introStep === 3 ? 'Enter the forest →' : 'Continue story →';
  stopVoice(); if (settings.voice && service?.gradium) void speak(story[introStep][2]);
}
function begin(continuing: boolean) {
  stopVoice(); camera.stop(); get('camera-panel').hidden = true;
  get('menu').hidden = true; get('intro').hidden = true; get('hud').hidden = false; get('modal').hidden = true;
  get('toast').hidden = true; get('dialogue').hidden = true; modalOpen = false;
  started = true; hintAttempts = 0; lastUnlocked = 0; previousCoins = 0;
  emit('ls:start', { continue: continuing });
  emit('ls:settings', settings);
  game.canvas.focus();
}
function launchStory() { get('menu').hidden = true; get('intro').hidden = false; introStep = 0; renderIntro(); chime('magic'); }
get('new-game').onclick = () => {
  if (!hasSave()) return launchStory();
  openModal(`<div class="eyebrow">A fresh beginning</div><h2 id="modal-title">Start a new journey?</h2><p>Your saved forest progress will be replaced when you enter the adventure.</p><button class="primary" id="confirm-new">Begin again →</button><button class="secondary" id="cancel-new">Keep my adventure</button>`);
  get('confirm-new').onclick = () => { closeModal(); launchStory(); };
  get('cancel-new').onclick = closeModal;
};
get('continue-game').onclick = () => begin(true);
get('intro-next').onclick = () => { if (introStep < 3) { introStep++; renderIntro(); } else begin(false); };
get('intro-skip').onclick = () => begin(false);

let focusBeforeModal: HTMLElement | null = null;
function openModal(html: string) {
  if (!modalOpen) focusBeforeModal = document.activeElement as HTMLElement;
  modalOpen = true; emit('ls:pause', { paused: true }); stopVoice();
  camera.stop(); get('camera-panel').hidden = true;
  get('modal-panel').innerHTML = html; get('modal').hidden = false;
  get('modal-panel').querySelector<HTMLButtonElement>('button')?.focus();
}
function closeModal() {
  modalOpen = false; get('modal').hidden = true;
  if (started) emit('ls:pause', { paused: false });
  focusBeforeModal?.focus();
}
function pauseMenu() {
  if (!started) return;
  openModal(`<div class="eyebrow">Take a breath, adventurer</div><h2 id="modal-title">The forest can wait.</h2><p>Your progress is saved at shrines and checkpoints. Return when you’re ready.</p><button class="primary" id="resume">Continue adventure →</button><button class="secondary" id="pause-settings">Settings</button><button class="secondary" id="back-title">Return to title</button>`);
  get('resume').onclick = closeModal; get('pause-settings').onclick = showSettings; get('back-title').onclick = returnToTitle;
}
function returnToTitle() {
  started = false; modalOpen = false; camera.stop(); stopVoice(); emit('ls:pause', { paused: true });
  ['hud','modal','toast','dialogue','camera-panel','intro'].forEach(id=>get(id).hidden=true);
  get('menu').hidden = false; get('continue-game').hidden = !hasSave();
}
get('pause').onclick = pauseMenu;
get('settings-menu').onclick = showSettings;
function showSettings() {
  openModal(`<button class="close-panel" id="close-settings" aria-label="Close settings">×</button><div class="eyebrow">Make yourself at home</div><h2 id="modal-title">Your adventure.</h2>
    <label class="settings-row"><span>Magical sound effects<small>Short tones for discoveries and rewards.</small></span><input id="set-sound" type="checkbox" ${settings.sound?'checked':''}></label>
    <label class="settings-row"><span>Companion narration<small>Optional Gradium voice. Dialogue always has captions.</small></span><input id="set-voice" type="checkbox" ${settings.voice?'checked':''}></label>
    <label class="settings-row"><span>Reduce motion<small>Reduce decorative movement and camera effects.</small></span><input id="set-motion" type="checkbox" ${settings.reducedMotion?'checked':''}></label>
    <p>Keyboard: arrows to move, Space to jump, Shift to dash, J to attack, E to discover, and A/B/C for powers. Tap Q to slow time for casting.</p>
    <div class="settings-status" id="service-status">Checking companion services…</div>
    <p style="font-size:10px">Camera recognition is experimental. The supplied model’s six labels are not yet verified against ISL demonstrations. Game powers are fictional mappings, not sign translations.</p>
    <button class="primary" id="settings-done">Back to adventure →</button>`);
  get('close-settings').onclick = closeModal; get('settings-done').onclick = closeModal;
  get<HTMLInputElement>('set-sound').onchange = e => { settings.sound = (e.target as HTMLInputElement).checked; applySettings(); chime('coin'); };
  get<HTMLInputElement>('set-voice').onchange = e => { settings.voice = (e.target as HTMLInputElement).checked; applySettings(); };
  get<HTMLInputElement>('set-motion').onchange = e => { settings.reducedMotion = (e.target as HTMLInputElement).checked; applySettings(); };
  void refreshHealth();
}
async function refreshHealth() {
  service = await health();
  const el = document.getElementById('service-status');
  if (el) el.textContent = service ? `Gemini: ${service.gemini?'configured':'not configured'} · Gradium: ${service.gradium?'configured':'not configured'} · Recognition: ${service.recognition?'available, unverified':'not configured'}` : 'Companion service offline. The keyboard adventure and authored dialogue still work.';
}
void refreshHealth();

function chime(kind: 'coin' | 'magic') {
  if (!settings.sound) return;
  try {
    soundContext ??= new AudioContext(); void soundContext.resume();
    const notes = kind === 'coin' ? [740,988] : [330,440,660,880];
    notes.forEach((frequency,i)=>{ const oscillator=soundContext!.createOscillator(), gain=soundContext!.createGain(); oscillator.type='sine';oscillator.frequency.value=frequency; const start=soundContext!.currentTime+i*.075;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+.25);oscillator.connect(gain);gain.connect(soundContext!.destination);oscillator.start(start);oscillator.stop(start+.3); });
  } catch { /* Sound is optional. */ }
}
function showDialogue(speaker: string, text: string, source = '') {
  if (!started || modalOpen) return;
  clearTimeout(dialogueTimer); get('speaker').textContent = speaker; get('dialogue-text').textContent = text; get('dialogue-source').textContent = source; get('dialogue').hidden = false;
  dialogueTimer = window.setTimeout(()=>{get('dialogue').hidden=true;}, Math.max(6500,text.length*65));
  if (settings.voice && service?.gradium) void speak(text);
}
get('dialogue-close').onclick = () => { get('dialogue').hidden = true; stopVoice(); };
const fallbackHints: Record<string,string> = {
  clearing:'Follow the fireflies to the first shrine. Stand close and press E to awaken your gauntlet.',
  force:'Cracked stone yields to Force. Stand close to the boulder and cast A.',
  shield:'Cast B before danger reaches you. Your shield can turn an attack aside.',
  reveal:'Stand near an ancient seal or a chest and cast C. There is more here than meets the eye.',
  puzzle:'The watchers remember this order: Force, Reveal, Shield. Stand beside them and cast A, C, then B.',
  guardian:'Reflect the Guardian’s glowing projectile with B, then get close and cast A while its armor is open.',
  complete:'The forest is awake again. Search the high paths for stars and revisit old chests with C.',
};
get('hint').onclick = async () => {
  if (!snapshot || modalOpen) return;
  const encounter = snapshot.complete?'complete':snapshot.bossHealth>0?'guardian':snapshot.objective.toLowerCase().includes('watch')||snapshot.objective.toLowerCase().includes('sequence')?'puzzle':snapshot.unlocked.includes('C')?'reveal':snapshot.unlocked.includes('B')?'shield':snapshot.unlocked.includes('A')?'force':'clearing';
  const button = get<HTMLButtonElement>('hint'); button.disabled = true;
  try { const hint = await getHint(encounter,snapshot.unlocked,++hintAttempts); showDialogue('Luma · your companion',hint.text,hint.source==='gemini'?'A hint from Gemini':'Forest guide · authored hint'); }
  catch { showDialogue('Luma · your companion',fallbackHints[encounter],'Forest guide · offline hint'); }
  finally { button.disabled=false; }
};

get('camera-toggle').onclick = async () => {
  if (!get('camera-panel').hidden) { camera.stop(); get('camera-panel').hidden=true; return; }
  openModal(`<div class="eyebrow">Experimental gauntlet vision</div><h2 id="modal-title">Let your hands play.</h2><p>Hand tracking runs in your browser. A sequence of hand coordinates is sent to our recognition service. Camera images are not uploaded by this game.</p><p>The existing model uses one hand and predicts six labels. Its ISL accuracy and label order still need verification. You can always use keyboard powers.</p><button class="primary" id="enable-camera">Enable camera →</button><button class="secondary" id="skip-camera">Keep keyboard powers</button>`);
  get('skip-camera').onclick=closeModal;
  get('enable-camera').onclick=async()=>{
    cameraStarting=true; closeModal(); get('camera-panel').hidden=false;
    try { await camera.start(); } finally { cameraStarting=false; if(started&&!modalOpen)emit('ls:pause',{paused:false}); }
  };
};
get('camera-close').onclick=()=>{camera.stop();get('camera-panel').hidden=true;};
document.querySelectorAll<HTMLButtonElement>('[data-sign]').forEach(button=>button.onclick=()=>{emit('ls:gesture',{sign:button.dataset.sign,source:'keyboard'});game.canvas.focus();});

function on<T>(name: string, fn: (detail:T)=>void) { window.addEventListener(name, ((e:CustomEvent<T>)=>fn(e.detail)) as EventListener); }
on<GameSnapshot>('ls:state',state=>{
  snapshot=state;
  get('health').textContent='♥'.repeat(Math.max(0,state.health))+'♡'.repeat(Math.max(0,state.maxHealth-state.health));
  get('health').setAttribute('aria-label',`${state.health} of ${state.maxHealth} health`);
  get('coins').textContent=`◈ ${state.coins}`; get('stars').textContent=`✧ ${state.stars} / 5`;
  get('objective').textContent=state.objective;get('region').textContent=state.region;
  get('focus-banner').hidden=!state.focus;
  get('boss-bar').hidden=state.bossHealth<=0||state.complete;
  get('boss-fill').style.width=`${100*state.bossHealth/Math.max(1,state.bossMaxHealth)}%`;
  document.querySelectorAll<HTMLButtonElement>('[data-sign]').forEach(b=>{const unlocked=state.unlocked.includes(b.dataset.sign as Sign);b.classList.toggle('locked',!unlocked);b.setAttribute('aria-label',`${b.dataset.sign} power ${unlocked?'unlocked':'locked'}`);});
  if(started&&state.unlocked.length>lastUnlocked)chime('magic'); else if(started&&state.coins>previousCoins)chime('coin');
  lastUnlocked=state.unlocked.length;previousCoins=state.coins;
});
on<{title:string;text?:string}>('ls:toast',detail=>{
  if(!started)return;clearTimeout(toastTimer);get('toast-title').textContent=detail.title;get('toast-text').textContent=detail.text||'';get('toast').hidden=false;
  toastTimer=window.setTimeout(()=>get('toast').hidden=true,4200);get('announcer').textContent=`${detail.title}. ${detail.text||''}`;
});
on<{speaker:string;text:string}>('ls:dialogue',detail=>showDialogue(detail.speaker,detail.text));
on<{enabled:boolean}>('ls:camera',detail=>get('mode-badge').textContent=detail.enabled?'Camera model · experimental + keyboard':'Keyboard powers');
on('ls:pause-request',()=>{if(started&&!modalOpen&&!cameraStarting)pauseMenu();});
on<GameSnapshot>('ls:complete',state=>{
  snapshot=state;camera.stop();get('camera-panel').hidden=true;get('toast').hidden=true;get('dialogue').hidden=true;chime('magic');
  const time=`${Math.floor(state.elapsed/60)}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}`;
  openModal(`<div class="result-emblem">◇</div><div class="eyebrow" style="text-align:center">The first light returns</div><h2 id="modal-title" style="text-align:center">The forest remembers.</h2><p>You recovered the Forest Sign Crystal. Across the trees, a thousand tiny lights awaken. Beyond the shore, another crystal is waiting.</p><div class="result-stats"><div><strong>${escaped(time)}</strong><small>ADVENTURE TIME</small></div><div><strong>${state.coins}</strong><small>COINS FOUND</small></div><div><strong>${state.stars}/5</strong><small>HIDDEN STARS</small></div></div><button class="primary" id="explore-more">Continue exploring →</button><button class="secondary" id="replay">Replay the forest</button><button class="text-button" id="result-title" style="display:block;margin:18px auto 0">Return to title</button><p style="font-size:10px;text-align:center">Chapter one complete · Lost Island is a future chapter.</p>`);
  get('explore-more').onclick=closeModal;get('replay').onclick=()=>begin(false);get('result-title').onclick=returnToTitle;
});
window.addEventListener('keydown',event=>{
  if(event.key==='Escape') { if(modalOpen)closeModal();else if(started)pauseMenu(); }
  if(event.key==='Tab'&&modalOpen){const els=Array.from(get('modal-panel').querySelectorAll<HTMLElement>('button,input,a,select')).filter(e=>!(e as HTMLButtonElement).disabled);if(!els.length)return;const first=els[0],last=els[els.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
window.addEventListener('pagehide',()=>{camera.stop();stopVoice();});
