/**
 * Bridge between the backend gesture catalogue (backend/app/data/gestures.py,
 * 17 narrative sign keys) and the 10 postures the browser MediaPipe classifier
 * in services/gestureEngine.js can actually recognise.
 *
 * Several narrative signs intentionally share a posture (HALT and SHIELD are
 * both an open palm); the backend still validates which step is being answered,
 * so the mapping only decides which guide card the player is shown.
 */

export const BACKEND_TO_LOCAL_SIGN = {
  OPEN_PALM: 'OPEN_PALM',
  HALT: 'OPEN_PALM',
  SHIELD: 'OPEN_PALM',
  HEART: 'LOVE_HOPE',
  LIGHT: 'LOVE_HOPE',
  BOOK: 'CROSS_FAITH',
  CODE: 'PINCH_KEY',
  SILENCE: 'POINT_TARGET',
  POINT: 'POINT_TARGET',
  PEACE_V: 'PEACE',
  FREEDOM: 'THUMBS_UP',
  THUMB_UP: 'THUMBS_UP',
  LISTEN: 'CALL_SIGNAL',
  WATER: 'CALL_SIGNAL',
  BREAK: 'RESISTANCE_FIST',
  FIRE: 'RESISTANCE_FIST',
  TOGETHER: 'OK_SIGN'
};

export function localSignFor(backendGestureKey) {
  return BACKEND_TO_LOCAL_SIGN[backendGestureKey] || 'OPEN_PALM';
}
