/** Camera-relative movement. The scene supplies the camera's actual flattened viewing direction. */
export interface MovementDirection {
  readonly x: number;
  readonly z: number;
}
const TAU = Math.PI * 2;
export const TURN_SPEED = 18;
export const WALK_SPEED = 4.8;
export const RUN_SPEED = 7.2;
const EPSILON = 1e-8;
const zero = (): MovementDirection => ({ x: 0, z: 0 });

export function movementDirection(
  inputRight: number,
  inputForward: number,
  cameraForwardX: number,
  cameraForwardZ: number,
): MovementDirection {
  if (![inputRight, inputForward, cameraForwardX, cameraForwardZ].every(Number.isFinite))
    return zero();
  if (Math.abs(inputRight) < EPSILON && Math.abs(inputForward) < EPSILON) return zero();
  const forwardLength = Math.hypot(cameraForwardX, cameraForwardZ);
  if (!Number.isFinite(forwardLength) || forwardLength < EPSILON) return zero();
  const forwardX = cameraForwardX / forwardLength,
    forwardZ = cameraForwardZ / forwardLength;
  // A camera looking toward -Z has screen-right along +X.
  const x = -forwardZ * inputRight + forwardX * inputForward;
  const z = forwardX * inputRight + forwardZ * inputForward;
  const length = Math.hypot(x, z);
  return !Number.isFinite(length) || length < EPSILON ? zero() : { x: x / length, z: z / length };
}

/** Derive facing from actual displacement after collision resolution, including wall sliding. */
export function facingYaw(dx: number, dz: number, previous: number): number {
  const fallback = Number.isFinite(previous) ? previous : 0;
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) < EPSILON) return fallback;
  return Math.atan2(-dx, -dz);
}

/** Fast angular movement, with a 100 ms frame cap to avoid huge turns after a suspended frame. */
export function turnToward(current: number, target: number, dt: number): number {
  if (!Number.isFinite(current)) current = 0;
  if (!Number.isFinite(target) || !Number.isFinite(dt) || dt <= 0) return current;
  current %= TAU;
  target %= TAU;
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const step = TURN_SPEED * Math.min(dt, 0.1);
  const turned = current + Math.max(-step, Math.min(step, delta));
  // Bounded normalization preserves the orientation while avoiding accumulated revolutions.
  return ((((turned + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}
