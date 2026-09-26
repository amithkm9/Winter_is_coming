import { CHARACTERS, getCharacter, type CharacterId } from './characters';
import { CHAPTERS, type ChapterId, type WinterCampaign } from './campaign';
import './journey.css';

interface JourneyActions {
  choose(id: CharacterId): void;
  launch(id: ChapterId): void;
  close(): void;
}

/** The chapter map only launches chapters whose implementation is available. */
export function createJourneyUI(parent: HTMLElement, campaign: WinterCampaign, actions: JourneyActions) {
  const root = document.createElement('section');
  root.className = 'journey'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'journey-title'); parent.append(root);
  let screen: 'characters' | 'map' = 'characters';
  let selected: CharacterId = campaign.state.character;
  let chapter: ChapterId = 'academy';
  let priorFocus: HTMLElement | null = null;
  const find = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const header = (step: string) => `<header class="journey-header"><button class="journey-back" id="journey-back">← BACK</button><div class="journey-brand">WINTER <span>IS COMING</span></div><span class="journey-step">${step}</span></header>`;

  function reveal() { if (root.hidden) priorFocus = document.activeElement as HTMLElement; root.hidden = false; }
  function hide() { root.hidden = true; priorFocus?.focus(); }
  function back() { if (screen === 'map') showCharacters(); else { hide(); actions.close(); } }
  function showCharacters() {
    screen = 'characters'; selected = campaign.state.character; reveal();
    root.innerHTML = `${header('01 / CHOOSE YOUR STUDENT')}
      <div class="journey-heading"><span class="eyebrow">THREE STORIES. ONE CITY TO SAVE.</span><h1 id="journey-title">Every adventure begins<br>with <em>someone like you.</em></h1><p>Choose the student whose story feels like yours. All three have the same abilities.</p></div>
      <div class="student-roster" role="radiogroup" aria-label="Choose a student">${CHARACTERS.map((person, i) => `
        <button class="student-card" id="choose-${person.id}" role="radio" aria-checked="${person.id === selected}" tabindex="${person.id === selected ? 0 : -1}" style="--student-accent:${person.accent}" data-student="${person.id}">
          <div class="student-card-top"><span>STUDENT 0${i + 1}</span><span class="selection-tick">✓</span></div>
          <img src="${person.portrait}" alt="${person.name} in their winter exploration outfit" draggable="false">
          <div class="student-caption"><span>${person.title}</span><h2>${person.name}</h2><p>“${person.quote}”</p></div>
        </button>`).join('')}</div>
      <footer class="roster-footer"><div><div class="eyebrow" id="chosen-title"></div><p id="chosen-description"></p></div><button class="journey-primary" id="confirm-student">CONTINUE WITH <span id="chosen-name"></span> <b>→</b></button></footer>`;
    function select(id: CharacterId, focus = false) {
      selected = id; const person = getCharacter(id);
      for (const other of CHARACTERS) { const button = find(`choose-${other.id}`); button.setAttribute('aria-checked', String(other.id === id)); button.tabIndex = other.id === id ? 0 : -1; }
      find('chosen-title').textContent = `${person.name.toUpperCase()} / ${person.title.toUpperCase()}`;
      find('chosen-description').textContent = person.description; find('chosen-name').textContent = person.name.toUpperCase();
      root.style.setProperty('--journey-accent', person.accent); if (focus) find(`choose-${id}`).focus();
    }
    for (const person of CHARACTERS) find(`choose-${person.id}`).onclick = () => select(person.id);
    root.querySelector('.student-roster')!.addEventListener('keydown', (raw) => {
      const event = raw as KeyboardEvent;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const at = CHARACTERS.findIndex(c => c.id === selected);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (at + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + 3) % 3;
      select(CHARACTERS[next].id, true);
    });
    find('journey-back').onclick = back;
    find('confirm-student').onclick = () => { actions.choose(selected); showMap(); };
    select(selected); find(`choose-${selected}`).focus();
  }

  function showMap(preferred?: ChapterId) {
    screen = 'map'; reveal();
    chapter = preferred ?? CHAPTERS.find(c => campaign.status(c.id) === 'available' && (c.id !== 'academy' || !campaign.state.tutorialSkipped))?.id ?? 'spire';
    const person = getCharacter(campaign.state.character);
    const route = CHAPTERS.map(c => `${c.position[0]},${c.position[1]}`).join(' ');
    root.innerHTML = `${header('02 / CHOOSE YOUR CHAPTER')}
      <div class="map-heading"><div><span class="eyebrow">THE RESISTANCE JOURNEY</span><h1 id="journey-title">Bring back <em>the light.</em></h1><p>One small act of courage can change a city.</p></div><button class="map-student" id="change-student"><img src="${person.portrait}" alt=""><span>${person.name}<small>CHANGE STUDENT ↗</small></span></button></div>
      <div class="campaign-layout"><div class="campaign-map" aria-label="Chapter route, a fictional schematic of Paris">
        <div class="map-coordinates">PARIS / RESISTANCE ROUTE<br>FICTIONAL SECTORS · NOT TO SCALE</div>
        <svg class="map-landscape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="map-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="#bad4db" stroke-opacity=".05" stroke-width=".1"/></pattern></defs><rect width="100" height="100" fill="url(#map-grid)"/><path d="M-10 78C10 70 26 92 39 72S63 80 72 53S85 28 111 36" fill="none" stroke="#173d51" stroke-width="7"/><path d="M-10 78C10 70 26 92 39 72S63 80 72 53S85 28 111 36" fill="none" stroke="#5a8ca3" stroke-opacity=".3" stroke-width=".3"/><polyline points="${route}" fill="none" stroke="#e6bf89" stroke-opacity=".55" stroke-width=".45" stroke-dasharray="1.1 1.4"/></svg>
        ${CHAPTERS.map(c => { const status = campaign.status(c.id); return `<button class="chapter-node ${status}" id="chapter-${c.id}" style="left:${c.position[0]}%;top:${c.position[1]}%" aria-label="Chapter ${c.number}: ${c.title}, ${status}"><span class="node-medallion">${status === 'completed' ? '✓' : c.number}</span><span class="node-title">${c.title}</span><small>${status === 'planned' ? 'PLANNED' : status === 'locked' ? 'LOCKED' : status === 'completed' ? 'COMPLETED' : 'READY TO PLAY'}</small></button>`; }).join('')}
        <div class="map-legend"><i></i> SIX PLAYABLE CHAPTERS <span>✦</span> COMPLETE EACH CHAPTER TO OPEN THE NEXT</div></div>
      <aside class="chapter-detail" aria-live="polite"><div class="chapter-kicker" id="detail-number"></div><div class="chapter-emblem" id="detail-emblem" aria-hidden="true"></div><h2 id="detail-title"></h2><p class="chapter-subtitle" id="detail-subtitle"></p><p id="detail-description"></p><dl><div><dt>YOUR MISSION</dt><dd id="detail-objective"></dd></div><div><dt>WHAT YOU’LL DO</dt><dd id="detail-mechanic"></dd></div><div><dt>YOUR REWARD</dt><dd id="detail-reward"></dd></div></dl><button class="journey-primary" id="launch-chapter"></button><p class="chapter-availability" id="detail-availability"></p></aside></div>`;
    const icons: Record<ChapterId, string> = { academy: '✦', louvre: '◇', canal: '≈', glasshouse: '❋', observatory: '✧', spire: '△' };
    function select(id: ChapterId) {
      chapter = id; const data = CHAPTERS.find(c => c.id === id)!; const status = campaign.status(id);
      CHAPTERS.forEach(c => { const node = find(`chapter-${c.id}`); node.classList.toggle('selected', c.id === id); node.setAttribute('aria-pressed', String(c.id === id)); });
      for (const [key, value] of Object.entries({ number: `CHAPTER ${data.number} / ${status.toUpperCase()}`, title: data.title, subtitle: data.subtitle, description: data.description, objective: data.objective, mechanic: data.mechanic, reward: data.reward, emblem: icons[id] })) find(`detail-${key}`).textContent = value;
      const button = find<HTMLButtonElement>('launch-chapter'); button.disabled = status === 'planned' || status === 'locked';
      const previous = CHAPTERS[Math.max(0, CHAPTERS.findIndex(c => c.id === id) - 1)];
      button.textContent = status === 'planned' ? 'PLANNED CHAPTER' : status === 'locked' ? `COMPLETE ${previous.title.toUpperCase()}` : id === 'academy' ? 'ENTER GUIDED TRAINING →' : `${status === 'completed' ? 'RETURN TO' : 'ENTER'} ${data.title.toUpperCase()} →`;
      find('detail-availability').textContent = status === 'planned' ? 'This chapter is not available in this build.' : status === 'locked' ? `Complete ${previous.title} to open this chapter.` : id === 'academy' ? 'A safe courtyard training simulation. Camera is optional; keyboard input works throughout.' : 'A playable operation with its own saved relay progress. Keyboard or experimental camera inputs can complete every cipher.';
    }
    CHAPTERS.forEach(c => find(`chapter-${c.id}`).onclick = () => select(c.id));
    find('launch-chapter').onclick = () => { const status = campaign.status(chapter); if (status !== 'available' && status !== 'completed') return; hide(); actions.launch(chapter); };
    find('journey-back').onclick = back; find('change-student').onclick = showCharacters;
    root.style.setProperty('--journey-accent', person.accent); select(chapter); find(`chapter-${chapter}`).focus();
  }
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); back(); return; }
    if (event.key !== 'Tab') return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled)')).filter(el => el.tabIndex >= 0);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  return { showCharacters, showMap, hide, get open() { return !root.hidden; }, dispose() { root.remove(); } };
}
