export type ViewMode = 'third-person' | 'first-person';

export function parseViewMode(value: unknown): ViewMode {
  return value === 'first-person' ? 'first-person' : 'third-person';
}

interface ViewPoint { x: number; y: number; z: number }

/** Eye-anchored camera with the same -Z forward axis as the courier.
 * Yaw and pitch use radians. Positive yaw turns towards world -X; positive
 * pitch looks upwards. No chase offset, walking bob or smoothing is applied.
 */
export function firstPersonPose(x: number, y: number, z: number, yaw: number, pitch: number): {
  position: ViewPoint;
  target: ViewPoint;
} {
  const finite = (value: number) => Number.isFinite(value) ? value : 0;
  const position = { x: finite(x), y: finite(y) + 1.6, z: finite(z) };
  const heading = finite(yaw), elevation = Math.min(.85, Math.max(-.85, finite(pitch)));
  const horizontal = Math.cos(elevation);
  return {
    position,
    target: {
      x: position.x - Math.sin(heading) * horizontal,
      y: position.y + Math.sin(elevation),
      z: position.z - Math.cos(heading) * horizontal,
    },
  };
}
