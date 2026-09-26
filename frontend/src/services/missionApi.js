/**
 * Client for the FastAPI task & mission generation engine (backend/, Phase 3).
 *
 * Every call resolves to `null` when the backend is unreachable so the game can
 * keep running on its built-in district data during offline demos.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const REQUEST_TIMEOUT_MS = 4000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn(`[missionApi] ${path} unavailable, using offline profile:`, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Starts a server-authoritative mission run for a district. */
export function startMission(districtId) {
  return request(`/districts/${districtId}/missions`, { method: 'POST' });
}

/** Reports a completed gesture hold; the server owns step advancement. */
export function submitAttempt(sessionId, { gestureKey, confidence, holdDurationSec }) {
  return request(`/missions/${sessionId}/attempts`, {
    method: 'POST',
    body: JSON.stringify({ gestureKey, confidence, holdDurationSec })
  });
}
