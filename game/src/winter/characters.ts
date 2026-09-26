export type CharacterId = 'noor' | 'elio' | 'mira';

export interface CharacterProfile {
  readonly id: CharacterId;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly quote: string;
  readonly accent: string;
  readonly color: number;
  readonly portrait: string;
}

/** Character choice changes appearance and story voice; gameplay stats stay identical. */
export const CHARACTERS: readonly CharacterProfile[] = Object.freeze([
  Object.freeze({ id: 'noor' as const, name: 'Noor', title: 'The curious explorer',
    description: 'A deaf, nonspeaking art student learning sign language. Noor collects sketches, questions, and tiny reasons to keep going.',
    quote: 'There is always something worth looking closer at.', accent: '#efb875', color: 0xefb875,
    portrait: './art/characters/noor.svg' }),
  Object.freeze({ id: 'elio' as const, name: 'Elio', title: 'The hopeful tinkerer',
    description: 'A deaf, nonspeaking design student learning sign language. Elio carries a little repair kit and believes broken things deserve another chance.',
    quote: 'Let’s see what we can make work again.', accent: '#afd18e', color: 0xafd18e,
    portrait: './art/characters/elio.svg' }),
  Object.freeze({ id: 'mira' as const, name: 'Mira', title: 'The quiet stargazer',
    description: 'A deaf, nonspeaking astronomy student learning sign language. Mira notices patterns in the sky and writes down wishes for the next clear night.',
    quote: 'Even here, the stars are still above us.', accent: '#b5c7ff', color: 0xb5c7ff,
    portrait: './art/characters/mira.svg' }),
]);

export function getCharacter(id: unknown): CharacterProfile {
  return CHARACTERS.find(character => character.id === id) ?? CHARACTERS[0];
}
