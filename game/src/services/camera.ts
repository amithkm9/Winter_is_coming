import { API_BASE, API_HEADERS } from './api';
import { GestureGate } from './gesture-gate';
import { emit, type Sign } from '../game/contracts';
import type { HandLandmarker } from '@mediapipe/tasks-vision';

const FRAME_COUNT = 30;
const FRAME_GAP_MS = 300;
const INPUT_LABELS = new Set(['A', 'B', 'C', '1', '2', '3']);
type Landmark = { x: number; y: number; z: number };

export class CameraController {
  private stream: MediaStream | null = null;
  private detector: HandLandmarker | null = null;
  private timer = 0;
  private frames: number[][][] = [];
  private pending = false;
  private lastInference = -Infinity;
  private lastVideoTime = -1;
  private lastFrameAt = -Infinity;
  private generation = 0;
  private continuity = 0;
  private requestSerial = 0;
  private gate = new GestureGate();
  private running = false;
  private startup: AbortController | null = null;
  private inference: AbortController | null = null;
  private statusUntil = 0;
  private lastStatus = '';
  constructor(private video: HTMLVideoElement, private canvas: HTMLCanvasElement, private status: (text: string) => void) {}
  get enabled(): boolean { return this.running; }
  get starting(): boolean { return this.startup !== null; }
  get previewEnabled(): boolean { return this.stream !== null; }

  /** Clear the previous interaction's input while preserving the camera stream. */
  resetRecognition(): void {
    this.continuity++; this.requestSerial++; this.inference?.abort(); this.inference = null;
    this.frames = []; this.pending = false; this.lastInference = -Infinity; this.lastVideoTime = -1;
    this.lastFrameAt = -Infinity; this.gate.reset(); this.statusUntil = 0;
    if (this.running) this.report('Ready for a new input. Hold one hand clearly inside the camera view.');
  }

