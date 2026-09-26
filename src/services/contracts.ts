/** Shared camera/game event contract, independent of any renderer. */
export type Sign = 'A' | 'B' | 'C' | '1' | '2' | '3';

export function emit(name: string, detail: unknown = {}): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
