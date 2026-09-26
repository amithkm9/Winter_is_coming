/** Actual application UI/state wiring with mocked GPU/audio/camera boundaries.
 * Teleported encounter setup is deliberate: geometry reachability has separate tests.
 * This is not a hardware-rendered or physical-touch playthrough. */
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {WinterCampaign} from '../src/winter/campaign.ts';
import {WinterMission} from '../src/winter/mission.ts';
import {LEVELS} from '../src/winter/levels.ts';
const scratch=await mkdtemp(path.join(tmpdir(),'winter-app-flow-'));
after(()=>rm(scratch,{recursive:true,force:true}));
const output=path.join(scratch,'app.mjs'),entry=path.resolve('src/winter/main.ts');
await build({entryPoints:[entry],outfile:output,bundle:true,format:'esm',platform:'node',loader:{'.css':'empty'},logLevel:'silent',plugins:[{name:'non-browser-boundaries',setup(b){
 b.onResolve({filter:/^\//,namespace:'fixture'},args=>({path:args.path,namespace:'file'}));
 b.onResolve({filter:/^three$/},args=>args.importer===entry?{path:'renderer',namespace:'fixture'}:undefined);
 b.onResolve({filter:/^\.\/effects$/},args=>args.importer===entry?{path:'effects',namespace:'fixture'}:undefined);
 b.onResolve({filter:/^\.\.\/services\/(camera|api)$/},args=>args.importer===entry?{path:args.path.endsWith('camera')?'camera':'api',namespace:'fixture'}:undefined);
 b.onResolve({filter:/^\.\/audio$/},args=>args.importer===entry?{path:'audio',namespace:'fixture'}:undefined);
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:{
  renderer:`export * from ${JSON.stringify(path.resolve('node_modules/three/build/three.module.js'))};export class WebGLRenderer{constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};this.ratio=1;}setPixelRatio(v){this.ratio=v;}getPixelRatio(){return this.ratio;}setSize(){}dispose(){}render(){}}`,
  effects:`export {createCourier} from ${JSON.stringify(path.resolve('src/winter/effects.ts'))};export const createEffects=()=>({update(){},render(){},resize(){},dispose(){}});`,
  camera:`export class CameraController{enabled=false;async start(){this.enabled=true;return true;}stop(){this.enabled=false;}resetRecognition(){}}`,
  api:`export async function health(){return null;}export async function getHint(){return{text:'fixture',source:'authored'};}export async function speak(){return false;}export function stopVoice(){}`,
  audio:`export class WinterAudio{configure(){}setPaused(){}async unlock(){}play(){}update(){}dispose(){}}`,
 }[args.path]}));
 b.onLoad({filter:/\/src\/winter\/main\.ts$/},async()=>({loader:'ts',contents:(await readFile(entry,'utf8'))+`\nexport const appFixture={get snapshot(){return{chapter,academy,phase:mission.state.phase,position:{x:position.x,z:position.z},paused,captureSecondsRemaining:mission.state.captureSecondsRemaining,completed:mission.state.completed,world:world.group.name,relays:world.relays.map(r=>({id:r.id,x:r.position.x,z:r.position.z})),core:{x:world.core.x,z:world.core.z},profile:campaign.state};},hazard(on){world.isHazard=()=>on;},place(x,z){position.set(x,0,z);velocity.set(0,0,0);updateHud();},step(n=1,ms=50){for(let i=0;i<n;i++)frame(lastTime+ms);},dispose(){signGuide.dispose();touch.dispose();journey.dispose();discoveries.dispose();courier.dispose();world.dispose();}};`}));
}}]});
let serial=0;
async function fixture(t,{legacy=false,mobile=false,recovery=false,width=390,height=844}={}){
 const w=new Window({url:'http://localhost:5173/winter.html',width:mobile?width:1280,height:mobile?height:720,settings:{disableIframePageLoading:true}});
 w.document.body.innerHTML='<div id="world"></div><main id="winter-ui"></main>';
 if(legacy){const c=new WinterCampaign();c.completeChapter('academy');if(!recovery)c.completeChapter('louvre');w.localStorage.setItem('winter-campaign-v1',c.serialize());const m=new WinterMission();m.start();for(const id of [0,1,2]){m.enterRelay(id);for(const sign of m.state.sequence)m.submit(sign);}m.finishAtCore();m.tick(8,false);w.localStorage.setItem('winter-louvre-v1',m.serialize());}
 w.matchMedia=q=>({matches:q.includes('pointer')?mobile:false,media:q,addEventListener(){},removeEventListener(){}});
 const replacements={window:w,document:w.document,navigator:w.navigator,localStorage:w.localStorage,matchMedia:w.matchMedia,innerWidth:mobile?width:1280,innerHeight:mobile?height:720,devicePixelRatio:1,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},CustomEvent:w.CustomEvent};
 const prior=new Map();for(const [key,value] of Object.entries(replacements)){prior.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
 const {appFixture:app}=await import(pathToFileURL(output).href+'?run='+(++serial));
 t.after(async()=>{app.dispose();await w.happyDOM.close();for(const [key,descriptor] of prior){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 return {w,app,el:id=>w.document.getElementById(id),click:id=>w.document.getElementById(id).click(),key:code=>w.dispatchEvent(new w.KeyboardEvent('keydown',{code,bubbles:true}))};
}
test('existing completed Louvre unlocks the four new chapters in sequence through actual UI, with isolated saves',async t=>{
 const f=await fixture(t,{legacy:true,mobile:true});f.click('chapter-map');f.click('chapter-canal');assert.equal(f.el('launch-chapter').disabled,false);f.click('launch-chapter');
 for(const id of ['canal','glasshouse','observatory','spire']){
  assert.equal(f.app.snapshot.chapter,id);assert.deepEqual(f.app.snapshot.completed,[]);assert.notEqual(f.app.snapshot.world,'The frozen Cour Napoleon');f.click('skip');f.app.step();
  // Actual six-button input panel drives each mission; encounter positioning is simulated.
  for(const relay of f.app.snapshot.relays){f.app.place(relay.x,relay.z+2);f.w.document.querySelector('.touch-interact').click();assert.equal(f.app.snapshot.phase,'terminal');for(const sign of LEVELS[id].sequences[relay.id])f.w.document.querySelector(`[data-sign="${sign}"]`).click();f.app.step();assert.equal(f.app.snapshot.completed.length,relay.id+1);}
  const core=f.app.snapshot.core;f.app.place(core.x,core.z+2);f.w.document.querySelector('.touch-interact').click();f.app.step(162);assert.equal(f.app.snapshot.phase,'complete');assert.ok(f.app.snapshot.profile.completed.includes(id));
  const saved=JSON.parse(f.w.localStorage.getItem(`winter-${id}-v1`));assert.equal(saved.phase,'complete');assert.equal(saved.completed.length,3);
  if(id!=='spire')f.click('next-chapter');else assert.equal(f.el('next-chapter'),null);
 }
 assert.equal(JSON.parse(f.w.localStorage.getItem('winter-louvre-v1')).phase,'complete');
 assert.deepEqual(f.app.snapshot.profile.completed,['academy','louvre','canal','glasshouse','observatory','spire']);
 f.click('survey');f.click('pause-button');f.click('title');f.click('continue');assert.equal(f.app.snapshot.chapter,'spire');assert.equal(f.app.snapshot.phase,'complete');
});
test('fresh application keeps later chapters locked and exposes six touch simulation buttons',async t=>{
 const f=await fixture(t,{mobile:true});f.click('chapter-map');f.click('chapter-spire');assert.equal(f.el('launch-chapter').disabled,true);assert.equal(f.w.document.querySelectorAll('[data-sign]').length,6);
 f.click('chapter-academy');f.click('launch-chapter');f.app.step();assert.equal(f.app.snapshot.academy,true);assert.equal(f.w.document.querySelector('.touch-controls').hidden,false);
 f.click('pause-button');f.app.step();assert.equal(f.w.document.querySelector('.touch-controls').hidden,true);
});

test('a complete mission recovers a failed campaign write without skipping later prerequisites',async t=>{
 const f=await fixture(t,{legacy:true,recovery:true});f.click('chapter-map');f.click('chapter-canal');assert.equal(f.el('launch-chapter').disabled,false);f.click('chapter-spire');assert.equal(f.el('launch-chapter').disabled,true);assert.deepEqual(f.app.snapshot.profile.completed,['academy','louvre']);
});

test('Enter and the visible ENTER button open interactions, while E no longer does',async t=>{
 const f=await fixture(t,{legacy:true});f.click('chapter-map');f.click('chapter-canal');f.click('launch-chapter');f.click('skip');f.app.step();
 const relay=f.app.snapshot.relays[0];f.app.place(relay.x,relay.z+2);f.key('KeyE');assert.equal(f.app.snapshot.phase,'explore');
 f.key('Enter');assert.equal(f.app.snapshot.phase,'terminal');f.click('terminal-close');f.app.step();
 assert.equal(f.el('interact').tagName,'BUTTON');assert.match(f.el('interact-title').textContent,/ENTER/);
 f.click('interact');assert.equal(f.app.snapshot.phase,'terminal');
});

for(const [width,height] of [[360,640],[844,390]]){
 test(`phone ${width}×${height}: countdown releases terminal, catch freezes, touch retry preserves progress`,async t=>{
  const f=await fixture(t,{legacy:true,mobile:true,width,height});f.click('chapter-map');f.click('chapter-canal');f.click('launch-chapter');f.click('skip');f.app.step();
  const relay=f.app.snapshot.relays[0];f.app.place(relay.x,relay.z+2);f.app.step();f.w.document.querySelector('.touch-interact').click();
  f.w.document.querySelector('[data-sign="1"]').click();f.app.step();assert.deepEqual(f.app.snapshot.completed,[0]);
  const second=f.app.snapshot.relays[1];f.app.place(second.x,second.z+2);f.app.step();f.w.document.querySelector('.touch-interact').click();assert.equal(f.app.snapshot.phase,'terminal');
  f.app.hazard(true);f.app.step();assert.equal(f.app.snapshot.phase,'explore');assert.equal(f.el('scan-warning').hidden,false);assert.equal(f.el('capture-countdown').textContent,'5');
  assert.equal(f.w.document.querySelector('.touch-controls').hidden,false);
  f.app.step(20);assert.equal(f.el('capture-countdown').textContent,'4');
  f.app.hazard(false);f.app.step();assert.equal(f.app.snapshot.captureSecondsRemaining,5);
  f.app.hazard(true);f.app.step(101);assert.equal(f.app.snapshot.phase,'caught');assert.equal(f.app.snapshot.paused,true);
  assert.equal(f.el('modal-title').textContent,'Caught.');assert.equal(f.w.document.querySelector('.touch-controls').hidden,true);
  f.key('Escape');assert.equal(f.app.snapshot.paused,true);assert.equal(f.el('modal').hidden,false);
  f.app.hazard(false);f.click('retry-checkpoint');f.app.step();assert.equal(f.app.snapshot.phase,'explore');assert.equal(f.app.snapshot.paused,false);assert.deepEqual(f.app.snapshot.completed,[0]);
 });
}

test('the local ASL image is immediately visible, safe study pauses capture, and Ready resumes danger',async t=>{
 const f=await fixture(t,{legacy:true,mobile:true,width:360,height:640});f.click('chapter-map');f.click('chapter-canal');f.click('launch-chapter');f.click('skip');f.app.step();
 const relay=f.app.snapshot.relays[0];f.app.place(relay.x,relay.z+2);f.click('interact');f.app.step();
 assert.match(f.w.document.querySelector('.sign-guide-label').textContent,/REQUIRED 1/);
 assert.ok(f.w.document.querySelector('.sign-guide-image').getAttribute('src').includes('asl-1'));assert.equal(f.w.document.querySelector('iframe'),null);
 f.w.document.querySelector('.sign-guide-watch').click();f.app.hazard(true);f.app.step(120);
 assert.equal(f.w.document.querySelector('iframe'),null);assert.ok(f.w.document.querySelector('.sign-guide').classList.contains('studying'));assert.equal(f.app.snapshot.phase,'terminal');assert.equal(f.app.snapshot.captureSecondsRemaining,5);
 f.w.document.querySelector('.sign-guide-close').click();f.app.step();assert.equal(f.app.snapshot.phase,'explore');assert.equal(f.el('scan-warning').hidden,false);
 // Even at ten frames/second, the warning uses elapsed time rather than the physics step.
 f.app.step(51,100);assert.equal(f.app.snapshot.phase,'caught');
});

test('victory map selects the newly unlocked chapter and its touch launch starts that chapter',async t=>{
 const f=await fixture(t,{legacy:true,mobile:true});f.click('chapter-map');f.click('chapter-canal');f.click('launch-chapter');f.click('skip');f.app.hazard(false);f.app.step();
 for(const relay of f.app.snapshot.relays){f.app.place(relay.x,relay.z+2);f.click('interact');for(const sign of LEVELS.canal.sequences[relay.id])f.w.document.querySelector(`[data-sign="${sign}"]`).click();f.app.step();}
 const core=f.app.snapshot.core;f.app.place(core.x,core.z+2);f.click('interact');f.app.step(162);
 assert.match(f.el('victory-map').textContent,/NEXT CHAPTER UNLOCKED/);f.click('victory-map');assert.equal(f.el('launch-chapter').disabled,false);
 f.click('launch-chapter');assert.equal(f.app.snapshot.chapter,'glasshouse');
});

test('focused sign buttons do not swallow cipher input or movement after a relay closes',async t=>{
 const f=await fixture(t,{legacy:true});f.click('chapter-map');f.click('chapter-canal');f.click('launch-chapter');f.click('skip');f.app.hazard(false);f.app.step();
 const relay=f.app.snapshot.relays[0];f.app.place(relay.x,relay.z+2);f.key('Enter');f.app.step();
 const button=f.w.document.querySelector('[data-sign="1"]');button.focus();button.dispatchEvent(new f.w.KeyboardEvent('keydown',{code:'Digit1',bubbles:true}));
 assert.equal(f.app.snapshot.phase,'explore');f.app.step();const before=f.app.snapshot.position;
 button.dispatchEvent(new f.w.KeyboardEvent('keydown',{code:'KeyS',bubbles:true}));f.app.step(10,100);
 assert.ok(Math.hypot(f.app.snapshot.position.x-before.x,f.app.snapshot.position.z-before.z)>.5);
});

test('returning to title after capture does not trap settings or help dialogs',async t=>{
 const f=await fixture(t,{legacy:true});f.click('chapter-map');f.click('chapter-canal');f.click('launch-chapter');f.click('skip');f.app.hazard(true);f.app.step(101);f.click('caught-map');
 f.w.document.querySelector('.journey-back').click();
 f.click('menu-settings');f.click('settings-close');assert.equal(f.el('modal').hidden,true);
 f.click('how-to-play');f.click('guide-close');assert.equal(f.el('modal').hidden,true);
});
