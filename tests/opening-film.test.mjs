import test from 'node:test';
import assert from 'node:assert/strict';
import { showOpeningFilm } from '../src/winter/opening-film.ts';
import { Window } from 'happy-dom';

function fixture(t, load = async () => {}) {
  const w = new Window(), doc = w.document;
  doc.body.innerHTML = '<main id="winter-ui"></main><aside inert></aside>';
  let continues = 0;
  const film = showOpeningFilm(doc.body, { source: './video/opening-subtitled.mp4', poster: './video/opening-poster.jpg', onContinue: async () => { continues++; await load(); } });
  const get = selector => doc.querySelector(selector), video = get('video');
  let plays = 0, pauses = 0;
  video.play = async () => { plays++; video.dispatchEvent(new w.Event('playing')); };
  video.pause = () => { pauses++; video.dispatchEvent(new w.Event('pause')); };
  video.load = () => {};
  t.after(async () => { film.dispose(); await w.happyDOM.close(); });
  return { w, doc, film, video, get, get continues() { return continues; }, get plays() { return plays; }, get pauses() { return pauses; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('intro defers video download and game initialization until an explicit action', async t => {
  const f = fixture(t);
  assert.equal(f.video.preload, 'none'); assert.equal(f.video.hasAttribute('playsinline'), true);
  assert.equal(f.video.hasAttribute('src'), false); assert.equal(f.continues, 0); assert.equal(f.plays, 0);
  assert.equal(f.get('main').inert, true);
  f.get('.film-watch').click(); await settle();
  assert.equal(f.plays, 1); assert.equal(f.video.getAttribute('src'), './video/opening-subtitled.mp4');
  assert.equal(f.get('.film-invitation').hidden, true); assert.equal(f.get('.film-playback').hidden, false);
  f.get('.film-mute').click(); assert.equal(f.video.muted, true);
  f.get('.film-pause').click(); assert.equal(f.pauses, 1);
});
test('skip and ended racing initialize once and free the decoder before loading the game', async t => {
  let complete; const f = fixture(t, () => new Promise(resolve => { complete = resolve; }));
  f.get('.film-watch').click(); await settle();
  f.get('.film-skip').click(); f.video.dispatchEvent(new f.w.Event('ended'));
  assert.equal(f.continues, 1); assert.equal(f.video.hasAttribute('src'), false);
  assert.equal(f.get('.film-skip').disabled, true);
  complete(); await settle();
  assert.equal(f.get('.opening-film'), null); assert.equal(f.get('main').inert, false); assert.equal(f.get('aside').inert, true);
});
test('ending naturally continues, while backgrounding pauses without unexpected resume', async t => {
  const f = fixture(t); f.get('.film-watch').click(); await settle();
  Object.defineProperty(f.doc, 'hidden', { configurable: true, value: true });
  f.doc.dispatchEvent(new f.w.Event('visibilitychange')); assert.equal(f.pauses, 1);
  assert.equal(f.get('.film-pause').textContent, 'RESUME'); assert.equal(f.plays, 1);
  f.video.dispatchEvent(new f.w.Event('ended')); await settle(); assert.equal(f.continues, 1); assert.equal(f.get('.opening-film'), null);
});
test('blocked playback and a broken film never block skipping to the game', async t => {
  const f = fixture(t); f.video.play = async () => { throw new Error('blocked'); };
  f.get('.film-watch').click(); await settle();
  assert.equal(f.get('.film-invitation').hidden, false); assert.match(f.get('.film-status').textContent, /could not start/);
  f.video.dispatchEvent(new f.w.Event('error')); assert.match(f.get('.film-status').textContent, /unavailable/);
  f.get('.film-skip').click(); await settle(); assert.equal(f.continues, 1);
});
test('Escape skips and keyboard focus stays within the opening dialog', async t => {
  const f = fixture(t); f.get('.film-skip').focus();
  f.doc.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
  assert.equal(f.doc.activeElement, f.get('.film-watch'));
  f.doc.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
  await settle(); assert.equal(f.continues, 1);
});
test('skipping before play resolves cannot restart or retain the film', async t => {
  const f = fixture(t); let resolvePlay; f.video.play = () => new Promise(resolve => { resolvePlay = resolve; });
  f.get('.film-watch').click(); f.get('.film-skip').click(); await settle(); resolvePlay(); await settle();
  assert.equal(f.get('.opening-film'), null); assert.equal(f.video.hasAttribute('src'), false); assert.equal(f.continues, 1);
});
test('failed game loading offers a visible reload action instead of a blank screen', async t => {
  const f = fixture(t, async () => { throw new Error('network'); });
  f.get('.film-skip').click(); await settle();
  assert.match(f.get('.film-status').textContent, /game could not load/);
  assert.equal(f.get('.film-skip').disabled, false); assert.equal(f.get('.film-skip').textContent, 'RELOAD GAME →');
});
