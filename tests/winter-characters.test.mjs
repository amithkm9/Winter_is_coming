import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { CHARACTERS, getCharacter } from '../src/winter/characters.ts';
import { createCourier } from '../src/winter/effects.ts';
import { RUN_SPEED } from '../src/winter/movement.ts';

test('three immutable profiles have distinct identities and valid bundled portrait assets', async () => {
  assert.deepEqual(
    CHARACTERS.map((c) => c.id),
    ['noor', 'elio', 'mira'],
  );
  assert.equal(new Set(CHARACTERS.map((c) => c.accent)).size, 3);
  for (const character of CHARACTERS) {
    assert.equal(getCharacter(character.id), character);
    assert.ok(Object.isFrozen(character));
    assert.match(character.description, /deaf, nonspeaking/);
    assert.match(character.description, /learning sign language/);
    const svg = await fs.readFile(
      new URL(`../public/${character.portrait.replace('./', '')}`, import.meta.url),
      'utf8',
    );
    assert.match(svg, /<svg/);
    assert.ok(svg.includes(character.name));
  }
  for (const invalid of [undefined, null, '', 'missing', 2, {}, '__proto__'])
    assert.equal(getCharacter(invalid).id, 'noor');
});

test('all selectable couriers build finite animated meshes, share the gameplay API, and release resources once', () => {
  const signatures = [];
  for (const profile of CHARACTERS) {
    const courier = createCourier(profile.id),
      resources = new Set(),
      disposed = new Map();
    const scene = new THREE.Scene();
    scene.add(courier.object);
    let meshCount = 0;
    courier.object.traverse((o) => {
      if (o.isMesh) {
        meshCount++;
        resources.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => resources.add(m));
      }
    });
    assert.ok(meshCount > 30);
    assert.ok(courier.object.name.includes(profile.name));
    for (const args of [
      [0, 0, false],
      [1, 1, false],
      [4, 0.5, true],
      [8, 0, false, true],
      [12, 1, true, false, true],
    ]) {
      courier.update(...args);
      courier.object.updateMatrixWorld(true);
      courier.object.traverse((o) => assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
    }
    const bounds = new THREE.Box3().setFromObject(courier.object);
    assert.ok(
      bounds.min.y > -0.1 && bounds.max.y < 2.5,
      `${profile.name} fits the shared player envelope`,
    );
    signatures.push(`${meshCount}:${bounds.max.y.toFixed(3)}`);
    resources.forEach((resource) => {
      disposed.set(resource, 0);
      resource.addEventListener('dispose', () =>
        disposed.set(resource, disposed.get(resource) + 1),
      );
    });
    courier.dispose();
    courier.dispose();
    assert.equal(scene.children.length, 0);
    resources.forEach((resource) => assert.equal(disposed.get(resource), 1));
  }
  assert.equal(
    new Set(signatures).size,
    3,
    'Selectable models have distinct accessory/hood geometry',
  );
});

test('reduced-motion settings freeze idle cloth and walking oscillation without suppressing casting pose', () => {
  const courier = createCourier('mira');
  try {
    const capture = () => {
      courier.object.updateMatrixWorld(true);
      const transforms = [];
      courier.object.traverse((o) => transforms.push([...o.matrixWorld.elements]));
      return transforms;
    };
    courier.update(1, 1, false, false, true);
    const first = capture();
    courier.update(55, 1, false, false, true);
    assert.deepEqual(capture(), first);
    courier.update(55, 1, true, false, true);
    assert.notDeepEqual(capture(), first);
  } finally {
    courier.dispose();
  }
});

test('articulated gait is driven by actual movement and delta time, never wall-clock jumps', () => {
  const first = createCourier('noor'),
    second = createCourier('noor');
  const capture = (courier) => {
    courier.object.updateMatrixWorld(true);
    const result = [];
    courier.object.traverse((o) => result.push([...o.matrixWorld.elements]));
    return result;
  };
  try {
    for (let frame = 0; frame < 120; frame++) {
      assert.deepEqual(
        first.update(frame / 60, 0.545, false, false, false, 1 / 60),
        second.update(10000 + frame * 40, 0.545, false, false, false, 1 / 60),
      );
    }
    assert.deepEqual(capture(first), capture(second));
    const paused = capture(first);
    assert.equal(first.update(99999, 0.545, false, false, false, 0).footstep, false);
    assert.deepEqual(capture(first), paused);
    for (let frame = 0; frame < 180; frame++)
      assert.equal(
        first.update(frame, 0, false, false, false, 1 / 60).footstep,
        false,
        'A blocked player cannot produce footsteps',
      );
    assert.ok(
      Math.abs(first.object.getObjectByName('left-foot').getWorldPosition(new THREE.Vector3()).z) <
        0.001,
      'Foot returns to a neutral standing pose',
    );
  } finally {
    first.dispose();
    second.dispose();
  }
});

