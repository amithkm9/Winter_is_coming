import type { WinterSign } from './mission.ts';

export interface SignReference {
  readonly sign: WinterSign;
  readonly title: string;
  readonly instruction: string;
  readonly image: string;
  readonly source: string;
}

const alphabet = 'https://www.lifeprint.com/asl101/fingerspelling/abc.htm';
const numbers = 'https://www.lifeprint.com/asl101/pages-signs/n/numbers1-10.htm';

/** Illustrations ship with the game. Attribution is in public/signs/PROVENANCE.md.
 * ASL reference hand shapes do not validate the supplied recognition model. */
export const SIGN_REFERENCES: Readonly<Record<WinterSign, SignReference>> = Object.freeze({
  A: Object.freeze({
    sign: 'A',
    title: 'ASL letter A',
    instruction:
      'Make a relaxed fist. Keep your thumb beside your fingers, along the side of your hand. Face your palm forward.',
    image: 'signs/asl-a.svg',
    source: alphabet,
  }),
  B: Object.freeze({
    sign: 'B',
    title: 'ASL letter B',
    instruction:
      'Hold four fingers straight and together. Rest your thumb across your palm without forcing it. Face your palm forward.',
    image: 'signs/asl-b.svg',
    source: alphabet,
  }),
  C: Object.freeze({
    sign: 'C',
    title: 'ASL letter C',
    instruction:
      'Curve your fingers and thumb into an open C shape. Keep the fingertips and thumb apart.',
    image: 'signs/asl-c.svg',
    source: alphabet,
  }),
  '1': Object.freeze({
    sign: '1',
    title: 'ASL number 1',
    instruction:
      'Raise your index finger and fold the other fingers down. For this number on its own, turn your palm toward yourself.',
    image: 'signs/asl-1.png',
    source: numbers,
  }),
  '2': Object.freeze({
    sign: '2',
    title: 'ASL number 2',
    instruction:
      'Raise and separate your index and middle fingers. Fold the others down. Turn your palm toward yourself.',
    image: 'signs/asl-2.png',
    source: numbers,
  }),
  '3': Object.freeze({
    sign: '3',
    title: 'ASL number 3',
    instruction:
      'Extend your thumb, index and middle fingers. Fold your ring and little fingers down. Turn your palm toward yourself.',
    image: 'signs/asl-3.png',
    source: numbers,
  }),
});

export function getSignReference(sign: unknown): SignReference | null {
  return typeof sign === 'string' && Object.hasOwn(SIGN_REFERENCES, sign)
    ? SIGN_REFERENCES[sign as WinterSign]
    : null;
}

export function createSignGuide(
  parent: HTMLElement,
  options: { onWatchingChange?: (watching: boolean) => void } = {},
) {
  const doc = parent.ownerDocument;
  const root = doc.createElement('section');
  root.className = 'sign-guide';
  root.hidden = true;
  root.setAttribute('aria-label', 'ASL hand-sign guide');
  root.innerHTML = `<div class="sign-guide-heading"><span class="sign-guide-label"></span><span class="sign-guide-badge">HAND GUIDE</span></div>
    <figure class="sign-guide-figure"><img class="sign-guide-image" width="320" height="220" decoding="async" alt=""><figcaption>Match the hand shape</figcaption></figure>
    <p class="sign-guide-instruction"></p><p class="sign-guide-image-error" hidden>Image unavailable. Follow the hand-shape instructions above.</p>
    <button type="button" class="sign-guide-watch">STUDY SIGN · SAFE VIEW</button><button type="button" class="sign-guide-close" hidden>READY TO TRY →</button>
    <p class="sign-guide-status" hidden role="status">Take your time. Danger is paused while you study.</p><p class="sign-guide-note">ASL reference · Camera recognition is experimental.</p>`;
  parent.append(root);
  const label = root.querySelector<HTMLElement>('.sign-guide-label')!;
  const instruction = root.querySelector<HTMLElement>('.sign-guide-instruction')!;
  const img = root.querySelector<HTMLImageElement>('.sign-guide-image')!;
  const caption = root.querySelector<HTMLElement>('figcaption')!;
  const imageError = root.querySelector<HTMLElement>('.sign-guide-image-error')!;
  const study = root.querySelector<HTMLButtonElement>('.sign-guide-watch')!;
  const close = root.querySelector<HTMLButtonElement>('.sign-guide-close')!;
  const status = root.querySelector<HTMLElement>('.sign-guide-status')!;
  let reference: SignReference | null = null,
    visible = false,
    studying = false,
    disposed = false;
  function stopStudying() {
    root.classList.remove('studying');
    close.hidden = true;
    status.hidden = true;
    study.hidden = false;
    if (studying) {
      studying = false;
      options.onWatchingChange?.(false);
    }
  }
  function startStudying() {
    if (disposed || !visible || !reference || studying) return;
    studying = true;
    root.classList.add('studying');
    study.hidden = true;
    close.hidden = false;
    status.hidden = false;
    options.onWatchingChange?.(true);
    close.focus();
  }
  const onClose = () => {
    stopStudying();
    study.focus();
  };
  img.onerror = () => {
    imageError.hidden = false;
  };
  img.onload = () => {
    imageError.hidden = true;
  };
  study.addEventListener('click', startStudying);
  close.addEventListener('click', onClose);
  return {
    setSign(sign: unknown) {
      if (disposed) return;
      const next = getSignReference(sign);
      if (next === reference) return;
      stopStudying();
      reference = next;
      root.hidden = !visible || !reference;
      if (!reference) {
        img.removeAttribute('src');
        img.alt = '';
        return;
      }
      label.textContent = `REQUIRED ${reference.sign} · ${reference.title}`;
      instruction.textContent = reference.instruction;
      caption.textContent = ['1', '2', '3'].includes(reference.sign)
        ? 'Finger shape shown from the front. Turn your palm toward yourself.'
        : reference.sign === 'C'
          ? 'Side view · keep the C shape open'
          : 'Front view · face your palm forward';
      study.textContent = `STUDY ${reference.sign} · SAFE VIEW`;
      imageError.hidden = true;
      img.alt = `${reference.title}. ${reference.instruction}`;
      img.src = `${import.meta.env?.BASE_URL || './'}${reference.image}`;
    },
    setVisible(value: boolean) {
      if (disposed) return;
      visible = value;
      if (!visible) stopStudying();
      root.hidden = !visible || !reference;
    },
    dispose() {
      if (disposed) return;
      stopStudying();
      disposed = true;
      img.onload = img.onerror = null;
      study.removeEventListener('click', startStudying);
      close.removeEventListener('click', onClose);
      root.remove();
    },
  };
}
