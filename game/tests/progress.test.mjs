import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, advanceSequence } from '../src/game/progress.ts';

const fresh = { version: 1, checkpoint: 140, coins: 0, stars: 0, unlocked: [], picked: [], opened: [], defeated: [], puzzle: false, complete: false, elapsed: 0 };
const decode = (patch = {}) => parseSave(JSON.stringify({ ...fresh, ...patch }));

test('new adventure and completed chapter round-trip without losing collected rewards', () => {
  assert.deepEqual(decode(), fresh);
  const completed = { ...fresh, checkpoint: 4570, coins: 188, stars: 1, unlocked: ['A', 'B', 'C'], picked: ['coin-1', 'star-0'], opened: ['chest-1'], defeated: ['enemy-0', 'enemy-4'], puzzle: true, complete: true, elapsed: 300 };
  assert.deepEqual(parseSave(JSON.stringify(completed)), completed);
});

test('missing, truncated, old-version and invalid numeric saves fall back safely', () => {
  for (const raw of [null, '{', 'null', '[]', '{"version":0}']) assert.equal(parseSave(raw), null);
  for (const patch of [{ coins: -1 }, { coins: 2.2 }, { elapsed: -1 }, { checkpoint: 5900 }, { stars: 6 }]) assert.equal(decode(patch), null);
});

test('a checkpoint beyond a locked shrine or an unsolved puzzle is rejected', () => {
  assert.equal(decode({ checkpoint: 1915, unlocked: ['A'] }), null);
  assert.equal(decode({ checkpoint: 4570, unlocked: ['A', 'B', 'C'] }), null);
  assert.equal(decode({ complete: true, puzzle: true, unlocked: ['A'] }), null);
  assert.ok(decode({ checkpoint: 3195, unlocked: ['A', 'B', 'C'] }));
});

test('duplicate, unknown and inconsistent collectibles cannot re-award progress', () => {
  for (const patch of [{ picked: ['coin-1', 'coin-1'] }, { picked: ['star-8'] }, { opened: ['chest-0', 'chest-0'] }, { picked: ['star-0'] }, { unlocked: ['A', 'A'] }, { defeated: ['enemy-0', 'enemy-0'] }, { defeated: ['enemy-99'] }]) assert.equal(decode(patch), null);
});

test('legacy prototype saves acquire empty enemy tracking without losing the checkpoint', () => {
  const legacy = { ...fresh, checkpoint: 595, unlocked: ['A'] };
  delete legacy.defeated;
  assert.deepEqual(parseSave(JSON.stringify(legacy)).defeated, []);
});

test('watcher sequence resets gently and accepts a new first sign immediately', () => {
  const sequence = ['A', 'C', 'B'];
  let index = 0;
  for (const sign of ['A', 'C', 'A', 'C', 'B']) index = advanceSequence(sequence, index, sign);
  assert.equal(index, 3);
  assert.equal(advanceSequence(sequence, 2, 'C'), 0);
  assert.equal(advanceSequence(sequence, 0, 'B'), 0);
});
