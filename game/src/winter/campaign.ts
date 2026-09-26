/** Campaign availability and player preferences, independent of scene and mission state. */
export type ChapterId = 'academy' | 'louvre' | 'canal' | 'glasshouse' | 'observatory' | 'spire';
export type CharacterId = 'noor' | 'elio' | 'mira';
export type ChapterStatus = 'available' | 'completed' | 'locked' | 'planned';

export interface ChapterMetadata {
  readonly id: ChapterId;
  readonly number: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly objective: string;
  readonly mechanic: string;
  readonly reward: string;
  readonly playable: boolean;
  readonly position: readonly [number, number];
}

/** Planned chapters are visible aspirations, never presented as playable content. */
export const CHAPTERS: readonly ChapterMetadata[] = Object.freeze(([
  { id: 'academy', number: '00', title: 'The First Spark', subtitle: 'Resistance academy · Safe courtyard simulation',
    description: 'Begin in a safe training simulation of the Louvre courtyard. Learn to move, look around, and rehearse fictional A/B/C cipher inputs without drone danger.',
    objective: 'Complete the guided introduction and practise the relay inputs.', mechanic: 'Guided movement and safe cipher rehearsal',
    reward: 'Resistance field access · Unlock the Louvre operation', playable: true, position: [14, 76] },
  { id: 'louvre', number: '01', title: 'The Louvre Relay', subtitle: 'Cour Napoléon · First field operation',
    description: 'Cross the frozen courtyard, avoid surveillance scans, and reconnect three optical relays. Find scattered memories and restore warmth to the first sector.',
    objective: 'Restore three relays and activate the central core.', mechanic: 'Exploration, drone avoidance and relay sequences',
    reward: 'The Louvre restored · First foothold for the resistance', playable: true, position: [32, 57] },
  { id: 'canal', number: '02', title: 'Under the Ice', subtitle: 'Canal Saint-Martin · Planned chapter',
    description: 'A future journey along frozen locks and abandoned waterside workshops. Redirect the canal’s energy without waking its sleeping sentries.',
    objective: 'Reconnect the lock gates and reopen a passage through the canal.', mechanic: 'Timed routes and linked environmental mechanisms',
    reward: 'Planned: a passage to the eastern resistance cells', playable: false, position: [53, 67] },
  { id: 'glasshouse', number: '03', title: 'A Place to Grow', subtitle: 'Botanical glasshouse · Planned chapter',
    description: 'A future sanctuary shelters the last living garden beneath frost-covered glass. Restore its warmth and carry light between the growing chambers.',
    objective: 'Restore the greenhouse circuits and protect the seed archive.', mechanic: 'Light-routing puzzles and environmental restoration',
    reward: 'Planned: a living garden and the resistance seed archive', playable: false, position: [69, 45] },
  { id: 'observatory', number: '04', title: 'Beyond the Clouds', subtitle: 'Paris observatory · Planned chapter',
    description: 'A future climb reaches an observatory above the city’s signal fog. Align its instruments to reveal a route through the surveillance network.',
    objective: 'Align the observation instruments and chart the final approach.', mechanic: 'Spatial alignment and constellation sequences',
    reward: 'Planned: a clear route to the central signal spire', playable: false, position: [49, 27] },
  { id: 'spire', number: '05', title: 'The Returning Dawn', subtitle: 'NEXUS signal spire · Planned finale',
    description: 'A future finale brings the resistance to the machine’s highest tower. Combine the abilities learned across the city to break the artificial winter.',
    objective: 'Reach the central array and return control of the grid to Paris.', mechanic: 'Combined traversal, environmental puzzles and final relay orchestration',
    reward: 'Planned: the end of the artificial winter', playable: false, position: [82, 15] },
] satisfies ChapterMetadata[]).map(chapter => Object.freeze({ ...chapter, position: Object.freeze([...chapter.position] as [number, number]) })));

export interface WinterCampaignState {
  readonly character: CharacterId;
  readonly completed: readonly ChapterId[];
  readonly tutorialComplete: boolean;
  readonly tutorialSkipped: boolean;
}

const CHARACTER_IDS = new Set<unknown>(['noor', 'elio', 'mira']);
const chapter = (id: unknown) => CHAPTERS.find(item => item.id === id);

export class WinterCampaign {
  private character: CharacterId = 'noor';
  private completed: ChapterId[] = [];
  private tutorialSkipped = false;

  get state(): WinterCampaignState {
    return Object.freeze({ character: this.character, completed: Object.freeze([...this.completed]), tutorialComplete: this.completed.includes('academy'), tutorialSkipped: this.tutorialSkipped });
  }

  selectCharacter(value: unknown): boolean {
    if (!CHARACTER_IDS.has(value)) return false;
    this.character = value as CharacterId;
    return true;
  }

  status(id: ChapterId): ChapterStatus {
    const metadata = chapter(id);
    if (!metadata) return 'locked';
    if (!metadata.playable) return 'planned';
    if (this.completed.includes(id)) return 'completed';
    if (id === 'academy' || (id === 'louvre' && (this.completed.includes('academy') || this.tutorialSkipped))) return 'available';
    return 'locked';
  }

  completeChapter(id: ChapterId): boolean {
    if (this.status(id) !== 'available') return false;
    this.completed.push(id);
    this.completed.sort((a, b) => (a === 'academy' ? 0 : 1) - (b === 'academy' ? 0 : 1));
    if (id === 'academy') this.tutorialSkipped = false;
    return true;
  }

  skipTutorial(): void {
    if (!this.completed.includes('academy')) this.tutorialSkipped = true;
  }

  resetProgress(): void { this.completed = []; this.tutorialSkipped = false; }

  serialize(): string {
    return JSON.stringify({ version: 1, profile: 'winter-campaign', ...this.state });
  }

  restore(raw: string): boolean {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
      const saved = parsed as Record<string, unknown>;
      if (saved.version !== 1 || saved.profile !== 'winter-campaign' || !CHARACTER_IDS.has(saved.character)) return false;
      if (!Array.isArray(saved.completed) || saved.completed.length > 2 || new Set(saved.completed).size !== saved.completed.length) return false;
      const tutorialSkipped = saved.tutorialSkipped === undefined ? false : saved.tutorialSkipped;
      if (typeof tutorialSkipped !== 'boolean') return false;
      // A real skip unlocks field access without pretending the training was completed.
      if (saved.completed.some(id => id !== 'academy' && id !== 'louvre')) return false;
      if (saved.completed.length === 2 && (saved.completed[0] !== 'academy' || saved.completed[1] !== 'louvre')) return false;
      if (saved.completed.includes('louvre') && !saved.completed.includes('academy') && !tutorialSkipped) return false;
      if (typeof saved.tutorialComplete !== 'boolean' || saved.tutorialComplete !== saved.completed.includes('academy')) return false;
      if (saved.tutorialComplete && tutorialSkipped) return false;
      this.character = saved.character as CharacterId;
      this.completed = [...saved.completed] as ChapterId[];
      this.tutorialSkipped = tutorialSkipped;
      return true;
    } catch { return false; }
  }
}

export default WinterCampaign;
