/** Scene-independent academy milestones. The scene measures real movement and checks beacon proximity. */
export type OnboardingStage = 0 | 1 | 2 | 3;
export interface WinterOnboardingState {
  readonly stage: OnboardingStage;
  readonly distance: number;
  readonly complete: boolean;
}

export class WinterOnboarding {
  private stage: OnboardingStage = 0;
  private distance = 0;

  get state(): WinterOnboardingState {
    return Object.freeze({
      stage: this.stage,
      distance: this.distance,
      complete: this.stage === 3,
    });
  }

  reset(): void {
    this.stage = 0;
    this.distance = 0;
  }

  move(distanceMeters: number): void {
    if (this.stage !== 0 || !Number.isFinite(distanceMeters) || distanceMeters <= 0) return;
    this.distance = Math.min(4, this.distance + distanceMeters);
    if (this.distance >= 4) this.stage = 1;
  }

  enterBeacon(): boolean {
    if (this.stage !== 1) return false;
    this.stage = 2;
    return true;
  }

  /** Call only after the rehearsal accepts A; this tracker does not verify a camera prediction. */
  confirmInput(): boolean {
    if (this.stage !== 2) return false;
    this.stage = 3;
    return true;
  }
}

export default WinterOnboarding;
