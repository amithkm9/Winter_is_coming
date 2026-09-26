import type { RelayId, WinterSign } from './mission.ts';

export type MissionChapter = 'louvre' | 'canal' | 'glasshouse' | 'observatory' | 'spire';
export interface LevelConfig {
  readonly id: MissionChapter;
  readonly title: string;
  readonly number: string;
  readonly location: string;
  readonly objective: string;
  readonly arrival: string;
  readonly completion: string;
  readonly coreName: string;
  readonly sequences: Readonly<Record<RelayId, readonly WinterSign[]>>;
  readonly ordered: boolean;
  readonly accent: number;
  readonly sky: number;
  readonly fog: number;
}

const configs: LevelConfig[] = [
  { id: 'louvre', title: 'The Louvre Relay', number: '01', location: 'Cour Napoléon',
    objective: 'Restore three courtyard relays and activate the central core.',
    arrival: 'The courtyard is our first foothold. Reach the three terminals, practise their letter ciphers, and bring back the light.',
    completion: 'THE LOUVRE IS FREE. The first foothold is ours. Follow the signal to the canal.',
    coreName: 'Louvre core', sequences: { 0: ['A'], 1: ['B', 'C'], 2: ['A', 'C', 'B'] }, ordered: false,
    accent: 0xefb974, sky: 0x0b1727, fog: 0x163044 },
  { id: 'canal', title: 'Under the Ice', number: '02', location: 'Canal Saint-Martin',
    objective: 'Open three lock gates in order, then restart the canal pump.',
    arrival: 'The canal is sealed behind three lock gates. Restore each terminal in order using the number inputs 1, 2 and 3.',
    completion: 'THE CANAL FLOWS AGAIN. The gates are open. The glasshouse can receive power.',
    coreName: 'canal pump', sequences: { 0: ['1'], 1: ['1', '2'], 2: ['3', '2', '1'] }, ordered: true,
    accent: 0x76d6eb, sky: 0x091c2b, fog: 0x1b4051 },
  { id: 'glasshouse', title: 'A Place to Grow', number: '03', location: 'Botanical Glasshouse',
    objective: 'Restore three growing chambers in order and restart the garden’s heating core.',
    arrival: 'The garden is sleeping beneath the frost. Letter and number inputs now share a cipher. Restore each chamber before moving deeper.',
    completion: 'THE GARDEN IS WARM AGAIN. The seed archive is safe. Our signal can reach the observatory.',
    coreName: 'garden heating core', sequences: { 0: ['C', '1'], 1: ['2', 'B', '1'], 2: ['C', '3', 'A', '2'] }, ordered: true,
    accent: 0x9adb98, sky: 0x0d211e, fog: 0x264c3e },
  { id: 'observatory', title: 'Beyond the Clouds', number: '04', location: 'Paris Observatory',
    objective: 'Reconnect three observation relays in order and activate the sky beacon.',
    arrival: 'The observatory sees beyond the signal fog. Read each sequence carefully and reconnect the three relays to reveal our final route.',
    completion: 'THE SKY BEACON IS LIT. The signal spire is within reach. One final climb awaits.',
    coreName: 'sky beacon', sequences: { 0: ['1', '3', '2'], 1: ['A', '2', 'C', '1'], 2: ['3', 'B', '1', 'C'] }, ordered: true,
    accent: 0xb8b8ff, sky: 0x100f2b, fog: 0x2d2b4f },
  { id: 'spire', title: 'The Returning Dawn', number: '05', location: 'NEXUS Signal Spire',
    objective: 'Break the three signal locks in order and return the central array to the city.',
    arrival: 'Everything we restored has brought us here. Combine the six inputs, break each signal lock, and bring the dawn back to Paris.',
    completion: 'PARIS HAS ITS DAWN. The artificial winter is broken. The resistance has brought back the light.',
    coreName: 'central signal array', sequences: { 0: ['A', '1', 'C'], 1: ['B', '2', 'A', 'C'], 2: ['A', 'C', '2', 'B', '3'] }, ordered: true,
    accent: 0xffc184, sky: 0x1c142b, fog: 0x433247 },
];

export const LEVELS: Readonly<Record<MissionChapter, LevelConfig>> = Object.freeze(Object.fromEntries(configs.map(config => [config.id,
  Object.freeze({ ...config, sequences: Object.freeze({ 0: Object.freeze([...config.sequences[0]]), 1: Object.freeze([...config.sequences[1]]), 2: Object.freeze([...config.sequences[2]]) }) }),
])) as Record<MissionChapter, LevelConfig>);

export function isMissionChapter(value: unknown): value is MissionChapter {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEVELS, value);
}
