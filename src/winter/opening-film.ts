type OpeningFilmOptions = {
  source: string;
  poster: string;
  mode?: 'opening' | 'ending';
  onContinue: () => Promise<unknown>;
};

/** Keep video decoding and the 3D renderer separate on memory-constrained phones. */
export function showOpeningFilm(parent: HTMLElement, options: OpeningFilmOptions) {
  const doc = parent.ownerDocument,
    win = doc.defaultView!;
  const ending = options.mode === 'ending';
  const layer = doc.createElement('section');
  layer.className = 'opening-film';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-labelledby', 'film-title');
  layer.innerHTML = `<video class="opening-video" playsinline preload="none" aria-label="Winter is Coming ${ending ? 'ending' : 'opening'} film"></video>
    <div class="film-shade"></div>
    <header class="film-header"><span>THE SILENT RESISTANCE</span><span>${ending ? 'ENDING FILM' : 'OPENING FILM'}</span></header>
    <div class="film-invitation"><p class="film-eyebrow">${ending ? 'RESISTANCE TRANSMISSION / RESTORED' : 'PARIS, 2091 / THE STORY BEGINS'}</p><h1 id="film-title">${ending ? 'A LIGHT<br>RETURNS.' : 'WINTER<br>IS COMING.'}</h1><p>${ending ? 'Your progress is saved.<br>The adventure continues.' : 'A city held in ice.<br>A spark of resistance.'}</p><button class="film-watch" type="button">▶ ${ending ? 'WATCH ENDING' : 'WATCH INTRO'}</button><small>Tap to play with sound · You can skip at any time</small></div>
    <footer class="film-footer"><div class="film-playback" hidden><button class="film-pause" type="button">PAUSE</button><button class="film-mute" type="button" aria-pressed="false">SOUND ON</button><span class="film-time" aria-hidden="true">0:00</span></div><button class="film-skip" type="button">${ending ? 'CONTINUE →' : 'SKIP TO GAME →'}</button></footer>
    <p class="film-status" role="status" aria-live="polite"></p>
    <div class="film-progress" aria-hidden="true"><i></i></div>`;
  const el = <T extends HTMLElement>(selector: string) => layer.querySelector<T>(selector)!;
  const video = el<HTMLVideoElement>('video'),
    invitation = el<HTMLDivElement>('.film-invitation');
  const watch = el<HTMLButtonElement>('.film-watch'),
    skip = el<HTMLButtonElement>('.film-skip');
  const pause = el<HTMLButtonElement>('.film-pause'),
    mute = el<HTMLButtonElement>('.film-mute');
  const playback = el<HTMLDivElement>('.film-playback'),
    status = el<HTMLParagraphElement>('.film-status');
  video.poster = options.poster;
  let disposed = false,
    continuing = false,
    started = false,
    playing = false;
  const previousFocus = doc.activeElement as HTMLElement | null;
  const siblings = Array.from(parent.children).filter(
    (child): child is HTMLElement => child instanceof win.HTMLElement,
  );
  const previousInert = siblings.map((child) => child.inert);
  siblings.forEach((child) => {
    child.inert = true;
  });
  const events: Array<() => void> = [];
  function listen(target: EventTarget, type: string, callback: EventListener) {
    target.addEventListener(type, callback);
    events.push(() => target.removeEventListener(type, callback));
  }
  function stopVideo() {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    events.forEach((remove) => remove());
    stopVideo();
    layer.remove();
    siblings.forEach((child, index) => {
      child.inert = previousInert[index];
    });
    if (previousFocus?.isConnected && previousFocus !== doc.body) previousFocus.focus();
  }
  async function continueToGame() {
    if (continuing || disposed) return;
    continuing = true;
    layer.classList.add('film-loading');
    watch.disabled = pause.disabled = mute.disabled = skip.disabled = true;
    stopVideo();
    status.textContent = ending ? 'Returning to your adventure…' : 'Entering Paris…';
    try {
      await options.onContinue();
      if (disposed) return;
      dispose();
      doc.getElementById(ending ? 'victory-map' : 'start')?.focus();
    } catch {
      if (disposed) return;
      status.textContent =
        'The game could not load. Check your connection, then reload to try again.';
      skip.disabled = false;
      skip.textContent = 'RELOAD GAME →';
      skip.onclick = () => win.location.reload();
      skip.focus();
    }
  }
  async function play() {
    if (continuing || disposed) return;
    status.textContent = 'Loading film…';
    if (!started) {
      video.src = options.source;
      started = true;
    }
    try {
      // Called directly from a click, including on iOS: no autoplay-with-audio dependency.
      await video.play();
      if (continuing || disposed) {
        video.pause();
        return;
      }
      invitation.hidden = true;
      playback.hidden = false;
      layer.classList.add('film-started');
      status.textContent = '';
      pause.focus();
    } catch {
      if (continuing || disposed) return;
      status.textContent = 'Playback could not start. Tap to try again, or skip to the game.';
      if (!layer.classList.contains('film-started')) invitation.hidden = false;
      watch.textContent = ending ? '▶ PLAY ENDING' : '▶ PLAY INTRO';
      pause.textContent = 'RESUME';
    }
  }
  function pauseVideo() {
    if (started && !continuing) video.pause();
  }
  watch.onclick = () => void play();
  skip.onclick = () => void continueToGame();
  pause.onclick = () => {
    if (playing) pauseVideo();
    else void play();
  };
  mute.onclick = () => {
    video.muted = !video.muted;
    mute.textContent = video.muted ? 'SOUND OFF' : 'SOUND ON';
    mute.setAttribute('aria-pressed', String(video.muted));
  };
  listen(video, 'playing', () => {
    playing = true;
    pause.textContent = 'PAUSE';
    if (!continuing) status.textContent = '';
  });
  listen(video, 'pause', () => {
    playing = false;
    pause.textContent = 'RESUME';
  });
  listen(video, 'ended', () => void continueToGame());
  listen(video, 'error', () => {
    if (!continuing) {
      status.textContent = 'This film is unavailable. You can still continue.';
      skip.focus();
    }
  });
  listen(video, 'waiting', () => {
    if (!continuing) status.textContent = 'Buffering… You can skip to the game at any time.';
  });
  listen(video, 'timeupdate', () => {
    const seconds = Math.max(0, Math.floor(video.currentTime || 0));
    el('.film-time').textContent =
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    el('.film-progress i').style.transform =
      `scaleX(${Number.isFinite(video.duration) && video.duration > 0 ? Math.min(1, video.currentTime / video.duration) : 0})`;
  });
  listen(doc, 'visibilitychange', () => {
    if (doc.hidden) pauseVideo();
  });
  listen(win, 'pagehide', pauseVideo);
  listen(doc, 'keydown', (event) => {
    const key = event as KeyboardEvent;
    if (key.key === 'Escape') {
      key.preventDefault();
      key.stopPropagation();
      void continueToGame();
    }
    if (key.key === 'Tab') {
      const buttons = Array.from(layer.querySelectorAll<HTMLButtonElement>('button')).filter(
        (button) => !button.disabled && !button.closest('[hidden]'),
      );
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (!first) {
        key.preventDefault();
        return;
      }
      if (key.shiftKey && (doc.activeElement === first || !layer.contains(doc.activeElement))) {
        key.preventDefault();
        last.focus();
      } else if (
        !key.shiftKey &&
        (doc.activeElement === last || !layer.contains(doc.activeElement))
      ) {
        key.preventDefault();
        first.focus();
      }
    }
  });
  parent.append(layer);
  watch.focus();
  return { dispose };
}
