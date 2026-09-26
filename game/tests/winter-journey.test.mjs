/** DOM component unit tests only: no WebGL, browser rendering or physical-keyboard claims. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { WinterCampaign, CHAPTERS } from '../src/winter/campaign.ts';

const scratch = await mkdtemp(path.join(tmpdir(), 'winter-journey-test-'));
after(() => rm(scratch, { recursive: true, force: true }));
const bundle = path.join(scratch, 'journey.mjs');
await build({ entryPoints: [path.resolve('src/winter/journey.ts')], outfile: bundle, bundle: true,
  format: 'esm', platform: 'node', loader: { '.css': 'empty' }, logLevel: 'silent' });
const { createJourneyUI } = await import(pathToFileURL(bundle).href);

function fixture(t) {
  const window = new Window({ url: 'http://localhost:5173' });
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: window.document });
  const campaign = new WinterCampaign(), chosen = [], launched = [];
  let closed = 0;
  const parent = window.document.createElement('main'); window.document.body.append(parent);
  const journey = createJourneyUI(parent, campaign, {
    choose(id) { chosen.push(id); campaign.selectCharacter(id); },
    launch(id) { launched.push(id); }, close() { closed++; },
  });
  t.after(async () => {
    journey.dispose(); await window.happyDOM.close();
    if (prior) Object.defineProperty(globalThis, 'document', prior); else delete globalThis.document;
  });
  return { window, parent, campaign, journey, chosen, launched, closed: () => closed,
    el: id => parent.querySelector(`#${id}`), click: id => parent.querySelector(`#${id}`).click() };
}

test('three radio choices select one student and persist only on confirmation', t => {
  const f = fixture(t); f.journey.showCharacters();
  const radios = f.parent.querySelectorAll('[role="radio"]'); assert.equal(radios.length, 3);
  assert.equal(f.el('choose-noor').getAttribute('aria-checked'), 'true');
  f.click('choose-mira'); assert.equal(f.el('choose-mira').getAttribute('aria-checked'), 'true');
  assert.equal(f.el('choose-noor').getAttribute('aria-checked'), 'false');
  assert.equal(f.campaign.state.character, 'noor'); assert.deepEqual(f.chosen, []);
  assert.equal(f.el('chosen-name').textContent, 'MIRA');
  f.click('confirm-student'); assert.deepEqual(f.chosen, ['mira']); assert.equal(f.campaign.state.character, 'mira');
  assert.ok(f.el('chapter-academy')); assert.match(f.el('change-student').textContent, /Mira/);
});

test('back cancels an unconfirmed choice and reopening restores the saved selection', t => {
  const f = fixture(t); f.campaign.selectCharacter('elio'); f.journey.showCharacters();
  f.click('choose-mira'); f.click('journey-back');
  assert.equal(f.closed(), 1); assert.equal(f.journey.open, false); assert.deepEqual(f.chosen, []);
  assert.equal(f.campaign.state.character, 'elio');
  f.journey.showCharacters(); assert.equal(f.el('choose-elio').getAttribute('aria-checked'), 'true');
});

test('roster keyboard arrows update the radio selection and Escape cancels', t => {
  const f = fixture(t); f.journey.showCharacters();
  f.el('choose-noor').dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(f.el('choose-elio').getAttribute('aria-checked'), 'true'); assert.equal(f.el('choose-elio').tabIndex, 0);
  f.el('choose-elio').dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(f.journey.open, false); assert.equal(f.campaign.state.character, 'noor'); assert.deepEqual(f.chosen, []);
});

test('fresh map launches academy and rejects Louvre until training is complete', t => {
  const f = fixture(t); f.journey.showMap();
  assert.equal(f.el('launch-chapter').disabled, false); assert.match(f.el('detail-title').textContent, /First Spark/);
  f.click('chapter-louvre'); assert.equal(f.el('launch-chapter').disabled, true);
  f.click('launch-chapter'); assert.deepEqual(f.launched, []);
  f.click('chapter-academy'); f.click('launch-chapter'); assert.deepEqual(f.launched, ['academy']); assert.equal(f.journey.open, false);
  f.campaign.completeChapter('academy'); f.journey.showMap();
  assert.match(f.el('detail-title').textContent, /Louvre/); assert.equal(f.el('launch-chapter').disabled, false);
  f.click('launch-chapter'); assert.deepEqual(f.launched, ['academy', 'louvre']);
});

test('later chapters can be inspected but launch callbacks cannot bypass locked prerequisites', t => {
  const f = fixture(t); f.journey.showMap();
  for (const chapter of CHAPTERS.slice(2)) {
    f.click(`chapter-${chapter.id}`);
    assert.equal(f.el('detail-title').textContent, chapter.title); assert.equal(f.el('launch-chapter').disabled, true);
    assert.match(f.el('launch-chapter').textContent, /COMPLETE/);
    // Even direct callback invocation cannot bypass the current campaign status.
    f.el('launch-chapter').onclick(new f.window.MouseEvent('click'));
    assert.deepEqual(f.launched, []);
  }
});

test('the map defaults to the next available chapter and launches each distinct chapter ID', t => {
  const f = fixture(t);
  for (const chapter of CHAPTERS) {
    f.journey.showMap();
    assert.equal(f.el('detail-title').textContent, chapter.title);
    assert.equal(f.el('launch-chapter').disabled, false);
    f.click('launch-chapter'); assert.equal(f.launched.at(-1), chapter.id);
    assert.equal(f.campaign.completeChapter(chapter.id), true);
  }
  f.journey.showMap(); assert.equal(f.el('detail-title').textContent, CHAPTERS.at(-1).title);
});

test('an explicitly skipped tutorial unlocks Louvre without displaying a fabricated academy completion', t => {
  const f = fixture(t); f.campaign.skipTutorial(); f.journey.showMap();
  assert.match(f.el('detail-title').textContent, /Louvre/);
  assert.equal(f.el('launch-chapter').disabled, false);
  assert.match(f.el('chapter-academy').textContent, /READY TO PLAY/); assert.doesNotMatch(f.el('chapter-academy').textContent, /COMPLETED/);
  f.click('launch-chapter'); assert.deepEqual(f.launched, ['louvre']); assert.equal(f.campaign.state.tutorialComplete, false);
});

test('dispose removes the dialog from its parent', t => {
  const f = fixture(t); f.journey.showCharacters(); assert.ok(f.parent.querySelector('[role="dialog"]'));
  f.journey.dispose(); assert.equal(f.parent.querySelector('[role="dialog"]'), null);
});
