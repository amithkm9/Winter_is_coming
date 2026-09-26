import * as THREE from 'three';
import { createWinterWorld } from './world';
import { createChapterWorld } from './chapter-worlds';
import { LEVELS, isMissionChapter, type MissionChapter } from './levels';
import { createTouchControls } from './touch-controls';
import { createEffects, createCourier } from './effects';
import { WinterMission } from './mission';
import { WinterAudio } from './audio';
import { createDiscoveries, MEMORY_SPARKS } from './discoveries';
import { WinterPractice } from './practice';
import { WinterCampaign, CHAPTERS, type ChapterId } from './campaign';
import { WinterOnboarding } from './onboarding';
import { getCharacter } from './characters';
import { createJourneyUI } from './journey';
import { movementDirection, facingYaw, turnToward } from './movement';
import { createMotionEffects } from './motion-effects';
import { firstPersonPose, parseViewMode } from './view';
import { CameraController } from '../services/camera';
import { getHint, health, speak, stopVoice, type ServiceHealth } from '../services/api';
import './style.css';

const CAMPAIGN_SAVE='winter-campaign-v1',campaign=new WinterCampaign(),onboarding=new WinterOnboarding();
let restoredProfile=false;
try{restoredProfile=campaign.restore(localStorage.getItem(CAMPAIGN_SAVE)||'');}catch{}
let student=getCharacter(campaign.state.character);
function saveCampaign(){try{localStorage.setItem(CAMPAIGN_SAVE,campaign.serialize());}catch{}}

const $ = <T extends HTMLElement = HTMLElement>(id:string)=>document.getElementById(id) as T;
const ui=$('winter-ui');
ui.innerHTML=`
<section class="hero-menu" id="menu"><header class="brand-row"><div class="wordmark"><span class="monogram">W/C</span> THE SILENT RESISTANCE</div><div class="menu-nav"><a href="./forest.html">LearnSign forest ↗</a><span class="label muted">REAL-TIME 3D</span><button class="small-button" id="watch-intro">WATCH INTRO 🎬</button><button class="small-button" id="how-to-play">HOW TO PLAY</button><button class="small-button" id="menu-settings">SETTINGS</button></div></header>
<div class="title-copy"><div class="coordinates label gold">PARIS, 2091 &nbsp; // &nbsp; −27°C</div><h1>WINTER<br>IS <span>COMING.</span></h1><p>Three students. A city waiting for spring.<br>Choose your story. Find your courage.<br>Learn, explore, and bring back the light.</p><div class="menu-buttons"><button class="enter" id="start">BEGIN YOUR STORY <span>↗</span></button><button class="enter secondary" id="continue" hidden>CONTINUE MISSION</button><button class="enter secondary" id="chapter-map">CHAPTER MAP</button></div><div class="student-tag" id="student-tag">${student.name.toUpperCase()} / STUDENT EXPLORER</div><div class="title-subnote">THREE STUDENTS · SAFE TRAINING · A PLAYABLE 3D ADVENTURE</div><p class="mobile-note">Keyboard or touch controls · Landscape recommended on phones.</p></div>
<footer class="menu-footer"><div class="chapter"><span class="chapter-number">01</span><div><div class="label">THE LOUVRE RELAY</div><small>A city held in ice. Three relays. One chance to bring back the dawn.</small><div class="sector-track">${'<i></i>'.repeat(6)}</div></div></div><div class="menu-footer-note"><strong>SIX CHAPTERS / ONE JOURNEY</strong><br>Training + five missions · One city to restore</div></footer></section>
<section class="hud" id="hud" hidden><div class="hud-top"><div class="mission-heading"><div class="label gold" id="chapter-label">CHAPTER 01 / COUR NAPOLÉON</div><h2 id="objective-title">RESTORE THE RELAYS</h2><p id="objective">Find three optical terminals in the courtyard.</p><div class="relay-progress" id="relay-progress"><i></i><i></i><i></i></div><div class="memory-progress" id="memory-progress">◇ MEMORIES 0 / 5</div><div class="mode" id="mode">GESTURE INPUTS · A B C / 1 2 3</div></div><div class="hud-right"><button id="view-button" class="view-button" aria-label="Switch to eye-level view" title="Switch view (V)">VIEW · 3RD</button><button id="journal" aria-label="Open Noor’s journal" title="Noor’s journal">✎</button><button id="hint" aria-label="Ask resistance handler for a hint" title="Ask for a hint">✧</button><button id="camera-button" aria-label="Enable experimental camera" title="Camera">▣</button><button id="pause-button" aria-label="Pause mission" title="Pause">Ⅱ</button></div></div><div class="hud-bottom"><div class="controls"><span><kbd>W A S D</kbd> Move</span><span><kbd>Shift</kbd> Run</span><span><kbd>Drag</kbd> Look</span><span><kbd>V</kbd> View</span><span><kbd>E</kbd> Interact</span><span><kbd>Esc</kbd> Pause</span></div><div class="exposure"><div class="exposure-line"><span>SURVEILLANCE EXPOSURE</span><span id="alert-value">0%</span></div><div class="exposure-track"><div id="alert-fill"></div></div></div></div></section>
<div class="interact-prompt" id="interact" hidden><strong id="interact-title"></strong><small id="interact-sub"></small></div>
<section class="terminal" id="terminal" hidden aria-label="Optical relay"><div class="terminal-head"><div class="label gold" id="terminal-mode">LOCAL OPTICAL LINK</div><button class="close" id="terminal-close" aria-label="Leave terminal">×</button></div><h2 id="terminal-title">WEST ARCADE</h2><p id="terminal-description">Take a moment to practise, then use the gesture inputs to restore this relay.</p><div class="cipher-sequence" id="sequence"></div><div class="terminal-instruction" id="terminal-instruction">Transmit the first cipher.</div><button class="small-button camera-action" id="terminal-camera">USE CAMERA →</button><div class="sign-pad" aria-label="Simulate gesture inputs"><button class="sign-input" data-sign="A" aria-label="Simulate input A">A</button><button class="sign-input" data-sign="B" aria-label="Simulate input B">B</button><button class="sign-input" data-sign="C" aria-label="Simulate input C">C</button><button class="sign-input" data-sign="1" aria-label="Simulate input 1">1</button><button class="sign-input" data-sign="2" aria-label="Simulate input 2">2</button><button class="sign-input" data-sign="3" aria-label="Simulate input 3">3</button></div><button class="small-button" id="terminal-cast">TRANSMIT INPUT A</button><button class="small-button practice-button" id="practice-toggle">PRACTISE FIRST · NO DANGER</button><div class="terminal-foot">Tap an input below or use A / B / C / 1 / 2 / 3.<br>Camera labels are experimental. These ciphers are fictional game inputs, not verified sign-language lessons.</div></section>
<div class="letterbox" id="letterbox" hidden></div><section class="briefing" id="briefing" hidden><div class="caption"><div class="label gold" id="briefing-label">RESISTANCE ARCHIVE // PARIS</div><p id="briefing-text"></p></div><button class="skip" id="skip">SKIP BRIEFING →</button></section>
<aside class="transmission" id="transmission" hidden aria-live="polite"><button class="close" id="transmission-close" aria-label="Dismiss transmission">×</button><div class="label gold">MAËLLE / RESISTANCE HANDLER</div><p id="transmission-text"></p><div class="source" id="transmission-source"></div></aside>
<aside class="toast" id="toast" hidden aria-live="polite"><div class="label gold">RESISTANCE NETWORK</div><h2 id="toast-title"></h2><p id="toast-text"></p></aside>
<section class="overlay" id="modal" hidden><div class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"></div></section>
<aside class="camera" id="camera-panel" hidden><header>OPTICAL INPUT / EXPERIMENTAL <button id="camera-close" aria-label="Stop camera">×</button></header><div class="camera-media"><video id="camera-video" muted playsinline></video><canvas id="camera-canvas"></canvas></div><p id="camera-target" class="camera-target">Approach a terminal to use your signs.</p><p id="camera-status" role="status"></p><button id="camera-retry" class="small-button">RESTART CAMERA</button></aside>
${[0,1,2].map(i=>`<div class="nav-marker" id="marker-${i}" hidden><span>◇</span><div id="marker-label-${i}"></div></div>`).join('')}
<div class="nav-marker core-marker" id="marker-core" hidden><span>✦</span><div id="marker-core-label"></div></div><section class="training-progress" id="training-progress" hidden><div class="label">THE FIRST SPARK / SAFE SIMULATION</div><h3 id="training-title"></h3><p id="training-text"></p><div class="training-steps"><i></i><i></i><i></i></div></section><div class="scan-warning" id="scan-warning" hidden><strong>SCANNER NEARBY</strong><span>Move out of the red pool</span></div><div class="input-feedback" id="input-feedback" hidden aria-live="polite"></div><div class="warning" id="warning" hidden></div><div class="sr-only" id="announcer" aria-live="polite"></div>
<section class="video-overlay" id="video-intro" hidden aria-label="Prologue cinematic"><div class="video-container"><div class="video-header"><div class="label gold">TRANSMISSION // AI TAKEOVER PROLOGUE</div><button class="skip" id="video-skip">SKIP INTRO →</button></div><div class="video-frame"><video id="prologue-video" playsinline webkit-playsinline controls preload="auto" src="./Opening_Full_subtitled.mp4"></video></div><div class="video-footer"><small>PARIS · CRYOGENIC AI TAKEOVER · RESTORE THE RESISTANCE</small></div></div></section>`;

