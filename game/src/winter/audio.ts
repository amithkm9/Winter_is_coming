/** Original procedural audio. No downloads, microphones or provider keys. */
export type WinterSound = 'start' | 'select' | 'error' | 'relay' | 'win' | 'step' | 'pickup' | 'danger' | 'terminal';
export interface WinterAudioSettings { enabled: boolean; music: boolean; volume: number }
export interface WinterAudioFrame { walking: boolean; running: boolean; alert: number; liberation: number; active: boolean }
type Voice = { source: AudioScheduledSourceNode; nodes: AudioNode[]; ambient: boolean };

/** Call unlock() directly from a click/key gesture, including after pause.
 * update() never resumes a context: title/hidden pages cannot restart audio.
 */
export class WinterAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: WinterAudioSettings = { enabled: true, music: true, volume: .45 };
  private readonly voices = new Set<Voice>();
  private wind: { voice: Voice; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private pads: { voice: Voice; gain: GainNode; oscillator: OscillatorNode; base: number }[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private paused = false;
  private hidden = typeof document !== 'undefined' && document.hidden;
  private active = false;
  private disposed = false;
  private stepClock = 0;
  private dangerClock = 0;
  private lastStep = -Infinity;
  private lastDanger = -Infinity;
  private readonly maxVoices = 28;
  private readonly visibility = () => {
    this.hidden = document.hidden;
    if (this.hidden) this.silence();
    // Visibility returning is not an autoplay permission or an unpause gesture.
  };

  constructor(private readonly makeContext: () => AudioContext = () => new AudioContext()) {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.visibility);
  }

  async unlock(): Promise<void> {
    if (this.disposed || this.hidden || this.paused || !this.settings.enabled) return;
    try {
      if (!this.context) {
        this.context = this.makeContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.settings.volume;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      // A hide/pause may occur while the browser processes resume().
      if (this.disposed || this.hidden || this.paused || !this.settings.enabled) this.silence();
    } catch { /* Unsupported/blocked Web Audio leaves a fully playable silent game. */ }
  }

  configure(settings: WinterAudioSettings): void {
    this.settings = { enabled: Boolean(settings.enabled), music: Boolean(settings.music),
      volume: Number.isFinite(settings.volume) ? Math.max(0, Math.min(.8, settings.volume)) : .45 };
    if (!this.settings.enabled || this.settings.volume === 0) { this.silence(); return; }
    if (this.master && this.context && !this.disposed) {
      this.master.gain.setTargetAtTime(this.settings.volume, this.context.currentTime, .03);
    }
    if (!this.settings.music) this.stopPads();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.silence();
  }

  play(kind: WinterSound): void {
    if (!this.canPlay() || (!this.active && kind !== 'start')) return;
    const now = this.context!.currentTime;
    switch (kind) {
      case 'step':
        if (now - this.lastStep < .18) return;
        this.lastStep = now;
        this.noise(now, .13, .075, 1300, 'lowpass');
        this.tone(88, now, .1, .018, 'sine');
        break;
      case 'danger':
        if (now - this.lastDanger < 1.6) return;
        this.lastDanger = now;
        this.tone(370, now, .2, .055, 'triangle', 330);
        this.tone(370, now + .24, .2, .045, 'triangle', 330);
        break;
      case 'error':
        this.tone(165, now, .2, .07, 'triangle', 120);
        this.tone(110, now + .1, .28, .035, 'sine');
        break;
      case 'select':
        this.tone(740, now, .11, .045, 'sine');
        this.tone(1110, now + .05, .17, .026, 'sine');
        break;
      case 'terminal':
        this.tone(220, now, .32, .045, 'triangle', 440);
        this.tone(660, now + .12, .38, .035, 'sine');
        break;
      case 'pickup':
        [880, 1174.66, 1760].forEach((pitch, i) => this.tone(pitch, now + i * .055, .32, .035, 'sine'));
        break;
      case 'start':
        [146.83, 220, 293.66].forEach((pitch, i) => this.tone(pitch, now + i * .13, 1.05, .043, 'sine'));
        break;
      case 'relay':
        [220, 277.18, 329.63, 440].forEach((pitch, i) => this.tone(pitch, now + i * .055, 1.45, .043, 'sine', undefined, .13));
        this.noise(now, .5, .027, 1600, 'bandpass');
        break;
      case 'win':
        [146.83, 220, 293.66, 369.99, 440, 587.33].forEach((pitch, i) => this.tone(pitch, now + i * .11, 3.5, .045, 'sine', undefined, .65));
        this.noise(now + .15, 1.7, .05, 900, 'lowpass', .5);
        break;
    }
  }

  update(dt: number, frame: WinterAudioFrame): void {
    if (this.disposed) return;
    const wasActive = this.active;
    this.active = Boolean(frame.active);
    if (!this.active) {
      if (wasActive || this.voices.size) this.silence();
      return;
    }
    if (!this.canPlay()) return;
    const delta = Number.isFinite(dt) ? Math.max(0, Math.min(.1, dt)) : 0;
    const liberation = Number.isFinite(frame.liberation) ? Math.max(0, Math.min(1, frame.liberation)) : 0;
    const alert = Number.isFinite(frame.alert) ? Math.max(0, Math.min(100, frame.alert)) : 0;
    this.ensureAmbience();
    const now = this.context!.currentTime;
    if (this.wind) {
      this.wind.gain.gain.setTargetAtTime(.033 * (1 - liberation * .55), now, 1);
      this.wind.filter.frequency.setTargetAtTime(380 + alert * 3, now, .8);
    }
    for (const pad of this.pads) {
      pad.gain.gain.setTargetAtTime(.009 + liberation * .009, now, 1.5);
      // Open fifth becomes a warmer major harmony as the sector returns to life.
      pad.oscillator.frequency.setTargetAtTime(pad.base === 110 ? 110 : 164.81 + liberation * 19.99, now, 2);
    }
    if (frame.walking) {
      this.stepClock += delta;
      const interval = frame.running ? .3 : .46;
      if (this.stepClock >= interval) { this.stepClock %= interval; this.play('step'); }
    } else this.stepClock = 0;
    if (alert >= 35 && liberation < 1) {
      this.dangerClock += delta;
      const interval = alert > 75 ? 1.8 : 3.2;
      if (this.dangerClock >= interval) { this.dangerClock = 0; this.play('danger'); }
    } else this.dangerClock = 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.visibility);
    this.stopVoices();
    this.master?.disconnect();
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.master = null; this.noiseBuffer = null; this.context = null;
  }

  private canPlay(): boolean {
    return !this.disposed && !this.paused && !this.hidden && this.settings.enabled && this.settings.volume > 0
      && this.context?.state === 'running';
  }

  private silence(): void {
    this.stopVoices();
    this.stepClock = 0; this.dangerClock = 0;
    this.lastStep = -Infinity; this.lastDanger = -Infinity;
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }

  private stopVoice(voice: Voice): void {
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* Already ended or never started. */ }
    for (const node of voice.nodes) node.disconnect();
    this.voices.delete(voice);
  }

  private stopVoices(): void {
    for (const voice of [...this.voices]) this.stopVoice(voice);
    this.wind = null; this.pads = [];
  }

  private stopPads(): void {
    for (const pad of this.pads) this.stopVoice(pad.voice);
    this.pads = [];
  }

  private register(source: AudioScheduledSourceNode, nodes: AudioNode[], ambient = false): Voice {
    if (this.voices.size >= this.maxVoices) {
      const oldest = [...this.voices].find(voice => !voice.ambient);
      if (oldest) this.stopVoice(oldest);
    }
    const voice = { source, nodes, ambient };
    this.voices.add(voice);
    source.onended = () => {
      for (const node of nodes) node.disconnect();
      this.voices.delete(voice);
    };
    return voice;
  }

  private tone(frequency: number, start: number, duration: number, level: number, type: OscillatorType,
    endFrequency?: number, attack = .015): void {
    const context = this.context!;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(this.master!);
    this.register(oscillator, [oscillator, gain]);
    oscillator.start(start); oscillator.stop(start + duration + .03);
  }

  private noise(start: number, duration: number, level: number, frequency: number,
    type: BiquadFilterType, attack = .018): void {
    const context = this.context!;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = this.getNoise(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = .65;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master!);
    this.register(source, [source, filter, gain]);
    source.start(start); source.stop(start + duration + .03);
  }

  private getNoise(): AudioBuffer {
    if (!this.noiseBuffer) {
      const rate = this.context!.sampleRate;
      this.noiseBuffer = this.context!.createBuffer(1, rate * 2, rate);
      const samples = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }

  private ensureAmbience(): void {
    const context = this.context!;
    if (!this.wind) {
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = this.getNoise(); source.loop = true;
      filter.type = 'lowpass'; filter.frequency.value = 380; gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(this.master!);
      const voice = this.register(source, [source, filter, gain], true);
      this.wind = { voice, gain, filter }; source.start();
    }
    if (this.settings.music && !this.pads.length) {
      for (const base of [110, 164.81]) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = base; gain.gain.value = 0;
        oscillator.connect(gain); gain.connect(this.master!);
        const voice = this.register(oscillator, [oscillator, gain], true);
        this.pads.push({ voice, gain, oscillator, base }); oscillator.start();
      }
    }
  }
}
