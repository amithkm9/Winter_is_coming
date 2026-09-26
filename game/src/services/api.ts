const configured = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_BASE = configured;
// ngrok's documented API header prevents a browser warning page replacing JSON.
const tunnel = /^https:\/\/(?:[a-z0-9-]+\.)+(?:ngrok-free\.(?:app|dev)|ngrok\.(?:app|dev|io))(?::\d+)?(?:\/|$)/i.test(configured);
export const API_HEADERS: Record<string, string> = tunnel ? { 'ngrok-skip-browser-warning': '1' } : {};
export interface ServiceHealth { gemini: boolean; gradium: boolean; recognition: boolean; modelExists: boolean }
export async function health(): Promise<ServiceHealth | null> {
  try {
    const response = await fetch(`${API_BASE}/api/health`, { headers: API_HEADERS, signal: AbortSignal.timeout(4000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
export async function getHint(encounter: string, unlocked: string[], attempts = 0) {
  const response = await fetch(`${API_BASE}/api/hint`, {
    method: 'POST', headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ encounter, unlocked, attempts }), signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Companion service is unavailable');
  return await response.json() as { text: string; source: string };
}
let activeAudio: HTMLAudioElement | null = null;
let activeUrl = '';
let voiceGeneration = 0;
export function stopVoice() {
  voiceGeneration++;
  activeAudio?.pause(); activeAudio = null;
  if (activeUrl) URL.revokeObjectURL(activeUrl);
  activeUrl = '';
}
export async function speak(text: string): Promise<boolean> {
  stopVoice();
  const generation = voiceGeneration;
  try {
    const response = await fetch(`${API_BASE}/api/voice`, {
      method: 'POST', headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok || generation !== voiceGeneration) return false;
    const blob = await response.blob();
    if (generation !== voiceGeneration) return false;
    activeUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeUrl);
    await activeAudio.play();
    return true;
  } catch { return false; }
}
