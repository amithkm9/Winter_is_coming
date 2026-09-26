// A held gesture fires once. Neutral input must persist before another cast.
export class GestureGate {
  private candidate: string | null = null;
  private count = 0;
  private armed = true;
  private neutralSince: number | null = null;
  private lastTime = -Infinity;
  private candidateSince = 0;
  get awaitingRelease() { return !this.armed; }
  noteHandPresent() { this.neutralSince = null; }
  reset() { this.candidate = null; this.count = 0; this.armed = true; this.neutralSince = null; this.lastTime = -Infinity; }
  observe(sign: string | null, confidence: number, now: number, handPresent = sign !== null): string | null {
    if (!Number.isFinite(now) || now <= this.lastTime) return null;
    if (now - this.lastTime > 3500) { this.candidate = null; this.count = 0; this.neutralSince = null; }
    this.lastTime = now;
    if (!handPresent || !sign || !['A', 'B', 'C', '1', '2', '3'].includes(sign) || !Number.isFinite(confidence) || confidence < .85 || confidence > 1) {
      this.candidate = null; this.count = 0;
      if (!handPresent) {
        this.neutralSince ??= now;
        if (now - this.neutralSince >= 450) this.armed = true;
      } else this.neutralSince = null;
      return null;
    }
    this.neutralSince = null;
    if (!this.armed) return null;
    if (this.candidate !== sign) this.candidateSince = now;
    this.count = this.candidate === sign ? this.count + 1 : 1;
    this.candidate = sign;
    if (this.count >= 2 && now - this.candidateSince >= 450) { this.armed = false; this.count = 0; return sign; }
    return null;
  }
}
