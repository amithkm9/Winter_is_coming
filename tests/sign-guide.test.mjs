import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { createSignGuide, getSignReference, SIGN_REFERENCES } from '../src/winter/sign-guide.ts';

function setup() {
  const window = new Window({
    url: 'https://example.test/itch/game/index.html',
    settings: { disableCSSFileLoading: true, disableComputedStyleRendering: true },
  });
  const parent = window.document.createElement('div');
  window.document.body.append(parent);
  const calls = [],
    guide = createSignGuide(parent, { onWatchingChange: (watching) => calls.push(watching) });
  return {
    window,
    parent,
    calls,
    guide,
    click: (selector) => parent.querySelector(selector).click(),
  };
}

test('six ASL hand images use local relative paths; unknown inputs cannot select an asset', () => {
  assert.deepEqual(Object.keys(SIGN_REFERENCES).sort(), ['1', '2', '3', 'A', 'B', 'C']);
  for (const [sign, reference] of Object.entries(SIGN_REFERENCES)) {
    assert.equal(reference.sign, sign);
    assert.match(reference.image, /^signs\/asl-[abc123]\.(svg|png|webp)$/);
    const asset = readFileSync(new URL(`../public/${reference.image}`, import.meta.url));
    assert.ok(asset.length > 100, `${sign} illustration must be included in the build`);
    if (reference.image.endsWith('.svg'))
      assert.doesNotMatch(
        asset.toString(),
        /<script\b|<foreignObject\b|<image[^>]+(?:href|xlink:href)=["']https?:/i,
      );
    assert.ok(Object.isFrozen(reference));
  }
  assert.match(SIGN_REFERENCES['3'].instruction, /thumb, index and middle/);
  for (const bad of [null, undefined, 'constructor', '__proto__', 'a', 1, {}, '<script>'])
    assert.equal(getSignReference(bad), null);
});

test('the required image appears immediately without external players or a Watch step', async () => {
  const { window, parent, guide, calls } = setup();
  guide.setSign('A');
  guide.setVisible(true);
  const img = parent.querySelector('img');
  assert.equal(parent.querySelector('.sign-guide').hidden, false);
  assert.equal(img.src, `https://example.test/itch/game/${SIGN_REFERENCES.A.image}`);
  assert.match(img.alt, /ASL letter A/);
  assert.match(parent.textContent, /REQUIRED A/);
  assert.equal(parent.querySelector('iframe,video,script,a'), null);
  assert.deepEqual(calls, []);
  guide.dispose();
  await window.happyDOM.close();
});

test('safe study enlarges the image; changing the required input updates it and releases safety', async () => {
  const { window, parent, guide, calls, click } = setup();
  guide.setSign('A');
  click('.sign-guide-watch');
  assert.deepEqual(calls, []);
  guide.setVisible(true);
  click('.sign-guide-watch');
  assert.equal(parent.querySelector('.sign-guide').classList.contains('studying'), true);
  guide.setSign('A');
  assert.deepEqual(calls, [true]);
  guide.setSign('3');
  assert.deepEqual(calls, [true, false]);
  assert.ok(parent.querySelector('img').src.endsWith(SIGN_REFERENCES['3'].image));
  assert.match(parent.textContent, /REQUIRED 3/);
  assert.match(parent.textContent, /thumb, index and middle/);
  click('.sign-guide-watch');
  guide.setSign(null);
  assert.equal(parent.querySelector('.sign-guide').hidden, true);
  assert.equal(parent.querySelector('img').hasAttribute('src'), false);
  assert.deepEqual(calls, [true, false, true, false]);
  guide.dispose();
  await window.happyDOM.close();
});

test('Ready, hiding, and disposal release safety without removing the inline reference', async () => {
  const { window, parent, guide, calls, click } = setup();
  guide.setSign('B');
  guide.setVisible(true);
  click('.sign-guide-watch');
  click('.sign-guide-close');
  assert.ok(parent.querySelector('img').hasAttribute('src'));
  assert.equal(window.document.activeElement, parent.querySelector('.sign-guide-watch'));
  click('.sign-guide-watch');
  guide.setVisible(false);
  guide.setVisible(false);
  assert.deepEqual(calls, [true, false, true, false]);
  guide.setVisible(true);
  click('.sign-guide-watch');
  guide.dispose();
  guide.dispose();
  guide.setSign('C');
  guide.setVisible(true);
  assert.equal(parent.childElementCount, 0);
  assert.deepEqual(calls, [true, false, true, false, true, false]);
  await window.happyDOM.close();
});

test('an unavailable image retains readable instructions and a visible fallback', async () => {
  const { window, parent, guide } = setup();
  guide.setSign('C');
  guide.setVisible(true);
  parent.querySelector('img').dispatchEvent(new window.Event('error'));
  assert.equal(parent.querySelector('.sign-guide-image-error').hidden, false);
  assert.match(parent.textContent, /Curve your fingers/);
  guide.setSign('B');
  assert.equal(parent.querySelector('.sign-guide-image-error').hidden, true);
  guide.dispose();
  await window.happyDOM.close();
});
