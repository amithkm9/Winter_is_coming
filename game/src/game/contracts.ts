export type Sign = 'A' | 'B' | 'C' | '1' | '2' | '3';
export type InputSource = 'keyboard' | 'camera';
export interface GameSnapshot {
  health: number; maxHealth: number; coins: number; stars: number;
  unlocked: Sign[]; objective: string; region: string; checkpoint: number;
  bossHealth: number; bossMaxHealth: number; complete: boolean;
  elapsed: number; focus: boolean;
}
// Window events: ls:start {continue:boolean}; ls:pause {paused:boolean};
// ls:gesture {sign:Sign,source:InputSource}; ls:focus {}; ls:restart {};
// ls:state GameSnapshot; ls:toast {title:string,text?:string};
// ls:dialogue {speaker:string,text:string}; ls:complete GameSnapshot;
// ls:camera {enabled:boolean}; ls:settings {reducedMotion:boolean,sound:boolean};
export function emit(name: string, detail: unknown = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