let chapter:MissionChapter='louvre',level=LEVELS.louvre,mission=new WinterMission('louvre');
const practice=new WinterPractice(),soundscape=new WinterAudio();
const SETTINGS='winter-settings-v1',LAST_CHAPTER='winter-last-chapter-v1';
const missionKey=(id:MissionChapter)=>`winter-${id}-v1`;
const mobileDevice=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
function resumeChapter():MissionChapter{try{const id=localStorage.getItem(LAST_CHAPTER) as MissionChapter;return isMissionChapter(id)&&['available','completed'].includes(campaign.status(id))?id:'louvre';}catch{return 'louvre';}}
const stored=(()=>{try{const data=JSON.parse(localStorage.getItem(SETTINGS)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}})();
const settings={view:parseViewMode(stored.view),low:typeof stored.low==='boolean'?stored.low:mobileDevice,reduced:typeof stored.reduced==='boolean'?stored.reduced:false,sound:stored.sound!==false,music:stored.music!==false,volume:typeof stored.volume==='number'&&Number.isFinite(stored.volume)?Math.max(0,Math.min(.8,stored.volume)):.45,voice:stored.voice===true};
let active=false,paused=false,intro=false,introTime=0,animation=0,lastTime=performance.now(),time=0,saveClock=0;
let yaw=0,pitch=0,dragging=false,lookPointer:number|null=null,lastPointer=0,lastPointerY=0,modalOpen=false,previousPhase='',previousRelays=0,previousRespawns=0,hints=0;
let nearest:number|null=null,nearCore=false,toastTimer=0,transmissionTimer=0,service:ServiceHealth|null=null,cameraStarting=false;
let walking=false,running=false,wasScanned=false,feedbackTimer=0,operation=0;
let academy=false;
const keys=new Set<string>();
const position=new THREE.Vector3(0,0,26),lastSafe=new THREE.Vector3(0,0,26);
const velocity=new THREE.Vector3(),cameraForward=new THREE.Vector3(),cameraLead=new THREE.Vector3();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1727);scene.fog=new THREE.FogExp2(0x163044,.014);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{
  ui.innerHTML=`<section class="error-screen"><div class="panel"><div class="label gold">3D PREVIEW</div><h2>WebGL is unavailable.</h2><p>This scene needs hardware-accelerated WebGL 2. Try a current desktop browser with hardware acceleration enabled.</p><a href="./forest.html">Play the 2D forest adventure →</a></div></section>`;
  throw new Error('WebGL2 unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,settings.low?1:1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!settings.low;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
renderer.outputColorSpace=THREE.SRGBColorSpace;$('world').append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','3D frozen Paris courtyard. Use WASD to move and drag to turn the camera.');renderer.domElement.tabIndex=0;
const hemisphere=new THREE.HemisphereLight(0xa6cfec,0x172332,2.5);scene.add(hemisphere);
const sun=new THREE.DirectionalLight(0x8cc9f3,3.6);sun.position.set(-25,45,16);sun.castShadow=true;sun.shadow.mapSize.set(mobileDevice?1024:2048,mobileDevice?1024:2048);
Object.assign(sun.shadow.camera,{left:-45,right:45,top:42,bottom:-42,near:1,far:120});sun.shadow.normalBias=.045;sun.shadow.bias=-.0002;scene.add(sun);
let world=createWinterWorld(scene);let courier=createCourier(student.id);scene.add(courier.object);courier.object.position.copy(position);
function refreshStudent(){student=getCharacter(campaign.state.character);scene.remove(courier.object);courier.dispose();courier=createCourier(student.id);scene.add(courier.object);courier.object.position.copy(position);$('student-tag').textContent=`${student.name.toUpperCase()} / STUDENT EXPLORER`;$('journal').setAttribute('aria-label',`Open ${student.name}’s journal`);$('journal').title=`${student.name}’s journal`;}
let memoryPages=MEMORY_SPARKS;let discoveries=createDiscoveries(scene);discoveries.group.visible=false;
const motionEffects=createMotionEffects(scene);
const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({
  vertexShader:'varying vec2 shadowUV;void main(){shadowUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 shadowUV;void main(){float a=(1.-smoothstep(.12,.5,length(shadowUV-.5)))*.25;gl_FragColor=vec4(.015,.04,.06,a);}',
  transparent:true,depthWrite:false,
}));contactShadow.rotation.x=-Math.PI/2;contactShadow.scale.set(.9,.7,1);contactShadow.visible=false;scene.add(contactShadow);
const trainingBeacon=new THREE.Group();trainingBeacon.position.set(0,0,19);trainingBeacon.visible=false;scene.add(trainingBeacon);
const trainingMaterial=new THREE.MeshStandardMaterial({color:0xb2e8dd,emissive:0x53cbbb,emissiveIntensity:1.1,roughness:.35,metalness:.4});
const trainingBase=new THREE.Mesh(new THREE.CylinderGeometry(.5,.65,.45,12),trainingMaterial);trainingBase.position.y=.225;trainingBeacon.add(trainingBase);
const trainingSymbol=new THREE.Mesh(new THREE.OctahedronGeometry(.3),trainingMaterial);trainingSymbol.position.y=1.7;trainingBeacon.add(trainingSymbol);
const trainingRing=new THREE.Mesh(new THREE.TorusGeometry(.75,.025,6,48),trainingMaterial);trainingRing.rotation.x=Math.PI/2;trainingRing.position.y=.09;trainingBeacon.add(trainingRing);
const effects=createEffects(renderer,scene,camera);
const pulse=new THREE.Mesh(new THREE.RingGeometry(.96,1,128),new THREE.MeshBasicMaterial({color:0xffd29a,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
pulse.rotation.x=-Math.PI/2;pulse.position.copy(world.core).add(new THREE.Vector3(0,.12,0));scene.add(pulse);
const tracker=new CameraController($<HTMLVideoElement>('camera-video'),$<HTMLCanvasElement>('camera-canvas'),message=>{$('camera-status').textContent=message;});

const touch=createTouchControls(ui,{interact,view:toggleView,pause:pauseMenu});
function settingsChanged(){renderer.shadowMap.enabled=!settings.low;world.setQuality?.(settings.low);document.body.classList.toggle('reduced',settings.reduced);soundscape.configure({enabled:settings.sound,music:settings.music,volume:settings.volume});try{localStorage.setItem(SETTINGS,JSON.stringify(settings));}catch{}if(!settings.voice)stopVoice();renderer.setPixelRatio(Math.min(devicePixelRatio,settings.low?1:1.5));renderer.setSize(innerWidth,innerHeight);effects.resize(innerWidth,innerHeight);}
settingsChanged();
const hasSave=(id:MissionChapter='louvre')=>{try{return new WinterMission(id).restore(localStorage.getItem(missionKey(id))||'');}catch{return false;}};
if(!restoredProfile&&hasSave()){campaign.skipTutorial();const legacy=new WinterMission();try{legacy.restore(localStorage.getItem(missionKey('louvre'))||'');if(legacy.state.phase==='complete')campaign.completeChapter('louvre');}catch{}saveCampaign();}
// A completed mission can outlive a failed profile write. Reconcile only the
// next legitimately available chapter, never bypassing campaign prerequisites.
for(const id of Object.keys(LEVELS) as MissionChapter[]){
  if(campaign.status(id)!=='available')continue;
  const savedMission=new WinterMission(id);
  try{if(savedMission.restore(localStorage.getItem(missionKey(id))||'')&&savedMission.state.phase==='complete'){campaign.completeChapter(id);saveCampaign();}}catch{}
}
const journey=createJourneyUI(ui,campaign,{
  choose(id){campaign.selectCharacter(id);saveCampaign();refreshStudent();},
  launch(id){if(id==='academy')start(false,true,'louvre');else start(hasSave(id),false,id);},
  close(){journey.hide();$('menu').hidden=false;$('start').focus();},
});
$('continue').hidden=!hasSave(resumeChapter());
function save(){if(!active||academy)return;try{localStorage.setItem(missionKey(chapter),JSON.stringify({...JSON.parse(mission.serialize()),memories:discoveries.collected(),character:student.id}));localStorage.setItem(LAST_CHAPTER,chapter);}catch{}}
function chapterMemories():typeof MEMORY_SPARKS{
  const points:readonly (readonly [number,number])[]=[[-6,24],[-18,18],[18,5],[-18,-10],[0,-21]];
  const notes=[`A new page begins at ${level.title}. I keep going, one small step at a time.`, 'We can take time to understand each other. That is what makes a team.', 'The lights behind me mark how far I have come.', 'I used a familiar input in a new place. Practice can become confidence.', 'Paris is changing around us. I want everyone to see what we built together.'];
  return points.map((position,id)=>({id,position,title:`${level.title} · Memory ${id+1}`,text:notes[id]}));
}
function start(continuing=false,training=false,id:MissionChapter=chapter){
  if(!training&&!['available','completed'].includes(campaign.status(id)))return;
  operation++;chapter=training?'louvre':id;level=LEVELS[chapter];mission=new WinterMission(chapter);
  ui.style.setProperty('--gold',`#${new THREE.Color(level.accent).getHexString()}`);pulse.material.color.set(level.accent);
  world.dispose();world=chapter==='louvre'?createWinterWorld(scene):createChapterWorld(scene,chapter);world.setQuality?.(settings.low);
  discoveries.dispose();memoryPages=chapter==='louvre'?MEMORY_SPARKS:chapterMemories();discoveries=createDiscoveries(scene,memoryPages);
  pulse.position.copy(world.core).add(new THREE.Vector3(0,.12,0));coldSky.set(level.sky);coldFog.set(level.fog);touch.reset();stopVoice();velocity.set(0,0,0);cameraLead.set(0,0,0);motionEffects.reset();
  journey.hide();academy=training;onboarding.reset();trainingBeacon.visible=training;document.body.classList.toggle('academy',training);refreshStudent();
  tracker.stop();practice.stop();$('camera-panel').hidden=true;keys.clear();paused=false;modalOpen=false;$('modal').hidden=true;$('menu').hidden=true;
  discoveries.reset([]);mission.reset();let restored=false;if(continuing){try{const raw=localStorage.getItem(missionKey(chapter))||'';restored=mission.restore(raw);if(restored){const memories=JSON.parse(raw).memories;discoveries.reset(Array.isArray(memories)?memories:[]);}}catch{}}
  if(!restored)mission.start();
  active=true;discoveries.group.visible=!academy;wasScanned=false;position.copy(world.spawn??new THREE.Vector3(0,0,26));lastSafe.copy(position);yaw=0;pitch=0;previousRelays=mission.state.completed.length;previousPhase=mission.state.phase==='liberating'?'':mission.state.phase;previousRespawns=mission.state.respawns;
  intro=!restored&&!academy;introTime=0;$('briefing').hidden=!intro;$('letterbox').hidden=!intro;$('hud').hidden=intro;
  lastCaption=-1;$('skip').hidden=false;$('briefing-label').textContent='RESISTANCE ARCHIVE // PARIS';
  if(restored&&mission.state.phase==='complete')transmit(level.completion);
  soundscape.setPaused(false);void soundscape.unlock().then(()=>{if(active&&!paused)sound('start');});save();renderer.domElement.focus();
}
function playVideoModal(videoSrc:string,titleText:string,onDone:()=>void){
  const overlay=$('video-intro'),video=$<HTMLVideoElement>('prologue-video'),headerLabel=overlay?.querySelector('.label');
  if(!overlay||!video){onDone();return;}
  if(headerLabel)headerLabel.textContent=titleText;
  video.src=videoSrc;
  overlay.hidden=false;soundscape.setPaused(true);
  let finished=false;
  const finish=()=>{
    if(finished)return;finished=true;
    try{video.pause();video.currentTime=0;}catch{}
    overlay.hidden=true;soundscape.setPaused(false);
    onDone();
  };
  video.onended=finish;video.onerror=finish;
  const skip=$('video-skip');if(skip)skip.onclick=finish;
  video.onclick=()=>{if(video.muted){video.muted=false;video.play().catch(()=>{});}};
  try{
    const p=video.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{
      // If browser blocks unmuted autoplay, start muted and allow tap to unmute
      video.muted=true;
      video.play().catch(()=>{});
    });
  }catch{finish();}
}

function playPrologue(onDone:()=>void){
  playVideoModal('./Opening_Full_subtitled.mp4','TRANSMISSION // AI TAKEOVER PROLOGUE',onDone);
}

$('start').onclick=()=>{$('menu').hidden=true;playPrologue(()=>{journey.showCharacters();});};
const watchIntroBtn=$('watch-intro');if(watchIntroBtn)watchIntroBtn.onclick=()=>{$('menu').hidden=true;playPrologue(()=>{$('menu').hidden=false;$('start').focus();});};
$('chapter-map').onclick=()=>openChapterMap();
$('continue').onclick=()=>start(true,false,resumeChapter());
function endIntro(){intro=false;$('briefing').hidden=true;$('letterbox').hidden=true;$('hud').hidden=false;stopVoice();transmit(`${student.name}, ${level.arrival} Use E or INTERACT near a terminal. Safe practice is always available.`);renderer.domElement.focus();}
$('skip').onclick=()=>{void soundscape.unlock();endIntro();};
$('briefing').onclick=()=>{if(intro){void soundscape.unlock();endIntro();}};
$('briefing').addEventListener('pointerdown',()=>{if(intro){void soundscape.unlock();endIntro();}});

let lastFocus:HTMLElement|null=null;
function openModal(content:string){if(!modalOpen)lastFocus=document.activeElement as HTMLElement;modalOpen=true;paused=true;soundscape.setPaused(true);keys.clear();touch.reset();dragging=false;lookPointer=null;stopVoice();tracker.stop();$('camera-panel').hidden=true;$('panel').innerHTML=content;$('modal').hidden=false;$('panel').querySelector<HTMLButtonElement>('button')?.focus();}
function closeModal(){modalOpen=false;paused=false;soundscape.setPaused(!active);if(active)void soundscape.unlock();keys.clear();$('modal').hidden=true;lastFocus?.focus();}
function pauseMenu(){if(!active||intro)return;save();openModal(`<div class="label gold">${academy?'TRAINING BREAK':'OPERATION ON HOLD'}</div><h2 id="modal-title">Take your time.</h2><p>${academy?'This is a safe simulation. You can return to the map or skip training without earning its completion badge.':'The city waits. Completed relays are saved on this device.'}</p><button class="enter" id="resume">RESUME →</button><button class="enter secondary" id="pause-map">CHAPTER MAP</button>${academy?'<button class="enter secondary" id="skip-training">SKIP TRAINING · ENTER LOUVRE</button>':''}<button class="enter secondary" id="pause-settings">VISUAL & AUDIO SETTINGS</button><button class="enter secondary" id="title">RETURN TO TITLE</button>`);$('resume').onclick=closeModal;$('pause-settings').onclick=showSettings;$('title').onclick=returnToTitle;$('pause-map').onclick=()=>openChapterMap(academy?'academy':chapter);if(academy)$('skip-training').onclick=()=>{campaign.skipTutorial();saveCampaign();start(hasSave('louvre'),false,'louvre');};}
function returnToTitle(){save();operation++;active=false;paused=false;intro=false;modalOpen=false;academy=false;trainingBeacon.visible=false;practice.stop();touch.reset();discoveries.group.visible=false;soundscape.setPaused(true);keys.clear();tracker.stop();stopVoice();journey.hide();['hud','modal','terminal','briefing','letterbox','camera-panel','interact','toast','transmission','scan-warning','input-feedback','training-progress','marker-core','video-intro'].forEach(id=>$(id).hidden=true);const vid=$<HTMLVideoElement>('prologue-video');if(vid){try{vid.pause();vid.currentTime=0;}catch{}}$('menu').hidden=false;$('continue').hidden=!hasSave(resumeChapter());document.body.classList.remove('terminal-open','academy','practising');}
function openChapterMap(chapter?:ChapterId){returnToTitle();$('menu').hidden=true;journey.showMap(chapter);}
$('pause-button').onclick=pauseMenu;$('menu-settings').onclick=showSettings;
$('how-to-play').onclick=()=>{
  openModal(`<div class="label gold">YOUR JOURNEY / HOW IT WORKS</div><h2 id="modal-title">Learn the controls.<br>Bring back the light.</h2><ol class="player-guide"><li><strong>Choose your student.</strong> Noor, Elio and Mira have different looks and the same abilities.</li><li><strong>Start with The First Spark.</strong> Walk to the green practice beacon, press E and rehearse input A. Camera is optional.</li><li><strong>Enter the Louvre.</strong> Explore, avoid red scanner pools and reach three relay terminals.</li><li><strong>Practise, then use the input.</strong> Choose PRACTISE FIRST safely. Return to the real relay and enter its displayed sequence.</li><li><strong>Restore the city.</strong> With three relays complete, press E at the central core. Choose NEXT CHAPTER to continue through the Canal, Glasshouse, Observatory and Spire.</li></ol><p>On phones, use the left joystick, drag the world to look, and tap INTERACT. On desktop, WASD / arrows move relative to the screen. Shift runs. V switches between third-person and eye-level views. Drag turns the view (up/down too in eye view). Your student faces the direction they actually travel.</p><p>The camera model predicts game labels. Each chapter opens a new part of Paris. Camera labels remain experimental; verified sign demonstrations are still in development.</p><button class="enter" id="guide-close">READY TO EXPLORE →</button>`);
  $('guide-close').onclick=closeModal;
};
function showSettings(){openModal(`<div class="label gold">REAL-TIME CINEMATOGRAPHY</div><h2 id="modal-title">Tune the atmosphere.</h2><label class="setting"><span>Performance mode<small>Lower pixel density and particles; disable shadows and postprocessing.</small></span><input type="checkbox" id="set-low" ${settings.low?'checked':''}></label><label class="setting"><span>Reduced motion<small>No camera flight, snow movement or grain animation.</small></span><input type="checkbox" id="set-reduced" ${settings.reduced?'checked':''}></label><label class="setting"><span>Sound effects<small>Footsteps, gesture chimes, warning cues and discoveries.</small></span><input type="checkbox" id="set-sound" ${settings.sound?'checked':''}></label><label class="setting"><span>Atmospheric music<small>A gentle musical bed that warms as you restore the city.</small></span><input type="checkbox" id="set-music" ${settings.music?'checked':''}></label><label class="setting"><span>Effects & music volume<small>Narration uses its separate toggle below.</small></span><input type="range" min="0" max="0.8" step="0.05" id="set-volume" aria-label="Effects and music volume" value="${settings.volume}"></label><label class="setting"><span>Handler narration<small>Optional Gradium voice with matching captions.</small></span><input type="checkbox" id="set-voice" ${settings.voice?'checked':''}></label><p id="services">Checking optional companion services…</p><button class="enter" id="settings-close">RETURN →</button>`);
  (['low','reduced','sound','music','voice'] as const).forEach(key=>$<HTMLInputElement>(`set-${key}`).onchange=e=>{settings[key]=(e.target as HTMLInputElement).checked;settingsChanged();});$('settings-close').onclick=closeModal;$<HTMLInputElement>('set-volume').oninput=e=>{settings.volume=Number((e.target as HTMLInputElement).value);settingsChanged();};void refreshServices();}
async function refreshServices(){service=await health();const el=document.getElementById('services');if(el)el.textContent=service?`Gemini: ${service.gemini?'key configured (not proof of connection)':'not configured'}. Gradium: ${service.gradium?'key configured':'not configured'}. Recognition: ${service.recognition?'experimental model available':'unavailable'}.`:'Companion service offline. Keyboard gameplay and authored transmissions remain available.';}
void refreshServices();
function toast(title:string,text:string){if(modalOpen)return;clearTimeout(toastTimer);$('toast-title').textContent=title;$('toast-text').textContent=text;$('toast').hidden=false;$('announcer').textContent=`${title}. ${text}`;toastTimer=window.setTimeout(()=>$('toast').hidden=true,3800);}
$('toast').onclick=()=>{clearTimeout(toastTimer);$('toast').hidden=true;};
$('toast').addEventListener('pointerdown',e=>{e.stopPropagation();clearTimeout(toastTimer);$('toast').hidden=true;});
function transmit(text:string,source='AUTHORED TRANSMISSION'){if(modalOpen||!active||intro||paused)return;clearTimeout(transmissionTimer);$('transmission-text').textContent=text;$('transmission-source').textContent=source;$('transmission').hidden=false;transmissionTimer=window.setTimeout(()=>$('transmission').hidden=true,10000);if(settings.voice&&service?.gradium)void speak(text);}
$('transmission').onclick=()=>{clearTimeout(transmissionTimer);$('transmission').hidden=true;stopVoice();};
$('transmission').addEventListener('pointerdown',e=>{e.stopPropagation();clearTimeout(transmissionTimer);$('transmission').hidden=true;stopVoice();});
$('transmission-close').onclick=(e)=>{e.stopPropagation();$('transmission').hidden=true;stopVoice();};
$('hint').onclick=async()=>{if(!academy&&chapter!=='louvre'){transmit(mission.state.completed.length===3?`All circuits are ready. Reach ${level.coreName} and use INTERACT or E.`:`${level.arrival} Restore the marked link, then follow the newly opened route. Safe practice stops danger while you rehearse.`);return;}if(academy){const message=onboarding.state.stage===0?'Use WASD or the arrow keys to walk a few steps. Drag on the scene to look around.':onboarding.state.stage===1?'Approach the glowing green practice beacon in front of you and press E.':'Press A in practice to rehearse a keyboard input, or enable the camera for experimental recognition. There is no drone danger here.';feedback(message);return;}const button=$<HTMLButtonElement>('hint');button.disabled=true;const generation=operation;const state=mission.state;const encounter=state.phase==='complete'?'winter-liberated':state.completed.length===3?'winter-core':state.alert>40?'winter-drone':state.phase==='terminal'?'winter-relay':'winter-arrival';try{const result=await getHint(encounter,['A','B','C'],++hints);if(generation!==operation)return;transmit(result.text,result.source==='gemini'?'GEMINI TRANSMISSION':'AUTHORED TRANSMISSION');}catch{if(generation!==operation)return;transmit(state.completed.length===3?'All three relays are restored. Return to the illuminated core in front of the pyramid and press E.':'Follow the amber diamonds to an optical terminal. Press E nearby, then enter its A/B/C cipher. Avoid the red drone scanner pools.','OFFLINE TRANSMISSION');}finally{button.disabled=false;}};

function feedback(text:string,success=true){
  clearTimeout(feedbackTimer);$('input-feedback').textContent=text;$('input-feedback').classList.toggle('retry',!success);$('input-feedback').hidden=false;
  feedbackTimer=window.setTimeout(()=>$('input-feedback').hidden=true,2300);
}
function releaseTerminalView(){if(settings.view==='first-person'){camera.getWorldDirection(cameraForward);yaw=Math.atan2(-cameraForward.x,-cameraForward.z);pitch=THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(cameraForward.y,-1,1)),-.85,.85);}dragging=false;}
function leaveTerminal(){releaseTerminalView();tracker.resetRecognition();practice.stop();mission.exitRelay();keys.clear();}
function finishAcademy(){
  if(!onboarding.confirmInput())return;
  campaign.completeChapter('academy');saveCampaign();leaveTerminal();
  openModal(`<div class="label gold">CHAPTER 00 / FIRST SPARK COMPLETE</div><h2 id="modal-title">Your adventure<br>starts here.</h2><p>${student.name} can move through the world, approach an interaction and rehearse its input. The Louvre mission is now unlocked.</p><div class="training-summary">✓ Movement & exploration<br>✓ Beacon interaction<br>✓ Gesture-input rehearsal</div><p>Rehearsal confirms a game input. Verified sign demonstrations and recognition assessment are still being developed.</p><button class="enter" id="academy-map">OPEN CHAPTER MAP →</button><button class="enter secondary" id="academy-repeat">PRACTISE AGAIN</button>`);
  $('academy-map').onclick=()=>openChapterMap('louvre');$('academy-repeat').onclick=()=>start(false,true);
}
function interact(){
  if(!active||paused||intro)return;
  if(mission.state.phase==='terminal'){leaveTerminal();return;}
  if(academy){
    if(position.distanceTo(trainingBeacon.position)<3.5){
      if(onboarding.state.stage===0)onboarding.move(4);
      if(onboarding.enterBeacon()||onboarding.state.stage===2){
        dragging=false;lookPointer=null;touch.reset();tracker.resetRecognition();mission.enterRelay(0);practice.begin(['A']);keys.clear();sound('terminal');
      }
    }
    return;
  }
  if(nearCore&&mission.state.completed.length===3){if(mission.finishAtCore()){tracker.stop();$('camera-panel').hidden=true;sound('win');save();}return;}
  if(nearest!==null&&mission.canEnterRelay(nearest)){dragging=false;lookPointer=null;touch.reset();tracker.resetRecognition();mission.enterRelay(nearest);practice.stop();keys.clear();sound('terminal');}
}
$('interact').onclick=()=>{interact();};
$('interact').addEventListener('pointerdown',e=>{e.stopPropagation();interact();});
function submit(sign:string,source:'keyboard'|'camera'='keyboard'){
  if(paused||intro||!active||mission.state.phase!=='terminal')return;
  if(academy&&!practice.state.active)return;
  if(practice.state.active){
    const before=practice.state;if(before.complete)return;
    const accepted=practice.submit(sign,source);
    if(accepted){sound(practice.state.complete?'relay':'select');feedback(practice.state.complete?'REHEARSAL COMPLETE · TRY THE RELAY WHEN READY':'INPUT RECEIVED');if(!settings.reduced)discoveries.celebrate(position,0x86dbeb);if(academy&&practice.state.complete){finishAcademy();return;}}
    else if(['A','B','C','1','2','3'].includes(sign)){sound('error');feedback('TAKE YOUR TIME · TRY AGAIN',false);}
    updateHud();return;
  }
  const before=mission.state;mission.submit(sign,source);const after=mission.state;
  if(after.completed.length>before.completed.length){
    releaseTerminalView();
    lastSafe.copy(position);save();sound('relay');if(!settings.reduced)discoveries.celebrate(position);feedback('RELAY RESTORED');
    const rewards=['Your first relay! A little courage goes a long way.','Two links restored. The city is beginning to glow.','All three links restored. Return to the core and bring back the dawn.'];
    toast('YOU BROUGHT BACK THE LIGHT',rewards[after.completed.length-1]);
  }else if(after.mistakes>before.mistakes){sound('error');feedback('TRY AGAIN · YOUR RESTORED RELAYS ARE SAFE',false);}
  else if(after.step>before.step){sound('select');feedback('INPUT RECEIVED');if(!settings.reduced)discoveries.celebrate(position,0x86dbeb);}
  updateHud();
}
$('terminal-close').onclick=leaveTerminal;
ui.querySelectorAll<HTMLButtonElement>('[data-sign]').forEach(button=>button.onclick=()=>submit(button.dataset.sign!));
$('practice-toggle').onclick=()=>{if(mission.state.phase!=='terminal')return;tracker.resetRecognition();if(academy){leaveTerminal();updateHud();return;}if(practice.state.active){practice.stop();sound('terminal');}else{practice.begin(mission.state.sequence);sound('select');}keys.clear();updateHud();};
$('terminal-cast').onclick=()=>{const state=practice.state.active?practice.state:mission.state;if(practice.state.complete){practice.begin(mission.state.sequence);updateHud();return;}const sign=state.sequence[state.step];if(sign)submit(sign);};
$('journal').onclick=()=>{
  const collected=discoveries.collected();
  openModal(`<div class="label gold">${student.name.toUpperCase()}’S NOTEBOOK / ${collected.length} OF 5 PAGES</div><h2 id="modal-title">Small discoveries.<br>A bigger world.</h2><p>${student.description}</p><div class="journal-pages">${memoryPages.map(memory=>collected.includes(memory.id)?`<article><h3>◇ ${memory.title}</h3><p>${memory.text}</p></article>`:`<article class="locked"><h3>◇ A page still to find</h3><p>Look for a golden spark in the sector.</p></article>`).join('')}</div><p>${collected.length===5?`Explorer’s scarf unlocked. ${student.name} wears the colors of returning sunlight.`:`Find all five pages to unlock ${student.name}’s golden explorer scarf. These discoveries are optional.`}</p><button class="enter" id="journal-close">BACK TO THE ADVENTURE →</button>`);
  $('journal-close').onclick=closeModal;
};
window.addEventListener('ls:gesture',((event:CustomEvent<{sign:string;source:'keyboard'|'camera'}>)=>submit(event.detail.sign,event.detail.source)) as EventListener);
window.addEventListener('keydown',event=>{
  if(event.key==='Tab'&&modalOpen){const items=Array.from($('panel').querySelectorAll<HTMLElement>('button,input,a')).filter(el=>!(el as HTMLButtonElement).disabled);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
  if(event.code==='Escape'){if(modalOpen)closeModal();else if(mission.state.phase==='terminal')leaveTerminal();else pauseMenu();return;}
  if(journey.open)return;
  if(!active||paused||intro)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
  if(event.repeat)return;
  if(event.code==='KeyV'){event.preventDefault();toggleView();return;}
  if(event.code==='KeyE'){interact();return;}
  if(mission.state.phase==='terminal'){if(['KeyA','KeyB','KeyC','Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(event.code))submit(event.code.slice(-1));return;}
  keys.add(event.code);
});
window.addEventListener('keyup',event=>keys.delete(event.code));
for(const event of ['pointerdown','keydown'])window.addEventListener(event,()=>{if(active&&!paused)void soundscape.unlock();});
window.addEventListener('blur',()=>{keys.clear();touch.reset();lookPointer=null;dragging=false;if(active&&!modalOpen&&!cameraStarting){if(intro){paused=true;soundscape.setPaused(true);stopVoice();}else pauseMenu();}});
window.addEventListener('focus',()=>{if(intro&&!modalOpen){paused=false;soundscape.setPaused(false);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!modalOpen){keys.clear();touch.reset();lookPointer=null;dragging=false;if(intro){paused=true;soundscape.setPaused(true);stopVoice();}else pauseMenu();}});
renderer.domElement.addEventListener('pointerdown',e=>{if(lookPointer!==null||!active||paused||intro||mission.state.phase==='terminal')return;dragging=true;lookPointer=e.pointerId;lastPointer=e.clientX;lastPointerY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId===lookPointer&&dragging&&active&&!paused&&!intro&&['explore','complete'].includes(mission.state.phase)){yaw-=(e.clientX-lastPointer)*.006;if(settings.view==='first-person')pitch=THREE.MathUtils.clamp(pitch-(e.clientY-lastPointerY)*.004,-.85,.85);lastPointer=e.clientX;lastPointerY=e.clientY;}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,raw=>{const e=raw as PointerEvent;if(e.pointerId===lookPointer){dragging=false;lookPointer=null;}});

$('camera-button').onclick=()=>{
  if(!$('camera-panel').hidden){tracker.stop();$('camera-panel').hidden=true;return;}
  openModal(`<div class="label gold">GESTURE RECOGNITION (EXPERIMENTAL)</div><h2 id="modal-title">Optical Hand Tracking</h2><p>Webcam gesture recognition is an experimental AI feature that connects to a local Python vision server.</p><p><strong>On Mobile & Web:</strong> You can play and transmit all ciphers instantly by tapping the on-screen buttons (<strong>A, B, C, 1, 2, 3</strong>) or <strong>TRANSMIT INPUT</strong>!</p><button class="enter" id="camera-enable">START WEBCAM →</button><button class="enter secondary" id="camera-cancel">USE TOUCH BUTTONS</button>`);
  $('camera-cancel').onclick=closeModal;$('camera-enable').onclick=async()=>{cameraStarting=true;closeModal();$('camera-panel').hidden=false;try{await tracker.start();}finally{cameraStarting=false;}};
};
$('camera-close').onclick=()=>{tracker.stop();$('camera-panel').hidden=true;};
$('terminal-camera').onclick=()=>{if(tracker.enabled){$('camera-panel').hidden=false;return;}$('camera-button').click();};
$('camera-retry').onclick=async()=>{if(cameraStarting)return;cameraStarting=true;try{await tracker.start();}finally{cameraStarting=false;}};
window.addEventListener('ls:camera',((e:CustomEvent<{enabled:boolean}>)=>{$('mode').textContent=e.detail.enabled?'EXPERIMENTAL CAMERA + SIMULATION':'GESTURE INPUTS · A B C / 1 2 3';}) as EventListener);

function toggleView(){
  if(!active||paused||intro||mission.state.phase==='liberating')return;
  // Preserve the current horizontal view when entering the eyes.
  if(settings.view==='third-person'){camera.getWorldDirection(cameraForward);yaw=Math.atan2(-cameraForward.x,-cameraForward.z);pitch=0;}
  settings.view=settings.view==='first-person'?'third-person':'first-person';cameraLead.set(0,0,0);settingsChanged();updateCamera(0);
  if(settings.view==='third-person'){camera.position.copy(desiredCamera);camera.lookAt(lookTarget);camera.fov=48;camera.updateProjectionMatrix();}
  feedback(settings.view==='first-person'?'EYE VIEW · DRAG TO LOOK · V TO SWITCH':'THIRD-PERSON VIEW · V TO SWITCH');
}
$('view-button').onclick=toggleView;
function sound(kind:Parameters<WinterAudio['play']>[0]){soundscape.play(kind);}
const lookTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),direction=new THREE.Vector3(),projected=new THREE.Vector3();
const coldSky=new THREE.Color(0x0b1727),warmSky=new THREE.Color(0x8295a0),coldFog=new THREE.Color(0x163044),warmFog=new THREE.Color(0xb5b4a6);
const coldSun=new THREE.Color(0x8cc9f3),warmSun=new THREE.Color(0xffd1a0);
const collisionBox=new THREE.Box3();
const cameraRay=new THREE.Ray(),cameraHit=new THREE.Vector3(),cameraDirection=new THREE.Vector3(),cameraBarrier=new THREE.Box3();
function keepCameraOutsideBuildings(target:THREE.Vector3){
  cameraDirection.copy(target).sub(lookTarget);let distance=cameraDirection.length();if(distance<.01)return;
  cameraDirection.divideScalar(distance);cameraRay.set(lookTarget,cameraDirection);
  for(const box of world.colliders){cameraBarrier.copy(box).expandByScalar(.22);if(cameraBarrier.containsPoint(lookTarget))continue;const hit=cameraRay.intersectBox(cameraBarrier,cameraHit);if(hit)distance=Math.min(distance,Math.max(.3,lookTarget.distanceTo(hit)-.15));}
  target.copy(lookTarget).addScaledVector(cameraDirection,distance);
}
function blocked(x:number,z:number){if(academy&&Math.hypot(x-trainingBeacon.position.x,z-trainingBeacon.position.z)<1.05)return true;collisionBox.min.set(x-.35,.1,z-.35);collisionBox.max.set(x+.35,1.9,z+.35);return world.colliders.some(box=>box.intersectsBox(collisionBox));}
function move(dt:number){
  const state=mission.state,oldX=position.x,oldZ=position.z,oldYaw=courier.object.rotation.y;
  const canMove=active&&!paused&&!intro&&(state.phase==='explore'||state.phase==='complete');
  if(canMove){
    const x=THREE.MathUtils.clamp(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+touch.state.x,-1,1);
    const z=THREE.MathUtils.clamp(Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+touch.state.y,-1,1);
    if(settings.view==='first-person')cameraForward.set(-Math.sin(yaw),0,-Math.cos(yaw));else camera.getWorldDirection(cameraForward);
    const input=movementDirection(x,z,cameraForward.x,cameraForward.z);
    const topSpeed=keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.state.running?3.0:1.5;
    direction.set(input.x*topSpeed,0,input.z*topSpeed).sub(velocity);
    const change=dt*(x||z?10:15);
    if(direction.length()>change)direction.setLength(change);
    velocity.add(direction);
    if(velocity.lengthSq()<.0001)velocity.set(0,0,0);
    const bounds=world.bounds??{minX:-30,maxX:30,minZ:-27,maxZ:33};
    const nx=THREE.MathUtils.clamp(position.x+velocity.x*dt,bounds.minX,bounds.maxX),nz=THREE.MathUtils.clamp(position.z+velocity.z*dt,bounds.minZ,bounds.maxZ);
    if(!blocked(nx,position.z))position.x=nx;else velocity.x=0;
    if(!blocked(position.x,nz))position.z=nz;else velocity.z=0;
  }else velocity.set(0,0,0);
  const dx=position.x-oldX,dz=position.z-oldZ,distance=Math.hypot(dx,dz);
  const actualSpeed=dt>0?distance/dt:0;
  walking=canMove&&distance>.0001;running=walking&&actualSpeed>2;
  if(walking){courier.object.rotation.y=turnToward(oldYaw,facingYaw(dx,dz,oldYaw),dt);if(academy)onboarding.move(distance);}
  else if(!paused&&state.phase==='terminal'){
    const target=academy?trainingBeacon.position:world.relays.find(r=>r.id===state.activeRelay)?.position;
    if(target)courier.object.rotation.y=turnToward(oldYaw,facingYaw(target.x-position.x,target.z-position.z,oldYaw),dt);
  }
  const turn=dt>0?THREE.MathUtils.clamp(Math.atan2(Math.sin(courier.object.rotation.y-oldYaw),Math.cos(courier.object.rotation.y-oldYaw))/(dt*8),-1,1):0;
  courier.object.position.copy(position);
  const pose=courier.update(time,Math.min(1,actualSpeed/3.0),state.phase==='terminal',discoveries.collected().length===5,settings.reduced,paused?0:dt,turn);
  if(pose.footstep&&walking){sound('step');motionEffects.step(position,courier.object.rotation.y,pose.side,running);}
  contactShadow.visible=active&&!intro;contactShadow.position.set(position.x,.022,position.z);contactShadow.rotation.z=-courier.object.rotation.y;
}
let lastCaption=-1;
function updateCamera(dt:number){
  const state=mission.state;
  const eyeView=active&&!intro&&state.phase!=='liberating'&&settings.view==='first-person';
  courier.object.visible=!eyeView;
  if(eyeView){
    const eye=firstPersonPose(position.x,position.y,position.z,yaw,pitch);
    camera.position.copy(eye.position);lookTarget.copy(eye.target);
    if(state.phase==='terminal'){const target=academy?trainingBeacon.position:world.relays.find(r=>r.id===state.activeRelay)?.position;if(target)lookTarget.set(target.x,target.y+1.5,target.z);}
    camera.lookAt(lookTarget);if(camera.fov!==68){camera.fov=68;camera.updateProjectionMatrix();}return;
  }
  if(!active){const drift=settings.reduced?0:Math.sin(time*.07)*3;desiredCamera.set(31+drift,15,40);lookTarget.set(-1,4,-5);}
  else if(intro){
    const duration=settings.reduced?3:10;
    const p=introTime/duration;
    if(settings.reduced){desiredCamera.set(20,12,30);lookTarget.set(0,4,-6);}else if(p<.35){desiredCamera.set(36-p*22,24-p*10,40-p*20);lookTarget.set(0,3,-6);}else if(p<.65){const t=(p-.35)/.3;desiredCamera.set(-23+t*8,4+t,17-t*6);lookTarget.set(3,7,-9);}else{const t=(p-.65)/.35;desiredCamera.set(8*(1-t),8-2*t,35);lookTarget.copy(position).add(new THREE.Vector3(0,1.3,0));}
    const caption=p<.35?0:p<.65?1:2;
    if(caption!==lastCaption){lastCaption=caption;const lines=[`CHAPTER ${level.number} · ${level.title}`,`${student.name}, ${level.arrival}`,level.objective];$('briefing-text').textContent=lines[caption];if(settings.voice&&service?.gradium)void speak(lines[caption]);}
    if(introTime>=duration)endIntro();
  }else if(state.phase==='liberating'){
    const p=settings.reduced?.5:state.liberation,angle=.2+p*.7;desiredCamera.set(Math.sin(angle)*34,12+p*7,Math.cos(angle)*36);lookTarget.copy(world.core).add(new THREE.Vector3(0,3,0));
  }else if(state.phase==='terminal'&&state.activeRelay!==null){const relayPosition=academy?trainingBeacon.position:world.relays.find(r=>r.id===state.activeRelay)!.position;desiredCamera.copy(relayPosition).add(new THREE.Vector3(3.5,2.8,5));lookTarget.copy(relayPosition).add(new THREE.Vector3(0,1.5,0));}
  else{const distance=settings.reduced?7.2:7.2+(running?.45:0);desiredCamera.set(position.x+Math.sin(yaw)*distance,position.y+3.5,position.z+Math.cos(yaw)*distance);desiredCamera.x=THREE.MathUtils.clamp(desiredCamera.x,-33,33);desiredCamera.z=THREE.MathUtils.clamp(desiredCamera.z,-30,39);direction.copy(velocity).multiplyScalar(.12);if(settings.reduced)cameraLead.set(0,0,0);else cameraLead.lerp(direction,1-Math.exp(-dt*4));lookTarget.copy(position).add(cameraLead);lookTarget.y+=1.25;}
  const followsPlayer=active&&!intro&&state.phase!=='liberating';
  if(followsPlayer)keepCameraOutsideBuildings(desiredCamera);
  camera.position.lerp(desiredCamera,settings.reduced?1:1-Math.exp(-dt*(intro?5:4)));
  if(followsPlayer)keepCameraOutsideBuildings(camera.position);
  camera.lookAt(lookTarget);
  const targetFov=!settings.reduced&&running?52:48;const nextFov=settings.reduced?48:THREE.MathUtils.lerp(camera.fov,targetFov,1-Math.exp(-dt*3));if(Math.abs(nextFov-camera.fov)>.001){camera.fov=nextFov;camera.updateProjectionMatrix();}
}
function updateHud(){
  const state=mission.state;
  touch.setMode(!active||intro||paused||state.phase==='liberating'?'hidden':state.phase==='terminal'?'terminal':'explore');
  $('view-button').textContent=settings.view==='first-person'?'VIEW · EYES':'VIEW · 3RD';
  $('view-button').setAttribute('aria-label',settings.view==='first-person'?'Switch to third-person view (V)':'Switch to eye-level view (V)');
  const currentInput=practice.state.active?practice.state:state;
  $('camera-target').textContent=state.phase==='terminal'?(practice.state.complete?'Practice complete · return to the relay':`SHOW ${currentInput.sequence[currentInput.step]||'…'} · HOLD STEADY, THEN LOWER YOUR HAND`):'Approach a terminal and press E to use your signs.';
  $<HTMLButtonElement>('camera-retry').disabled=cameraStarting;
  $<HTMLButtonElement>('terminal-camera').disabled=cameraStarting;
  $('terminal-camera').textContent=tracker.enabled?'CAMERA ACTIVE · SHOW YOUR SIGN':'USE CAMERA →';const terminal=active&&!intro&&state.phase==='terminal';$('terminal').hidden=!terminal;document.body.classList.toggle('terminal-open',terminal);
  const rehearsal=practice.state;document.body.classList.toggle('practising',terminal&&rehearsal.active);
  $('memory-progress').textContent=`◇ MEMORIES ${discoveries.collected().length} / 5${discoveries.collected().length===5?' · SCARF UNLOCKED':''}`;
  $('alert-value').textContent=`${Math.round(state.alert)}%`;$('alert-fill').style.width=`${state.alert}%`;
  $('relay-progress').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('on',state.completed.includes(i as 0|1|2)));
  $('objective-title').textContent=state.phase==='complete'?'SECTOR RESTORED':state.completed.length===3?`ACTIVATE ${level.coreName.toUpperCase()}`:`${level.title.toUpperCase()} · ${state.completed.length}/3`;
  const nextRelay=world.relays.find(r=>mission.canEnterRelay(r.id));
  $('objective').textContent=state.completed.length===3?`Reach ${level.coreName}. Use E or INTERACT to restore this sector.`:`${level.objective} Next: ${nextRelay?.name||'follow the amber markers'}.`;
  if(state.phase==='complete')$('objective').textContent=level.completion;
  if(terminal){const relay=world.relays.find(r=>r.id===state.activeRelay)!;const input=rehearsal.active?rehearsal:state;$('terminal-title').textContent=academy?'YOUR FIRST INPUT':relay.name.toUpperCase();const markup=input.sequence.map((sign,i)=>`<div class="cipher ${i<input.step?'done':i===input.step?'current':''}">${i<input.step?'✓':sign}</div>`).join('');if($('sequence').innerHTML!==markup)$('sequence').innerHTML=markup;
    $('terminal-mode').textContent=rehearsal.active?'SAFE PRACTICE · NO DRONE DANGER':'LOCAL OPTICAL LINK';
    $('terminal-description').textContent=rehearsal.active?'Take your time. Use a gesture you already know with the camera, or rehearse with the on-screen inputs. Practice keeps mission progress unchanged.':'Take a moment to practise, then use the gesture inputs to restore this relay.';
    $('terminal-instruction').textContent=input.message||`Show or tap ${input.sequence[input.step]} to transmit.`;$('terminal-cast').textContent='PRACTISE AGAIN';$('terminal-cast').hidden=!rehearsal.complete;
    $('practice-toggle').textContent=academy?'STEP AWAY FROM THE BEACON':rehearsal.active?'READY · RETURN TO THE RELAY':'PRACTISE FIRST · NO DANGER';
  }
  const accessible=active&&!intro&&!paused&&(state.phase==='explore'||state.phase==='complete');nearest=null;nearCore=false;
  if(accessible&&state.phase!=='complete'){
    let distance=4.5;for(const relay of world.relays){const d=position.distanceTo(relay.position);if(mission.canEnterRelay(relay.id)&&d<distance){distance=d;nearest=relay.id;}}
    nearCore=state.completed.length===3&&position.distanceTo(world.core)<4.5;
  }
  $('interact').hidden=!(accessible&&(nearest!==null||nearCore));
  if(nearCore){$('interact-title').textContent=`${mobileDevice?'INTERACT':'E'} — ACTIVATE ${level.coreName.toUpperCase()}`;$('interact-sub').textContent='Three optical links secured. Let the city breathe.';}
  else if(nearest!==null){$('interact-title').textContent=`${mobileDevice?'INTERACT':'E'} — ${world.relays.find(r=>r.id===nearest)!.name.toUpperCase()}`;$('interact-sub').textContent='Shielded terminal · Stop moving to transmit the cipher.';}
  for(const relay of world.relays){const marker=$(`marker-${relay.id}`);projected.copy(relay.position).add(new THREE.Vector3(0,3.7,0)).project(camera);const visible=accessible&&!academy&&mission.canEnterRelay(relay.id)&&projected.z<1&&projected.z>-1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.8;marker.hidden=!visible;if(visible){marker.style.left=`${(projected.x*.5+.5)*innerWidth}px`;marker.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;$(`marker-label-${relay.id}`).textContent=`${relay.name.toUpperCase()} · ${Math.round(position.distanceTo(relay.position))}m`;}}
  $('chapter-label').textContent=academy?'CHAPTER 00 / SAFE COURTYARD SIMULATION':`CHAPTER ${level.number} / ${level.location.toUpperCase()}`;
  projected.copy(world.core).add(new THREE.Vector3(0,3,0)).project(camera);
  const coreVisible=accessible&&!academy&&state.completed.length===3&&state.phase!=='complete'&&projected.z<1&&projected.z>-1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.8;
  $('marker-core').hidden=!coreVisible;if(coreVisible){$('marker-core').style.left=`${(projected.x*.5+.5)*innerWidth}px`;$('marker-core').style.top=`${(-projected.y*.5+.5)*innerHeight}px`;$('marker-core-label').textContent=`${level.coreName.toUpperCase()} · ${Math.round(position.distanceTo(world.core))}m`;}
  $('training-progress').hidden=!academy||!active||paused||terminal;
  $('memory-progress').hidden=academy;$('relay-progress').hidden=academy;
  if(academy){
    const stage=onboarding.state.stage;
    const titles=['Make yourself at home','Find the practice beacon','One input. Your own pace.','The first spark is yours'];
    const descriptions=['Move with the joystick or WASD. Drag on the scene to look around.','Walk towards the green crystal. Use INTERACT or E when you are close.','Tap A, press A, or enable the camera to test a gesture you know. No danger, no timer.','Open the chapter map from Pause to begin the Louvre operation.'];
    $('objective-title').textContent=`THE FIRST SPARK · ${Math.min(stage+1,3)} / 3`;$('objective').textContent=titles[stage];
    $('training-title').textContent=titles[stage];$('training-text').textContent=descriptions[stage];
    $('training-progress').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('done',i<stage));
    const close=position.distanceTo(trainingBeacon.position)<3;
    $('interact').hidden=!(accessible&&stage>0&&stage<3&&close);
    $('interact-title').textContent=`${mobileDevice?'INTERACT':'E'} — TRY THE PRACTICE BEACON`;$('interact-sub').textContent='A safe place to begin. Keyboard or optional camera.';
    const marker=$('marker-0');projected.copy(trainingBeacon.position).add(new THREE.Vector3(0,2.9,0)).project(camera);
    marker.hidden=!(accessible&&stage<3&&projected.z<1&&projected.z>-1&&Math.abs(projected.x)<.95&&Math.abs(projected.y)<.85);
    if(!marker.hidden){marker.style.left=`${(projected.x*.5+.5)*innerWidth}px`;marker.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;$('marker-label-0').textContent='PRACTICE BEACON';}
  }
}
function victory(){
  if(!campaign.state.tutorialComplete)campaign.skipTutorial();campaign.completeChapter(chapter);saveCampaign();
  save();$('letterbox').hidden=true;$('briefing').hidden=true;$('hud').hidden=false;
  const at=CHAPTERS.findIndex(item=>item.id===chapter),next=CHAPTERS[at+1];
  const state=mission.state,elapsed=`${Math.floor(state.elapsed/60)}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}`;
  openModal(`<div class="label gold">CHAPTER ${level.number} // RESTORED</div><h2 id="modal-title">${chapter==='spire'?'Paris welcomes<br>the dawn.':'Another light<br>returns to Paris.'}</h2><p>${level.completion}</p><div class="report"><div><strong>3 / 3</strong><small>LINKS RESTORED</small></div><div><strong>${elapsed}</strong><small>MISSION TIME</small></div><div><strong>${discoveries.collected().length} / 5</strong><small>MEMORIES FOUND</small></div></div>${next?`<button class="enter" id="next-chapter">NEXT · ${next.title.toUpperCase()} →</button>`:'<p>All five sectors restored. Your student and friends have a city to explore again.</p><button class="enter" id="watch-victory">WATCH VICTORY CINEMATIC 🎬</button>'}<button class="enter secondary" id="survey">EXPLORE THE RESTORED SECTOR →</button><button class="enter secondary" id="victory-map">CHAPTER MAP</button><button class="enter secondary" id="replay">REPLAY THIS CHAPTER</button>`);
  if(next)$('next-chapter').onclick=()=>start(hasSave(next.id as MissionChapter),false,next.id as MissionChapter);
  const watchEnd=$('watch-victory');if(watchEnd)watchEnd.onclick=()=>{closeModal();playVideoModal('./VideoEnd_with_audio_subtitled.mp4','TRANSMISSION // RESISTANCE VICTORY',()=>{openModal(`<div class="label gold">PARIS LIBERATED</div><h2 id="modal-title">The Dawn Returns</h2><p>The resistance has prevailed. All sectors of Paris are restored.</p><button class="enter" id="victory-close">RETURN TO CITY →</button>`);$('victory-close').onclick=closeModal;});};
  $('survey').onclick=closeModal;$('victory-map').onclick=()=>openChapterMap(chapter);$('replay').onclick=()=>start(false,false,chapter);
}

function frame(now:number){
  animation=requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
  if(!paused)time+=dt;
  if(intro&&!paused)introTime+=dt;
  const before=mission.state;
  world.update(time,academy?1:active?before.liberation:0,active?before.completed:[],settings.reduced);
  world.drones.forEach(drone=>drone.visible=!academy);
  if(academy&&!settings.reduced){trainingSymbol.rotation.y=time*.7;trainingSymbol.position.y=1.7+Math.sin(time*1.8)*.09;}
  motionEffects.update(time,settings.reduced||settings.low,active&&!intro);
  move(dt);
  if(active&&!paused&&!intro){
    const scanned=world.isHazard?world.isHazard(position,time):world.drones.some(drone=>Math.hypot(drone.position.x-position.x,drone.position.z-position.z)<5.3);
    const danger=scanned&&!cameraStarting&&!academy&&!practice.state.active&&['explore','terminal'].includes(before.phase);
    if(danger&&!wasScanned)feedback(world.hazardLabel||'SCANNER NEARBY · MOVE OUT OF THE RED POOL',false);wasScanned=danger;
    $('scan-warning').hidden=!danger;$('scan-warning').querySelector('strong')!.textContent=world.hazardLabel||'SCANNER NEARBY';$('scan-warning').querySelector('span')!.textContent=world.hazardLabel?'Move away from the glowing danger zone':'Move out of the red pool';document.body.classList.toggle('being-scanned',danger);
    const state=mission.tick(dt,danger);
    if(state.respawns>previousRespawns){previousRespawns=state.respawns;position.copy(lastSafe);velocity.set(0,0,0);keys.clear();touch.reset();tracker.resetRecognition();practice.stop();toast('LET’S TRY ANOTHER ROUTE',`${student.name} is safe. Your restored relays and discoveries are kept.`);sound('error');}
    if(state.phase!==previousPhase){if(state.phase==='liberating'){$('letterbox').hidden=false;$('hud').hidden=true;$('briefing').hidden=false;$('briefing-text').textContent=level.completion;$('briefing-label').textContent='NEXUS LOCKDOWN // OVERRIDDEN';$('skip').hidden=true;$('terminal').hidden=true;keys.clear();}if(state.phase==='complete')victory();previousPhase=state.phase;}
    if(state.completed.length!==previousRelays)previousRelays=state.completed.length;
    saveClock+=dt;if(saveClock>5){saveClock=0;save();}
  }
  const state=mission.state,liberation=academy?.55:active?state.liberation:0;
  if(paused||!active||intro){$('scan-warning').hidden=true;document.body.classList.remove('being-scanned');}
  const discovery=discoveries.update(time,position,active&&!academy&&!paused&&!intro&&(state.phase==='explore'||state.phase==='complete'),settings.reduced);
  if(discovery){sound('pickup');save();toast(discoveries.collected().length===5?'EXPLORER’S SCARF UNLOCKED':discovery.title,discoveries.collected().length===5?`Five memories found. ${student.name}’s scarf now glows with the colors of returning sunlight.`:discovery.text);}
  soundscape.update(dt,{walking:settings.reduced?walking:false,running,alert:practice.state.active?0:state.alert,liberation,active:active&&!paused});
  (scene.background as THREE.Color).copy(coldSky).lerp(warmSky,liberation);(scene.fog as THREE.FogExp2).color.copy(coldFog).lerp(warmFog,liberation);(scene.fog as THREE.FogExp2).density=.014-liberation*.006;
  sun.color.copy(coldSun).lerp(warmSun,liberation);sun.intensity=3.6+liberation*1.1;hemisphere.intensity=2.5+liberation*.4;
  pulse.visible=state.phase==='liberating';pulse.scale.setScalar(1+liberation*70);(pulse.material as THREE.MeshBasicMaterial).opacity=Math.sin(liberation*Math.PI)*.8;
  if(!paused)updateCamera(dt);updateHud();effects.update(time,liberation,settings.reduced,settings.low);effects.render();
}
camera.position.set(31,15,40);camera.lookAt(0,4,-5);animation=requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);effects.resize(innerWidth,innerHeight);});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();paused=true;$('warning').hidden=false;$('warning').textContent='The graphics connection was interrupted. Reload to continue from your saved relays.';save();});
window.addEventListener('pagehide',()=>{save();tracker.stop();stopVoice();soundscape.setPaused(true);cancelAnimationFrame(animation);});
window.addEventListener('pageshow',event=>{if(event.persisted){lastTime=performance.now();animation=requestAnimationFrame(frame);}});
if(import.meta.hot)import.meta.hot.dispose(()=>{touch.dispose();cancelAnimationFrame(animation);tracker.stop();motionEffects.dispose();contactShadow.geometry.dispose();contactShadow.material.dispose();journey.dispose();trainingBeacon.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});trainingMaterial.dispose();soundscape.dispose();discoveries.dispose();effects.dispose();courier.dispose();world.dispose();renderer.dispose();renderer.domElement.remove();});