  async start(): Promise<boolean> {
    this.stop();
    const generation = this.generation;
    const startup = new AbortController(); this.startup = startup;
    let stage: 'camera' | 'preview' | 'model' | 'tracking' = 'camera';
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost. On this laptop, open http://127.0.0.1:5173/ instead of a network IP address.');
      this.report('Allow camera access in the browser prompt. Microphone is not requested.');
      // Request permission directly from the player's click, before model/WASM loading.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 }, facingMode: { ideal: 'user' } }, audio: false });
      } catch (error) {
        if (generation !== this.generation) return false;
        if (!(error instanceof Error) || error.name !== 'OverconstrainedError') throw error;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return false; }
      this.stream = stream; this.video.srcObject = stream;
      this.video.muted = true; this.video.playsInline = true;
      stage = 'preview';
      await this.video.play();
      if (generation !== this.generation) return false;
      for (const track of stream.getVideoTracks()) track.addEventListener('ended', () => {
        if (generation !== this.generation) return;
        this.stop(); this.report('The camera disconnected or permission was revoked. Reconnect it, allow camera access, and choose RESTART CAMERA.', 0, true);
      }, { once: true });
      stage = 'model';
      this.report('Camera connected. Preparing sign recognition…');
      const response = await fetch(`${API_BASE}/api/recognition/warmup`, { method: 'POST', headers: API_HEADERS, signal: AbortSignal.any([startup.signal, AbortSignal.timeout(45000)]) });
      if (generation !== this.generation) return false;
      const result = await response.json().catch(() => null) as { ready?: boolean; detail?: string } | null;
      if (generation !== this.generation) return false;
      if (!response.ok || result?.ready !== true) throw new Error(result?.detail && typeof result.detail === 'string' ? result.detail.slice(0, 240) : 'The recognition service is not ready. Start the backend and check its model setup.');
      stage = 'tracking';
      this.report('Camera connected. Loading hand tracking…');
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      if (generation !== this.generation) return false;
      const base = import.meta.env?.BASE_URL || './';
      const files = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
      if (generation !== this.generation) return false;
      const detector = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${base}mediapipe/hand_landmarker.task` },
        runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: .65, minHandPresenceConfidence: .65,
      });
      if (generation !== this.generation) { detector.close(); return false; }
      this.detector = detector;
      this.running = true; this.report('Camera ready. Hold one hand in view. Model labels remain experimental.');
      emit('ls:camera', { enabled: true }); this.loop(generation); return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      const previewAvailable = this.stream !== null && (stage === 'model' || stage === 'tracking');
      if (!previewAvailable) this.stop();
      const name = error instanceof Error ? error.name : '';
      const detail = name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Camera permission is blocked. Use the site controls beside the browser address to allow Camera. On Mac, also allow this browser in System Settings → Privacy & Security → Camera, then restart the browser if requested.'
        : name === 'NotFoundError' ? 'No camera was found. Connect a webcam and try again.'
        : name === 'NotReadableError' || name === 'AbortError' ? 'The camera could not start. Close other camera apps or video calls, check the camera privacy switch, then retry.'
        : name === 'TimeoutError' ? 'The recognition service took too long to start. Check the backend on port 8100, then retry.'
        : error instanceof TypeError ? stage === 'model' ? 'Could not reach the recognition service. Check the backend on port 8100, then retry.' : stage === 'tracking' ? 'Hand tracking could not load. Reload the page, then retry.' : 'The browser could not open the camera. Check camera permissions, then retry.'
        : error instanceof Error ? error.message : 'Camera startup failed.';
      this.report(`${previewAvailable ? 'Preview is live, but sign recognition is not ready. ' : ''}${detail} Keyboard inputs still work.`, 0, true);
      if (previewAvailable) emit('ls:camera', { enabled: false, preview: true });
      return false;
    } finally { if (generation === this.generation) this.startup = null; }
  }

  stop(): void {
    this.generation++; this.running = false; this.startup?.abort(); this.startup = null;
    clearTimeout(this.timer); this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    this.video.srcObject = null; this.detector?.close(); this.detector = null;
    this.resetRecognition(); this.statusUntil = 0;
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    emit('ls:camera', { enabled: false });
  }

  private report(text: string, holdMs = 0, force = false): void {
    const now = performance.now();
    if (!force && holdMs === 0 && now < this.statusUntil) return;
    if (holdMs > 0) this.statusUntil = now + holdMs;
    if (text !== this.lastStatus) { this.lastStatus = text; this.status(text); }
  }

  private discardFrames(): void {
    this.continuity++; this.requestSerial++; this.inference?.abort(); this.inference = null;
    this.frames = []; this.pending = false;
  }

  private loop(generation: number): void {
    if (!this.running || generation !== this.generation) return;
    const now = performance.now();
    if (now - this.lastFrameAt > FRAME_GAP_MS && this.frames.length) { this.discardFrames(); this.gate.observe(null, 0, now, true); }
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime && this.detector) {
      this.lastVideoTime = this.video.currentTime; this.lastFrameAt = now;
      try {
        const result = this.detector.detectForVideo(this.video, now);
        const hand = result.landmarks[0];
        const valid = hand?.length === 21 && hand.every(point => [point.x, point.y, point.z].every(Number.isFinite));
        this.draw(valid ? hand : undefined);
        if (valid) {
          this.gate.noteHandPresent();
          if (this.gate.awaitingRelease) this.report('Input sent. Lower your hand for a moment before the next input.');
          else {
            // Raw image-space landmarks, not world coordinates. Normalization belongs to the backend.
            // Capture near 30 Hz; the model's training FPS is unknown and this needs physical-hand validation.
            this.frames.push(hand.map(p => [p.x, p.y, p.z]));
            if (this.frames.length > FRAME_COUNT) this.frames.shift();
            if (this.frames.length < FRAME_COUNT) this.report(`Collecting hand motion: ${this.frames.length} / ${FRAME_COUNT} frames. Keep your hand in view.`);
            if (this.frames.length === FRAME_COUNT && !this.pending && now - this.lastInference >= 650) void this.predict(this.frames.map(f => f.map(p => [...p])), generation);
          }
        } else {
          if (this.frames.length || this.pending) this.discardFrames();
          this.gate.observe(null, 0, now, false);
          this.report(this.gate.awaitingRelease ? 'Hand lowered. Keep it out of view briefly to prepare the next input.' : 'Ready. Bring one hand into view and hold the requested input.');
        }
      } catch {
        this.discardFrames(); this.gate.observe(null, 0, now, true);
        this.report('Hand tracking was interrupted. Reposition your hand or restart the camera.', 1000);
      }
    }
    this.timer = window.setTimeout(() => this.loop(generation), 33);
  }

  private async predict(frames: number[][][], generation: number): Promise<void> {
    const continuity = this.continuity, serial = ++this.requestSerial;
    const inference = new AbortController(); this.inference = inference;
    this.pending = true; this.lastInference = performance.now();
    this.report('Checking the model prediction. Keep your hand steady.');
    try {
      const response = await fetch(`${API_BASE}/api/recognize`, {
        method: 'POST', headers: { ...API_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ frames }),
        signal: AbortSignal.any([inference.signal, AbortSignal.timeout(7000)]),
      });
      if (generation !== this.generation || serial !== this.requestSerial) return;
      if (!response.ok) throw new Error(response.status === 429 ? 'Recognition is busy. Hold your hand steady and try again shortly.' : 'Recognition is unavailable. Check the backend; keyboard inputs still work.');
      const result = await response.json() as { sign: Sign | null; confidence: number };
      if (generation !== this.generation || serial !== this.requestSerial || continuity !== this.continuity || !this.frames.length) return;
      if (!result || (result.sign !== null && !INPUT_LABELS.has(result.sign)) || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) throw new Error('The recognition service returned an invalid prediction. Try again.');
      const sign = this.gate.observe(result.sign, result.confidence, performance.now(), true);
      if (sign) {
        this.report(`${sign} input sent from the experimental model (${Math.round(result.confidence * 100)}%). Lower your hand before the next input.`, 1800, true);
        emit('ls:gesture', { sign, source: 'camera' });
      } else if (result.sign && result.confidence >= .85) this.report(`Model predicts ${result.sign} · ${Math.round(result.confidence * 100)}% confidence. Hold steady for confirmation; labels are unverified.`, 500);
      else this.report('No stable high-confidence input yet. Adjust your hand and lighting, then hold steady.', 700);
    } catch (error) {
      if (generation === this.generation && serial === this.requestSerial) {
        this.gate.observe(null, 0, performance.now(), true);
        this.report(error instanceof Error && error.name === 'TimeoutError' ? 'Recognition timed out. Check the backend connection; keyboard inputs still work.' : error instanceof Error ? error.message : 'Recognition unavailable.', 1500);
      }
    } finally { if (generation === this.generation && serial === this.requestSerial) { this.pending = false; this.inference = null; } }
  }

  private draw(hand?: Landmark[]): void {
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    if (this.canvas.width !== 320) this.canvas.width = 320;
    if (this.canvas.height !== 240) this.canvas.height = 240;
    ctx.clearRect(0, 0, 320, 240);
    if (!hand) return;
    const chains = [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
    ctx.strokeStyle = '#b6f0cf'; ctx.lineWidth = 2;
    for (const chain of chains) { ctx.beginPath(); chain.forEach((i,j) => j ? ctx.lineTo(hand[i].x*320,hand[i].y*240) : ctx.moveTo(hand[i].x*320,hand[i].y*240)); ctx.stroke(); }
    ctx.fillStyle = '#ffe5ab'; for (const p of hand) { ctx.beginPath(); ctx.arc(p.x*320,p.y*240,3,0,Math.PI*2); ctx.fill(); }
  }
}
