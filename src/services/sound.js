/**
 * Web Audio API Procedural Sound Engine 2.0
 * Provides futuristic Cyberpunk SFX, laser charges, sub-bass impacts, and cinematic ambient synth textures.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ambientPlaying = false;
    this.ambientGain = null;
    this.oscList = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (this.enabled && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    }
    return this.enabled;
  }

  // Laser / UI Click
  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Vision Gesture Detected Ping
  playGestureDetect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Laser hold charging sound (Pitch ramps upward)
  playHoldTick(progress) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 380 + progress * 850; // Pitch rises dramatically
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Success / District Liberated (Arpeggio Fanfare + Sub-bass Boom)
  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Sub-bass impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, this.ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.6);
    subGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start();
    subOsc.stop(this.ctx.currentTime + 0.6);

    // Arpeggiated chime
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C Major 9
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + idx * 0.07);
      osc.stop(this.ctx.currentTime + idx * 0.07 + 0.45);
    });
  }

  // Error / AI Hack Alarm
  playFail() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.setValueAtTime(140, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Cinematic Cyberpunk Ambient Synth Drone
  startAmbient() {
    if (this.ambientPlaying) return;
    this.init();
    if (!this.ctx) return;

    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.enabled ? 0.05 : 0, this.ctx.currentTime);

      // Deep atmospheric drone triad (A1, E2, C3)
      const freqs = [55, 82.41, 130.81, 220];
      freqs.forEach(f => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240, this.ctx.currentTime);

        osc.connect(filter);
        filter.connect(this.ambientGain);
        osc.start();
        this.oscList.push(osc);
      });

      this.ambientGain.connect(this.ctx.destination);
      this.ambientPlaying = true;
    } catch (e) {
      console.warn("Audio autoplay blocked until user gesture", e);
    }
  }
}

export const sound = new SoundEngine();

