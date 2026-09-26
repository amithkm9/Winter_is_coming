import { LEVELS, isMissionChapter, type MissionChapter, type LevelConfig } from './levels.ts';
/** Deterministic mission rules. Proximity, visuals, input capture and provider APIs live outside this class. */
export type WinterPhase = 'briefing' | 'explore' | 'terminal' | 'caught' | 'liberating' | 'complete';
export type WinterSign = 'A' | 'B' | 'C' | '1' | '2' | '3';
export type WinterInputSource = 'keyboard' | 'camera';
export type RelayId = 0 | 1 | 2;

export interface WinterMissionState {
  readonly chapter: MissionChapter;
  readonly phase: WinterPhase;
  readonly completed: readonly RelayId[];
  readonly activeRelay: RelayId | null;
  readonly sequence: readonly WinterSign[];
  readonly step: number;
  readonly alert: number;
  readonly captureSecondsRemaining: number;
  readonly elapsed: number;
  readonly mistakes: number;
  readonly liberation: number;
  readonly message: string;
  readonly respawns: number;
  readonly lastSource: WinterInputSource | null;
}

export const RELAY_SEQUENCES = LEVELS.louvre.sequences;
export const LIBERATION_SECONDS = 8;
export const CAPTURE_SECONDS = 5;
const SIGNS = new Set<string>(['A', 'B', 'C', '1', '2', '3']);
const isRelay = (id: unknown): id is RelayId => Number.isInteger(id) && (id === 0 || id === 1 || id === 2);
const counter = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function initial(config: LevelConfig): WinterMissionState {
  return { chapter: config.id, phase: 'briefing', completed: [], activeRelay: null, sequence: [], step: 0,
    alert: 0, captureSecondsRemaining: CAPTURE_SECONDS, elapsed: 0, mistakes: 0, liberation: 0, respawns: 0, lastSource: null,
    message: config.arrival };
}

/** Inputs are game ciphers. A keyboard event never claims verified sign-language recognition. */
export class WinterMission {
  private current: WinterMissionState;
  private readonly config: LevelConfig;

  constructor(chapter: MissionChapter = 'louvre') {
    if (!isMissionChapter(chapter)) throw new TypeError('Unknown mission chapter.');
    this.config = LEVELS[chapter]; this.current = initial(this.config);
  }

  get chapter(): MissionChapter { return this.config.id; }

  get state(): WinterMissionState {
    return Object.freeze({ ...this.current, completed: Object.freeze([...this.current.completed]), sequence: Object.freeze([...this.current.sequence]) });
  }

  reset(): boolean { this.current = initial(this.config); return true; }

  start(): boolean {
    if (this.current.phase !== 'briefing') return false;
    this.current = { ...this.current, phase: 'explore', message: this.config.arrival };
    return true;
  }

  canEnterRelay(id: number): boolean {
    return isRelay(id) && ['explore', 'terminal'].includes(this.current.phase) && !this.current.completed.includes(id)
      && (!this.config.ordered || id === this.current.completed.length);
  }

  enterRelay(id: number): boolean {
    if (!isRelay(id) || !this.canEnterRelay(id)) return false;
    if (this.current.activeRelay === id) return true;
    this.current = { ...this.current, phase: 'terminal', activeRelay: id, sequence: this.config.sequences[id], step: 0,
      message: `Relay ${id + 1} linked. Enter cipher ${this.config.sequences[id].join(' → ')}.` };
    return true;
  }

  exitRelay(): boolean {
    if (this.current.phase !== 'terminal') return false;
    this.current = { ...this.current, phase: 'explore', activeRelay: null, sequence: [], step: 0,
      message: 'Terminal disconnected. Completed relays remain liberated.' };
    return true;
  }

  submit(sign: string, source: WinterInputSource = 'keyboard'): boolean {
    if (this.current.phase !== 'terminal' || this.current.activeRelay === null || !SIGNS.has(sign) || !['keyboard', 'camera'].includes(source)) return false;
    if (sign !== this.current.sequence[this.current.step]) {
      this.current = { ...this.current, step: 0, mistakes: this.current.mistakes + 1, lastSource: source,
        message: 'Cipher interrupted. Begin the sequence again. The completed relays are safe.' };
      return false;
    }
    const next = this.current.step + 1;
    if (next < this.current.sequence.length) {
      this.current = { ...this.current, step: next, lastSource: source, message: 'Cipher fragment accepted. Continue the sequence.' };
      return true;
    }
    const id = this.current.activeRelay;
    const completed = [...this.current.completed, id];
    this.current = { ...this.current, completed, phase: 'explore', activeRelay: null, sequence: [], step: 0, lastSource: source,
      message: completed.length === 3 ? `All three relays are free. Reach the ${this.config.coreName} and restore power.`
        : this.config.ordered ? `Relay ${id + 1} restored. The path opens to relay ${completed.length + 1}.` : `Relay ${id + 1} liberated. ${3 - completed.length} remaining.` };
    return true;
  }

