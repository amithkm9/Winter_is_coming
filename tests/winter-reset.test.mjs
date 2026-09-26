import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { consumeWinterReset, resetWinterProgress, WINTER_SAVE_KEYS } from '../src/winter/reset.ts';
import { WinterCampaign } from '../src/winter/campaign.ts';

test('reset removes every Winter save/settings key while preserving unrelated games', async () => {
  const w = new Window({ url: 'http://localhost:5173/winter.html?reset=1&quality=low#intro' });
  for (const key of WINTER_SAVE_KEYS) w.localStorage.setItem(key, 'old data');
  w.localStorage.setItem('learnsign-save-v1', 'forest progress');
  w.localStorage.setItem('other-app', 'untouched');
  assert.equal(consumeWinterReset(w), true);
  for (const key of WINTER_SAVE_KEYS) assert.equal(w.localStorage.getItem(key), null);
  assert.equal(w.localStorage.getItem('learnsign-save-v1'), 'forest progress');
  assert.equal(w.localStorage.getItem('other-app'), 'untouched');
  assert.equal(w.location.href, 'http://localhost:5173/winter.html?quality=low#intro');
  const campaign = new WinterCampaign();
  assert.equal(campaign.restore(w.localStorage.getItem('winter-campaign-v1') || ''), false);
  assert.equal(campaign.status('academy'), 'available'); assert.equal(campaign.status('louvre'), 'locked');
  await w.happyDOM.close();
});
test('a normal refresh after reset keeps newly earned progress', async () => {
  const w = new Window({ url: 'http://localhost:5173/winter.html?reset=1' });
  consumeWinterReset(w); w.localStorage.setItem('winter-campaign-v1', 'new progress');
  assert.equal(consumeWinterReset(w), false); assert.equal(w.localStorage.getItem('winter-campaign-v1'), 'new progress');
  await w.happyDOM.close();
});
test('ordinary launch never clears progress and direct reset is idempotent', async () => {
  const w = new Window({ url: 'http://localhost:5173/winter.html' });
  w.localStorage.setItem('winter-louvre-v1', 'saved mission');
  assert.equal(consumeWinterReset(w), false); assert.equal(w.localStorage.getItem('winter-louvre-v1'), 'saved mission');
  resetWinterProgress(w.localStorage); resetWinterProgress(w.localStorage);
  assert.equal(w.localStorage.getItem('winter-louvre-v1'), null); await w.happyDOM.close();
});
test('denied storage reports failure and keeps reset URL available for retry', () => {
  let historyChanged = false;
  const win = { location: { href: 'http://localhost:5173/winter.html?reset=1' }, localStorage: { removeItem() { throw new Error('denied'); } }, history: { state: null, replaceState() { historyChanged = true; } } };
  assert.throws(() => consumeWinterReset(win), /denied/); assert.equal(historyChanged, false);
});
