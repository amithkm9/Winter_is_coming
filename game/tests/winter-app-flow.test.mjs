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
 b.onLoad({filter:/\/src\/winter\/main\.ts$/},async()=>({loader:'ts',contents:(await readFile(entry,'utf8'))+`\nexport const appFixture={get snapshot(){return{chapter,academy,phase:mission.state.phase,completed:mission.state.completed,world:world.group.name,relays:world.relays.map(r=>({id:r.id,x:r.position.x,z:r.position.z})),core:{x:world.core.x,z:world.core.z},profile:campaign.state};},place(x,z){position.set(x,0,z);velocity.set(0,0,0);updateHud();},step(n=1){for(let i=0;i<n;i++)frame(lastTime+50);},dispose(){touch.dispose();journey.dispose();discoveries.dispose();courier.dispose();world.dispose();}};`}));
}}]});
let serial=0;
async function fixture(t,{legacy=false,mobile=false,recovery=false}={}){
 const w=new Window({url:'http://localhost:5173/winter.html',width:mobile?390:1280,height:mobile?844:720});
 w.document.body.innerHTML='<div id="world"></div><main id="winter-ui"></main>';
 if(legacy){const c=new WinterCampaign();c.completeChapter('academy');if(!recovery)c.completeChapter('louvre');w.localStorage.setItem('winter-campaign-v1',c.serialize());const m=new WinterMission();m.start();for(const id of [0,1,2]){m.enterRelay(id);for(const sign of m.state.sequence)m.submit(sign);}m.finishAtCore();m.tick(8,false);w.localStorage.setItem('winter-louvre-v1',m.serialize());}
 w.matchMedia=q=>({matches:q.includes('pointer')?mobile:false,media:q,addEventListener(){},removeEventListener(){}});
 const replacements={window:w,document:w.document,navigator:w.navigator,localStorage:w.localStorage,matchMedia:w.matchMedia,innerWidth:mobile?390:1280,innerHeight:mobile?844:720,devicePixelRatio:1,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},CustomEvent:w.CustomEvent};
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
  for(const relay of f.app.snapshot.relays){f.app.place(relay.x,relay.z+2);f.key('KeyE');assert.equal(f.app.snapshot.phase,'terminal');for(const sign of LEVELS[id].sequences[relay.id])f.w.document.querySelector(`[data-sign="${sign}"]`).click();f.app.step();assert.equal(f.app.snapshot.completed.length,relay.id+1);}
  const core=f.app.snapshot.core;f.app.place(core.x,core.z+2);f.key('KeyE');f.app.step(162);assert.equal(f.app.snapshot.phase,'complete');assert.ok(f.app.snapshot.profile.completed.includes(id));
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