test('walk/run plants alternate, knees articulate and boot soles remain above the paving', () => {
  for (const speed of [0.545, 1]) {
    const courier = createCourier('elio');
    try {
      const contacts = [],
        kneeAngles = [],
        footHeights = [];
      for (let frame = 0; frame < 240; frame++) {
        const event = courier.update(frame / 60, speed, false, false, false, 1 / 60);
        courier.object.updateMatrixWorld(true);
        const left = courier.object.getObjectByName('left-foot'),
          right = courier.object.getObjectByName('right-foot');
        for (const foot of [left, right]) {
          const bounds = new THREE.Box3().setFromObject(foot);
          assert.ok(
            bounds.min.y >= 0.0249,
            `Boot sole does not penetrate paving (${bounds.min.y})`,
          );
          footHeights.push(bounds.min.y);
        }
        kneeAngles.push(courier.object.getObjectByName('left-knee').rotation.x);
        if (event.footstep) {
          contacts.push(event.side);
          const planted = event.side < 0 ? left : right;
          assert.ok(
            new THREE.Box3().setFromObject(planted).min.y < 0.08,
            'Footfall event corresponds to a ground contact',
          );
        }
      }
      assert.ok(
        contacts.length >= 24 && contacts.length <= 54,
        'Cadence fits a short-step walk or run',
      );
      for (let i = 1; i < contacts.length; i++) assert.notEqual(contacts[i], contacts[i - 1]);
      assert.ok(
        Math.max(...kneeAngles) - Math.min(...kneeAngles) > 0.2,
        'The knee bends through swing',
      );
      assert.ok(Math.max(...footHeights) > 0.1, 'Swinging boots lift clear of the floor');
    } finally {
      courier.dispose();
    }
  }
});

test('outfit attachments remain fixed to the torso during body sway', () => {
  const courier = createCourier('mira');
  try {
    const torso = courier.object.getObjectByName('courier-upper-body');
    const stableMeshes = torso.children.filter(
      (o) => o.isMesh && !o.geometry.type.includes('Cylinder'),
    );
    const localPositions = stableMeshes.map((o) => o.position.toArray());
    for (let frame = 0; frame < 60; frame++)
      courier.update(frame / 60, 1, false, false, false, 1 / 60, 0.8);
    assert.deepEqual(
      stableMeshes.map((o) => o.position.toArray()),
      localPositions,
      'Coat, buttons, face and belt move as one assembly',
    );
    assert.ok(Math.abs(torso.rotation.z) > 0.01, 'The unified torso responds to turning');
  } finally {
    courier.dispose();
  }
});

test('planted feet approximately cancel actual controller travel rather than sliding along the ground', () => {
  for (const speed of [0.5, 1]) {
    const courier = createCourier('noor');
    try {
      const dt = 1 / 120;
      for (let i = 0; i < 400; i++) courier.update(i * dt, speed, false, false, false, dt);
      let previous = [],
        checks = 0;
      for (let i = 0; i < 240; i++) {
        courier.object.position.z -= speed * RUN_SPEED * dt;
        courier.update(i * dt, speed, false, false, false, dt);
        courier.object.updateMatrixWorld(true);
        const current = ['left-foot', 'right-foot'].map((name) => {
          const foot = courier.object.getObjectByName(name);
          return {
            position: foot.getWorldPosition(new THREE.Vector3()),
            sole: new THREE.Box3().setFromObject(foot).min.y,
          };
        });
        current.forEach((foot, index) => {
          const before = previous[index];
          // Central stance excludes the short heel/toe rolls and swing contacts.
          if (
            before &&
            foot.sole < 0.033 &&
            before.sole < 0.033 &&
            foot.position.y < 0.1741 &&
            before.position.y < 0.1741
          ) {
            assert.ok(
              Math.abs(foot.position.z - before.position.z) < 0.004,
              'Planted foot stays within four millimetres per frame',
            );
            checks++;
          }
        });
        previous = current;
      }
      assert.ok(checks > 30, 'Measured multiple planted contacts');
    } finally {
      courier.dispose();
    }
  }
});
