import type { SurviveTheIslandBack, SurviveTheIslandTile } from './types.js';

type DeckEntry = { terrain: 'beach' | 'forest' | 'mountain'; back: SurviveTheIslandBack };
const copies = (
  terrain: DeckEntry['terrain'],
  back: SurviveTheIslandBack,
  count: number,
): DeckEntry[] => Array.from({ length: count }, () => ({ terrain, back }));

const deck: DeckEntry[] = [
  ...copies('beach', { kind: 'effect', effect: 'shark' }, 3),
  ...copies('forest', { kind: 'effect', effect: 'shark' }, 3),
  ...copies('beach', { kind: 'effect', effect: 'kaiju' }, 3),
  ...copies('forest', { kind: 'effect', effect: 'kaiju' }, 2),
  ...copies('beach', { kind: 'effect', effect: 'raft' }, 1),
  ...copies('forest', { kind: 'effect', effect: 'raft' }, 3),
  ...copies('forest', { kind: 'effect', effect: 'whirlpool' }, 2),
  ...copies('mountain', { kind: 'effect', effect: 'whirlpool' }, 4),
  ...copies('mountain', { kind: 'effect', effect: 'volcano' }, 4),
  ...copies('beach', { kind: 'ability', ability: 'paddle' }, 2),
  ...copies('beach', { kind: 'ability', ability: 'dolphin' }, 3),
  ...copies('forest', { kind: 'ability', ability: 'dolphin' }, 1),
  ...copies('forest', { kind: 'ability', ability: 'dive' }, 2),
  ...copies('beach', { kind: 'ability', ability: 'creature-die' }, 2),
  ...copies('forest', { kind: 'ability', ability: 'creature-die' }, 2),
  ...copies('beach', { kind: 'ability', ability: 'repellent' }, 2),
  ...copies('forest', { kind: 'ability', ability: 'repellent' }, 1),
];

export function createSurviveTheIslandDeck(random = Math.random): SurviveTheIslandTile[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.map((entry, id) => ({
    id,
    terrain: entry.terrain,
    back: entry.back,
    state: 'island',
    adventurerIds: [],
  }));
}