  tick(dtSeconds: number, insideDroneScan: boolean): WinterMissionState {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || ['briefing', 'caught', 'complete'].includes(this.current.phase)) return this.state;
    // The renderer should stop ticking when paused. Long valid steps still advance cinematics accurately.
    const elapsed = this.current.elapsed + dtSeconds;
    if (!Number.isFinite(elapsed)) return this.state;
    if (this.current.phase === 'liberating') {
      const liberation = Math.min(1, this.current.liberation + dtSeconds / LIBERATION_SECONDS);
      this.current = { ...this.current, elapsed, liberation, phase: liberation === 1 ? 'complete' : 'liberating',
        message: liberation === 1 ? this.config.completion : 'Resistance signal spreading. The ice is losing its hold.' };
      return this.state;
    }
    // Only uninterrupted exposure counts. Changing between movement and a terminal offers no extra time.
    const remaining = insideDroneScan ? Math.max(0, this.current.captureSecondsRemaining - dtSeconds) : CAPTURE_SECONDS;
    if (remaining <= 1e-9) {
      this.current = { ...this.current, elapsed, alert: 100, captureSecondsRemaining: 0, phase: 'caught', activeRelay: null, sequence: [], step: 0,
        respawns: this.current.respawns + 1, message: 'Caught by surveillance. Retry from your checkpoint; restored relays and memories are safe.' };
    } else this.current = { ...this.current, elapsed, captureSecondsRemaining: remaining, alert: (CAPTURE_SECONDS - remaining) * 100 / CAPTURE_SECONDS };
    return this.state;
  }

  /** The scene moves the player to its checkpoint only after this explicit retry succeeds. */
  retryFromCheckpoint(): boolean {
    if (this.current.phase !== 'caught') return false;
    this.current = { ...this.current, phase: 'explore', alert: 0, captureSecondsRemaining: CAPTURE_SECONDS,
      message: 'Back at your checkpoint. Your restored relays are safe. Move out of scanner light before the countdown ends.' };
    return true;
  }

  finishAtCore(): boolean {
    if (this.current.phase !== 'explore' || this.current.completed.length !== 3) return false;
    this.current = { ...this.current, phase: 'liberating', alert: 0, captureSecondsRemaining: CAPTURE_SECONDS, liberation: 0, message: 'Core override accepted. Let there be light.' };
    return true;
  }

  serialize(): string {
    // A partial cipher is discarded; caught saves resume safely instead of reopening the capture screen.
    const caught = this.current.phase === 'caught';
    return JSON.stringify({ version: 1, chapter: this.chapter, mission: `${this.chapter}-three-relays`, phase: this.current.phase === 'terminal' || caught ? 'explore' : this.current.phase,
      completed: [...this.current.completed], alert: caught ? 0 : this.current.alert,
      captureSecondsRemaining: caught ? CAPTURE_SECONDS : this.current.captureSecondsRemaining, elapsed: this.current.elapsed,
      mistakes: this.current.mistakes, liberation: this.current.liberation, respawns: this.current.respawns, lastSource: this.current.lastSource });
  }

  restore(raw: string): boolean {
    try {
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return false;
      const s = saved as Record<string, unknown>;
      if (s.version !== 1 || s.mission !== `${this.chapter}-three-relays` || !['briefing', 'explore', 'liberating', 'complete'].includes(String(s.phase))) return false;
      if (s.chapter !== this.chapter && !(s.chapter === undefined && this.chapter === 'louvre')) return false;
      if (!Array.isArray(s.completed) || s.completed.length > 3 || s.completed.some(id => !isRelay(id)) || new Set(s.completed).size !== s.completed.length) return false;
      if (this.config.ordered && s.completed.some((id, index) => id !== index)) return false;
      if (!finite(s.alert) || s.alert >= 100 || !finite(s.elapsed) || !finite(s.liberation) || s.liberation > 1 || !counter(s.mistakes) || !counter(s.respawns)) return false;
      // Old version-one saves contain only alert. Convert that progress into the new countdown.
      const captureSecondsRemaining = s.captureSecondsRemaining === undefined ? CAPTURE_SECONDS * (1 - s.alert / 100) : s.captureSecondsRemaining;
      if (!finite(captureSecondsRemaining) || captureSecondsRemaining <= 0 || captureSecondsRemaining > CAPTURE_SECONDS
        || Math.abs(s.alert - 100 * (1 - captureSecondsRemaining / CAPTURE_SECONDS)) > 1e-7) return false;
      if (s.lastSource !== null && s.lastSource !== 'keyboard' && s.lastSource !== 'camera') return false;
      if ((s.phase === 'liberating' || s.phase === 'complete') && s.completed.length !== 3) return false;
      if (s.phase === 'complete' && s.liberation !== 1) return false;
      if (s.phase === 'liberating' && (s.liberation >= 1 || s.alert !== 0)) return false;
      if ((s.phase === 'briefing' || s.phase === 'explore') && s.liberation !== 0) return false;
      if (s.phase === 'briefing' && (s.completed.length || s.elapsed || s.mistakes || s.respawns || s.alert || s.lastSource !== null)) return false;
      this.current = { chapter: this.chapter, phase: s.phase as WinterPhase, completed: [...s.completed] as RelayId[], activeRelay: null, sequence: [], step: 0,
        alert: s.alert, captureSecondsRemaining, elapsed: s.elapsed, mistakes: s.mistakes, liberation: s.liberation, respawns: s.respawns,
        lastSource: s.lastSource as WinterInputSource | null,
        message: s.phase === 'complete' ? this.config.completion : s.phase === 'liberating' ? 'Resistance signal spreading. The ice is losing its hold.'
          : this.config.ordered && s.completed.length < 3 ? `Resistance uplink restored. Continue at relay ${s.completed.length + 1}.` : 'Resistance uplink restored. Completed relays are safe.' };
      return true;
    } catch { return false; }
  }
}

export default WinterMission;
