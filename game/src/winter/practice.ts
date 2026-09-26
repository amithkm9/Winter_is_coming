/** A local rehearsal of fictional cipher inputs; it never receives or changes mission progress. */
export type PracticeInputSource = 'keyboard' | 'camera';

export interface WinterPracticeState {
  readonly active: boolean;
  readonly sequence: readonly string[];
  readonly step: number;
  readonly complete: boolean;
  readonly message: string;
  readonly lastSource: PracticeInputSource | null;
}

const CIPHERS = new Set(['A', 'B', 'C', '1', '2', '3']);
const idle = (): WinterPracticeState => ({ active: false, sequence: [], step: 0, complete: false,
  message: 'Choose a relay cipher to rehearse. Practice does not restore relays.', lastSource: null });

export class WinterPractice {
  private current: WinterPracticeState = idle();

  get state(): WinterPracticeState {
    return Object.freeze({ ...this.current, sequence: Object.freeze([...this.current.sequence]) });
  }

  begin(sequence: readonly string[]): void {
    if (!Array.isArray(sequence) || sequence.length === 0 || Array.from(sequence).some(sign => typeof sign !== 'string' || !CIPHERS.has(sign))) {
      this.current = { ...idle(), message: 'No supported cipher sequence is available. Rehearsal uses A, B, C, 1, 2 and 3.' };
      return;
    }
    this.current = { active: true, sequence: [...sequence], step: 0, complete: false, lastSource: null,
      message: `Rehearse ${sequence.join(' → ')}. Send ${sequence[0]} first. Practice does not restore relays.` };
  }

  submit(sign: string, source: PracticeInputSource): boolean {
    if (!this.current.active || this.current.complete || !CIPHERS.has(sign) || (source !== 'keyboard' && source !== 'camera')) return false;
    const expected = this.current.sequence[this.current.step];
    const label = source === 'keyboard' ? 'Simulated input' : 'Experimental model input';
    if (sign !== expected) {
      this.current = { ...this.current, lastSource: source,
        message: `${label} received: ${sign}. Try ${expected} again; your practice progress is kept.` };
      return false;
    }
    const step = this.current.step + 1;
    const complete = step === this.current.sequence.length;
    this.current = { ...this.current, step, complete, lastSource: source,
      message: complete ? `${label} received: ${sign}. Rehearsal complete. Return to the terminal when you’re ready.`
        : `${label} received: ${sign}. Next, send ${this.current.sequence[step]}.` };
    return true;
  }

  stop(): void { this.current = idle(); }
}

export default WinterPractice;
