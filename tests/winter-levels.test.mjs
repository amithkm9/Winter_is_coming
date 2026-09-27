/** Pure campaign/mission integration. Camera source is simulated; no hardware or recognition-accuracy claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, isMissionChapter } from '../src/winter/levels.ts';
import { WinterMission } from '../src/winter/mission.ts';
import { WinterCampaign, CHAPTERS } from '../src/winter/campaign.ts';

function relay(mission, id, source) {
  assert.equal(mission.enterRelay(id), true);
  for (const sign of LEVELS[mission.chapter].sequences[id])
    assert.equal(mission.submit(sign, source), true);
}

for (const source of ['keyboard', 'camera']) {
  test(`the entire campaign completes and resumes with ${source}-sourced cipher inputs`, () => {
    const campaign = new WinterCampaign();
    campaign.completeChapter('academy');
    for (const chapter of CHAPTERS.slice(1)) {
      assert.equal(campaign.status(chapter.id), 'available');
      let mission = new WinterMission(chapter.id);
      mission.start();
      assert.equal(mission.finishAtCore(), false);
      for (const id of [0, 1, 2]) {
        relay(mission, id, source);
        const resumed = new WinterMission(chapter.id);
        assert.equal(resumed.restore(mission.serialize()), true);
        const { message: restoredMessage, ...restoredProgress } = resumed.state;
        const { message: originalMessage, ...originalProgress } = mission.state;
        assert.deepEqual(restoredProgress, originalProgress);
        mission = resumed;
      }
      assert.equal(mission.finishAtCore(), true);
      mission.tick(8, true);
      assert.equal(mission.state.phase, 'complete');
      assert.equal(mission.state.lastSource, source);
      assert.equal(campaign.completeChapter(chapter.id), true);
      const profile = new WinterCampaign();
      assert.equal(profile.restore(campaign.serialize()), true);
      assert.deepEqual(profile.state.completed, campaign.state.completed);
    }
    assert.deepEqual(
      campaign.state.completed,
      CHAPTERS.map((c) => c.id),
    );
  });
}

test('ordered chapters reject locked relays without mutating state or skipping geometry gates', () => {
  for (const chapter of Object.keys(LEVELS).filter((id) => id !== 'louvre')) {
    const mission = new WinterMission(chapter);
    mission.start();
    for (const id of [0, 1, 2]) {
      const before = mission.state;
      for (let future = id + 1; future < 3; future++) {
        assert.equal(mission.canEnterRelay(future), false);
        assert.equal(mission.enterRelay(future), false);
        assert.deepEqual(mission.state, before);
      }
      assert.equal(mission.canEnterRelay(id), true);
      relay(mission, id, 'keyboard');
      assert.equal(mission.canEnterRelay(id), false);
    }
  }
});

test('mission saves cannot cross chapter boundaries and malformed ordered progress is rejected', () => {
  for (const chapter of Object.keys(LEVELS)) {
    const mission = new WinterMission(chapter);
    mission.start();
    relay(mission, 0, 'keyboard');
    const saved = JSON.parse(mission.serialize());
    for (const other of Object.keys(LEVELS).filter((id) => id !== chapter)) {
      const target = new WinterMission(other);
      const before = target.state;
      assert.equal(target.restore(JSON.stringify(saved)), false);
      assert.deepEqual(target.state, before);
    }
    if (chapter !== 'louvre') {
      for (const completed of [[1], [2, 0], [1, 0, 2]]) {
        assert.equal(mission.restore(JSON.stringify({ ...saved, completed })), false);
        assert.deepEqual(mission.state.completed, [0]);
      }
    }
    mission.reset();
    assert.equal(mission.chapter, chapter);
    assert.equal(mission.state.chapter, chapter);
  }
});

test('legacy Louvre version-one saves retain their completed relays without being accepted elsewhere', () => {
  const old = new WinterMission();
  old.start();
  relay(old, 2, 'keyboard');
  const legacy = JSON.parse(old.serialize());
  delete legacy.chapter;
  const resumed = new WinterMission();
  assert.equal(resumed.restore(JSON.stringify(legacy)), true);
  assert.deepEqual(resumed.state.completed, [2]);
  assert.equal(new WinterMission('canal').restore(JSON.stringify(legacy)), false);
});

test('capture and checkpoint retry preserve each chapter’s completed gates and saved identity', () => {
  for (const chapter of Object.keys(LEVELS)) {
    const mission = new WinterMission(chapter);
    mission.start();
    relay(mission, 0, 'camera');
    mission.enterRelay(1);
    mission.submit(LEVELS[chapter].sequences[1][0], 'keyboard');
    mission.tick(5, true);
    assert.equal(mission.state.phase, 'caught');
    assert.deepEqual(mission.state.completed, [0]);
    const resumed = new WinterMission(chapter);
    assert.equal(resumed.restore(mission.serialize()), true);
    assert.equal(resumed.state.phase, 'explore');
    assert.equal(resumed.canEnterRelay(1), true);
    assert.equal(mission.retryFromCheckpoint(), true);
    assert.equal(mission.canEnterRelay(1), true);
    assert.equal(mission.state.step, 0);
    assert.equal(mission.state.chapter, chapter);
    relay(mission, 1, 'camera');
    relay(mission, 2, 'camera');
    assert.equal(mission.finishAtCore(), true);
    mission.tick(8, true);
    assert.equal(mission.state.phase, 'complete');
  }
});

test('level configurations are immutable and contain only supported cipher inputs', () => {
  const inputs = new Set(['A', 'B', 'C', '1', '2', '3']);
  assert.equal(Object.keys(LEVELS).length, 5);
  for (const level of Object.values(LEVELS)) {
    assert.equal(isMissionChapter(level.id), true);
    assert.throws(() => {
      level.title = 'forged';
    }, TypeError);
    for (const sequence of Object.values(level.sequences)) {
      assert.ok(sequence.length >= 1 && sequence.length <= 5);
      assert.ok(sequence.every((sign) => inputs.has(sign)));
      assert.throws(() => sequence.push('A'), TypeError);
    }
  }
  for (const bad of ['academy', 'invented', null, 1]) assert.equal(isMissionChapter(bad), false);
  assert.throws(() => new WinterMission('invented'), TypeError);
});
