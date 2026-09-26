import type { Sign } from './contracts';

export const SAVE_KEY = 'learnsign-save-v1';
export type SavedAdventure = {
  version: 1; checkpoint: number; coins: number; stars: number; unlocked: Sign[];
  picked: string[]; opened: string[]; defeated: string[]; puzzle: boolean; complete: boolean; elapsed: number;
};

/** Save data is untrusted: reject a partial/corrupt save rather than spawning past locked powers. */
export function parseSave(raw: string | null): SavedAdventure | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || value.version !== 1 || ![140, 595, 1915, 3195, 3890, 4570].includes(value.checkpoint)) return null;
    if (!Number.isSafeInteger(value.coins) || value.coins < 0 || value.coins > 100000 || !Number.isInteger(value.stars) || value.stars < 0 || value.stars > 5) return null;
    if (!Number.isFinite(value.elapsed) || value.elapsed < 0 || !Array.isArray(value.unlocked) || value.unlocked.some((s: unknown) => !['A', 'B', 'C'].includes(String(s)))) return null;
    if (new Set(value.unlocked).size !== value.unlocked.length) return null;
    if (!Array.isArray(value.picked) || value.picked.length > 47 || value.picked.some((s: unknown) => typeof s !== 'string' || !/^(coin-([0-9]|[1-3][0-9]|4[01])|star-[0-4])$/.test(s))) return null;
    if (new Set(value.picked).size !== value.picked.length) return null;
    if (!Array.isArray(value.opened) || value.opened.length > 3 || value.opened.some((s: unknown) => typeof s !== 'string' || !/^chest-[0-2]$/.test(s))) return null;
    if (new Set(value.opened).size !== value.opened.length) return null;
    // The initial prototype did not persist defeated enemies. Keep that save readable.
    if (value.defeated === undefined) value.defeated = [];
    if (!Array.isArray(value.defeated) || value.defeated.length > 6 || value.defeated.some((s: unknown) => typeof s !== 'string' || !/^enemy-[0-5]$/.test(s))) return null;
    if (new Set(value.defeated).size !== value.defeated.length) return null;
    if (typeof value.puzzle !== 'boolean' || typeof value.complete !== 'boolean') return null;
    if (value.checkpoint >= 595 && !value.unlocked.includes('A')) return null;
    if (value.checkpoint >= 1915 && !value.unlocked.includes('B')) return null;
    if (value.checkpoint >= 3195 && !value.unlocked.includes('C')) return null;
    if ((value.checkpoint >= 4570 || value.complete) && !value.puzzle) return null;
    if (value.puzzle && !['A', 'B', 'C'].every(s => value.unlocked.includes(s))) return null;
    if (value.stars !== value.picked.filter((s: string) => s.startsWith('star-')).length) return null;
    return value as SavedAdventure;
  } catch { return null; }
}

export function advanceSequence(sequence: readonly Sign[], index: number, sign: Sign): number {
  return sign === sequence[index] ? index + 1 : sign === sequence[0] ? 1 : 0;
}
