import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, WinterCampaign } from '../src/winter/campaign.ts';

test('academy must be completed before the playable Louvre operation', () => {
  const campaign = new WinterCampaign();
  assert.equal(campaign.state.character, 'noor'); assert.equal(campaign.state.tutorialComplete, false);
  assert.equal(campaign.status('academy'), 'available'); assert.equal(campaign.status('louvre'), 'locked');
  assert.equal(campaign.completeChapter('louvre'), false);
  assert.equal(campaign.completeChapter('academy'), true); assert.equal(campaign.state.tutorialComplete, true);
  assert.equal(campaign.status('academy'), 'completed'); assert.equal(campaign.status('louvre'), 'available');
  assert.equal(campaign.completeChapter('louvre'), true); assert.equal(campaign.status('louvre'), 'completed');
  assert.equal(campaign.completeChapter('academy'), false); assert.equal(campaign.completeChapter('louvre'), false);
  assert.deepEqual(campaign.state.completed, ['academy', 'louvre']);
});

test('planned chapters remain unplayable after all existing prerequisites are complete', () => {
  const campaign = new WinterCampaign(); campaign.completeChapter('academy'); campaign.completeChapter('louvre');
  for (const id of ['canal', 'glasshouse', 'observatory', 'spire']) {
    assert.equal(campaign.status(id), 'planned'); assert.equal(campaign.completeChapter(id), false);
  }
  assert.equal(campaign.status('invented'), 'locked'); assert.equal(campaign.completeChapter('invented'), false);
});

test('character selection accepts only known IDs and reset preserves the selected character', () => {
  const campaign = new WinterCampaign();
  for (const id of ['elio', 'mira', 'noor']) { assert.equal(campaign.selectCharacter(id), true); assert.equal(campaign.state.character, id); }
  for (const id of ['Noor', '', null, {}, 0, undefined]) assert.equal(campaign.selectCharacter(id), false);
  campaign.selectCharacter('mira'); campaign.completeChapter('academy'); campaign.resetProgress();
  assert.equal(campaign.state.character, 'mira'); assert.equal(campaign.state.tutorialComplete, false); assert.deepEqual(campaign.state.completed, []);
});

test('fresh, tutorial and completed campaign profiles round-trip', () => {
  const campaign = new WinterCampaign(), restored = new WinterCampaign();
  campaign.selectCharacter('elio');
  for (const id of [null, 'academy', 'louvre']) {
    if (id) campaign.completeChapter(id);
    assert.equal(restored.restore(campaign.serialize()), true); assert.deepEqual(restored.state, campaign.state);
  }
});

test('skipping opens field access without falsely completing the academy; tutorial can be completed later', () => {
  const campaign = new WinterCampaign(); campaign.skipTutorial();
  assert.equal(campaign.state.tutorialSkipped, true); assert.equal(campaign.state.tutorialComplete, false);
  assert.deepEqual(campaign.state.completed, []); assert.equal(campaign.status('academy'), 'available'); assert.equal(campaign.status('louvre'), 'available');
  assert.equal(campaign.completeChapter('louvre'), true); assert.deepEqual(campaign.state.completed, ['louvre']);
  const resumed = new WinterCampaign(); assert.equal(resumed.restore(campaign.serialize()), true);
  assert.deepEqual(resumed.state, campaign.state);
  assert.equal(resumed.completeChapter('academy'), true); assert.deepEqual(resumed.state.completed, ['academy', 'louvre']);
  assert.equal(resumed.state.tutorialSkipped, false); assert.equal(resumed.state.tutorialComplete, true);
  resumed.skipTutorial(); assert.equal(resumed.state.tutorialSkipped, false);
});

test('legacy profiles without a skip flag remain readable, but a lone Louvre completion requires an explicit skip', () => {
  const campaign = new WinterCampaign(); campaign.completeChapter('academy');
  const legacy = JSON.parse(campaign.serialize()); delete legacy.tutorialSkipped;
  const resumed = new WinterCampaign(); assert.equal(resumed.restore(JSON.stringify(legacy)), true); assert.equal(resumed.state.tutorialSkipped, false);
  assert.equal(resumed.restore(JSON.stringify({ ...legacy, completed: ['louvre'], tutorialComplete: false })), false);
  assert.equal(resumed.restore(JSON.stringify({ ...legacy, tutorialSkipped: 'true' })), false);
  assert.equal(resumed.restore(JSON.stringify({ ...legacy, tutorialSkipped: true })), false);
  resumed.resetProgress(); resumed.skipTutorial(); resumed.resetProgress(); assert.equal(resumed.state.tutorialSkipped, false);
});

test('invalid saves are rejected without changing existing profile or progress', () => {
  const campaign = new WinterCampaign(); campaign.selectCharacter('mira'); campaign.completeChapter('academy');
  const before = campaign.state, saved = JSON.parse(campaign.serialize());
  const invalid = ['{', 'null', '[]', ...[
    { version: 2 }, { profile: 'other' }, { character: 'invented' }, { character: {} },
    { completed: ['louvre'] }, { completed: ['louvre', 'academy'] }, { completed: ['academy', 'academy'] },
    { completed: ['academy', 'canal'] }, { completed: [0] }, { completed: 'academy' },
    { completed: ['academy', 'louvre', 'spire'] }, { tutorialComplete: false }, { tutorialComplete: 'true' },
  ].map(patch => JSON.stringify({ ...saved, ...patch }))];
  for (const raw of invalid) { assert.equal(campaign.restore(raw), false); assert.deepEqual(campaign.state, before); }
});

test('campaign snapshots and chapter metadata are immutable and visibly label planned content', () => {
  const campaign = new WinterCampaign(); const before = campaign.state;
  assert.throws(() => before.completed.push('academy'), TypeError);
  assert.throws(() => { before.character = 'mira'; }, TypeError);
  campaign.completeChapter('academy'); assert.equal(before.tutorialComplete, false);
  assert.equal(CHAPTERS.length, 6); assert.equal(CHAPTERS.filter(c => c.playable).length, 2);
  assert.throws(() => CHAPTERS.push({}), TypeError);
  assert.throws(() => { CHAPTERS[0].title = 'Changed'; }, TypeError);
  assert.throws(() => { CHAPTERS[0].position[0] = 100; }, TypeError);
  assert.match(CHAPTERS[0].description, /safe training simulation/i);
  for (const c of CHAPTERS.filter(c => !c.playable)) assert.match(c.subtitle, /planned/i);
});
