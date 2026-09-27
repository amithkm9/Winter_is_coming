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

/** Six playable chapters, with field operations unlocked in campaign order. */
export const CHAPTERS: readonly ChapterMetadata[] = Object.freeze(
  (
    [
      {
        id: 'academy',
        number: '00',
        title: 'The First Spark',
        subtitle: 'Resistance academy · Safe courtyard simulation',
        description:
          'Begin in a safe training simulation of the Louvre courtyard. Learn to move, look around, and rehearse the fictional A cipher input without danger.',
        objective: 'Complete the guided introduction and practise the relay inputs.',
        mechanic: 'Guided movement and safe cipher rehearsal',
        reward: 'Resistance field access · Unlock the Louvre operation',
        playable: true,
        position: [14, 76],
      },
      {
        id: 'louvre',
        number: '01',
        title: 'The Louvre Relay',
        subtitle: 'Cour Napoléon · First field operation',
        description:
          'Cross the frozen courtyard, avoid surveillance scans, and reconnect three optical relays. Find scattered memories and restore warmth to the first sector.',
        objective: 'Restore three relays and activate the central core.',
        mechanic: 'Exploration, drone avoidance and relay sequences',
        reward: 'The Louvre restored · Unlock Under the Ice',
        playable: true,
        position: [32, 57],
      },
      {
        id: 'canal',
        number: '02',
        title: 'Under the Ice',
        subtitle: 'Canal Saint-Martin · Frozen lock gates',
        description:
          'Cross a frozen canal and reopen its three lock gates. Number ciphers introduce a new set of inputs while each restored relay opens the route ahead.',
        objective: 'Restore the lock gates in order and restart the canal pump.',
        mechanic: 'Number ciphers 1 / 2 / 3, hazard avoidance and sequential gates',
        reward: 'The canal restored · Unlock A Place to Grow',
        playable: true,
        position: [53, 67],
      },
      {
        id: 'glasshouse',
        number: '03',
        title: 'A Place to Grow',
        subtitle: 'Botanical glasshouse · Growing chambers',
        description:
          'Enter a frost-covered sanctuary and restore its growing chambers. Letter and number inputs share the same sequences as you work towards the heating core.',
        objective: 'Restore three chambers in order and warm the seed archive.',
        mechanic: 'Mixed letter/number ciphers and chamber gates',
        reward: 'The garden restored · Unlock Beyond the Clouds',
        playable: true,
        position: [69, 45],
      },
      {
        id: 'observatory',
        number: '04',
        title: 'Beyond the Clouds',
        subtitle: 'Paris observatory · Signal instruments',
        description:
          'Reconnect the observatory above the city’s signal fog. Longer sequences protect its three instruments and the path to the sky beacon.',
        objective: 'Reconnect three observation relays in order and light the sky beacon.',
        mechanic: 'Longer mixed sequences and instrument access gates',
        reward: 'The sky beacon restored · Unlock The Returning Dawn',
        playable: true,
        position: [49, 27],
      },
      {
        id: 'spire',
        number: '05',
        title: 'The Returning Dawn',
        subtitle: 'NEXUS signal spire · Campaign finale',
        description:
          'Enter the final signal array. Bring together all six inputs and break its three locks to return control of the grid to Paris.',
        objective: 'Break three signal locks in order and activate the central array.',
        mechanic: 'Combined ciphers culminating in a five-input final sequence',
        reward: 'Paris restored · Complete the resistance journey',
        playable: true,
        position: [82, 15],
      },
    ] satisfies ChapterMetadata[]
  ).map((chapter) =>
    Object.freeze({
      ...chapter,
      position: Object.freeze([...chapter.position] as [number, number]),
    }),
  ),
);

export interface WinterCampaignState {
  readonly character: CharacterId;
  readonly completed: readonly ChapterId[];
  readonly tutorialComplete: boolean;
  readonly tutorialSkipped: boolean;
}

const CHARACTER_IDS = new Set<unknown>(['noor', 'elio', 'mira']);
const chapter = (id: unknown) => CHAPTERS.find((item) => item.id === id);

export class WinterCampaign {
  private character: CharacterId = 'noor';
  private completed: ChapterId[] = [];
  private tutorialSkipped = false;

  get state(): WinterCampaignState {
    return Object.freeze({
      character: this.character,
      completed: Object.freeze([...this.completed]),
      tutorialComplete: this.completed.includes('academy'),
      tutorialSkipped: this.tutorialSkipped,
    });
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
    if (
      id === 'academy' ||
      (id === 'louvre' && (this.completed.includes('academy') || this.tutorialSkipped))
    )
      return 'available';
    const index = CHAPTERS.findIndex((item) => item.id === id);
    if (index > 1 && this.completed.includes(CHAPTERS[index - 1].id)) return 'available';
    return 'locked';
  }

  completeChapter(id: ChapterId): boolean {
    if (this.status(id) !== 'available') return false;
    this.completed.push(id);
    this.completed.sort(
      (a, b) =>
        CHAPTERS.findIndex((chapter) => chapter.id === a) -
        CHAPTERS.findIndex((chapter) => chapter.id === b),
    );
    if (id === 'academy') this.tutorialSkipped = false;
    return true;
  }

  skipTutorial(): void {
    if (!this.completed.includes('academy')) this.tutorialSkipped = true;
  }

  resetProgress(): void {
    this.completed = [];
    this.tutorialSkipped = false;
  }

  serialize(): string {
    return JSON.stringify({ version: 1, profile: 'winter-campaign', ...this.state });
  }

  restore(raw: string): boolean {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
      const saved = parsed as Record<string, unknown>;
      if (
        saved.version !== 1 ||
        saved.profile !== 'winter-campaign' ||
        !CHARACTER_IDS.has(saved.character)
      )
        return false;
      if (
        !Array.isArray(saved.completed) ||
        saved.completed.length > CHAPTERS.length ||
        new Set(saved.completed).size !== saved.completed.length
      )
        return false;
      const tutorialSkipped = saved.tutorialSkipped === undefined ? false : saved.tutorialSkipped;
      if (typeof tutorialSkipped !== 'boolean') return false;
      // A real skip unlocks field access without pretending the training was completed.
      const expected = CHAPTERS.filter(
        (chapter) => !tutorialSkipped || chapter.id !== 'academy',
      ).map((chapter) => chapter.id);
      if (saved.completed.some((id, index) => id !== expected[index])) return false;
      if (
        typeof saved.tutorialComplete !== 'boolean' ||
        saved.tutorialComplete !== saved.completed.includes('academy')
      )
        return false;
      if (saved.tutorialComplete && tutorialSkipped) return false;
      this.character = saved.character as CharacterId;
      this.completed = [...saved.completed] as ChapterId[];
      this.tutorialSkipped = tutorialSkipped;
      return true;
    } catch {
      return false;
    }
  }
}

export default WinterCampaign;
