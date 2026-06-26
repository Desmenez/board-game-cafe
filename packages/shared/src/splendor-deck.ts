import type { SplendorGem, SplendorGems } from './types/splendor.js';

export interface SplendorDevCardDef {
  id: string;
  artKey: string;
  level: 1 | 2 | 3;
  bonus: SplendorGem;
  prestige: number;
  cost: SplendorGems;
}

export interface SplendorNobleDef {
  id: string;
  artKey: string;
  name: string;
  prestige: number;
  requires: SplendorGems;
}

type DevCardRow = {
  artKey: string;
  prestige: number;
  cost: SplendorGems;
};

function z(): SplendorGems {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

function c(cost: Partial<SplendorGems>): SplendorGems {
  return { ...z(), ...cost };
}

function bonusFromArtKey(artKey: string): SplendorGem {
  const gem = artKey.split('-')[1];
  if (gem === 'white' || gem === 'blue' || gem === 'green' || gem === 'red' || gem === 'black') {
    return gem;
  }
  throw new Error(`Invalid artKey bonus segment: ${artKey}`);
}

function levelFromArtKey(artKey: string): 1 | 2 | 3 {
  if (artKey.startsWith('one-')) return 1;
  if (artKey.startsWith('two-')) return 2;
  if (artKey.startsWith('three-')) return 3;
  throw new Error(`Invalid artKey level prefix: ${artKey}`);
}

function prestigeLevel1(cost: SplendorGems): number {
  const nonzero = (['white', 'blue', 'green', 'red', 'black'] as const).filter((g) => cost[g] > 0);
  return nonzero.length === 1 && cost[nonzero[0]!] === 4 ? 1 : 0;
}

function toCardDef(row: DevCardRow): SplendorDevCardDef {
  const level = levelFromArtKey(row.artKey);
  const bonus = bonusFromArtKey(row.artKey);
  return {
    id: row.artKey,
    artKey: row.artKey,
    level,
    bonus,
    prestige: row.prestige,
    cost: { ...row.cost },
  };
}

/** Level 1 — costs synced to Cloudinary card art (board-game-cafe/splendor) */
const LEVEL_ONE_ROWS: DevCardRow[] = [
  { artKey: 'one-white-5', prestige: 0, cost: c({ white: 3, blue: 1, black: 1 }) },
  { artKey: 'one-red-2', prestige: 0, cost: c({ white: 4 }) },
  { artKey: 'one-green-3', prestige: 0, cost: c({ blue: 1, red: 2, black: 2 }) },
  { artKey: 'one-red-8', prestige: 0, cost: c({ white: 2, green: 1, black: 2 }) },
  { artKey: 'one-white-2', prestige: 0, cost: c({ blue: 1, green: 1, red: 1, black: 1 }) },
  { artKey: 'one-white-4', prestige: 0, cost: c({ blue: 2, green: 2, black: 1 }) },
  { artKey: 'one-black-8', prestige: 1, cost: c({ blue: 4 }) },
  { artKey: 'one-white-7', prestige: 0, cost: c({ red: 2, black: 1 }) },
  { artKey: 'one-black-6', prestige: 0, cost: c({ white: 1, blue: 1, green: 1, red: 1 }) },
  { artKey: 'one-green-5', prestige: 0, cost: c({ white: 1, blue: 1, red: 1, black: 1 }) },
  { artKey: 'one-red-3', prestige: 0, cost: c({ blue: 2, green: 1 }) },
  { artKey: 'one-blue-5', prestige: 0, cost: c({ green: 2, black: 2 }) },
  { artKey: 'one-green-7', prestige: 1, cost: c({ black: 4 }) },
  { artKey: 'one-black-7', prestige: 0, cost: c({ white: 1, blue: 2, green: 1, red: 1 }) },
  { artKey: 'one-red-7', prestige: 0, cost: c({ white: 2, blue: 1, green: 1, black: 1 }) },
  { artKey: 'one-blue-4', prestige: 0, cost: c({ white: 1, black: 2 }) },
  { artKey: 'one-blue-1', prestige: 0, cost: c({ white: 1, green: 1, red: 1, black: 1 }) },
  { artKey: 'one-blue-7', prestige: 0, cost: c({ blue: 1, green: 3, red: 1 }) },
  { artKey: 'one-green-4', prestige: 0, cost: c({ blue: 2, red: 2 }) },
  { artKey: 'one-green-2', prestige: 0, cost: c({ white: 1, blue: 3, green: 1 }) },
  { artKey: 'one-red-6', prestige: 0, cost: c({ white: 1, blue: 1, green: 1, black: 1 }) },
  { artKey: 'one-red-5', prestige: 0, cost: c({ white: 1, red: 1, black: 3 }) },
  { artKey: 'one-green-6', prestige: 0, cost: c({ white: 1, blue: 1, red: 1, black: 2 }) },
  { artKey: 'one-green-1', prestige: 0, cost: c({ white: 2, blue: 1 }) },
  { artKey: 'one-green-8', prestige: 0, cost: c({ red: 3 }) },
  { artKey: 'one-blue-8', prestige: 0, cost: c({ white: 1, green: 1, red: 2, black: 1 }) },
  { artKey: 'one-white-3', prestige: 0, cost: c({ blue: 1, green: 2, red: 1, black: 1 }) },
  { artKey: 'one-white-6', prestige: 0, cost: c({ blue: 2, black: 2 }) },
  { artKey: 'one-red-4', prestige: 0, cost: c({ white: 2, red: 2 }) },
  { artKey: 'one-white-1', prestige: 0, cost: c({ blue: 3 }) },
  { artKey: 'one-black-5', prestige: 0, cost: c({ green: 1, red: 3, black: 1 }) },
  { artKey: 'one-black-4', prestige: 0, cost: c({ white: 2, blue: 2, red: 1 }) },
  { artKey: 'one-blue-6', prestige: 0, cost: c({ white: 1, green: 2, red: 2 }) },
  { artKey: 'one-red-1', prestige: 0, cost: c({ white: 3 }) },
  { artKey: 'one-blue-3', prestige: 1, cost: c({ red: 4 }) },
  { artKey: 'one-blue-2', prestige: 0, cost: c({ black: 3 }) },
  { artKey: 'one-black-3', prestige: 0, cost: c({ white: 2, green: 2 }) },
  { artKey: 'one-black-2', prestige: 0, cost: c({ green: 2, red: 1 }) },
  { artKey: 'one-black-1', prestige: 0, cost: c({ green: 3 }) },
  { artKey: 'one-white-8', prestige: 1, cost: c({ green: 4 }) },
];

for (const row of LEVEL_ONE_ROWS) {
  if (row.prestige === 0 && prestigeLevel1(row.cost) === 1) {
    row.prestige = 1;
  }
}

/** Level 2 — costs synced to Cloudinary card art */
const LEVEL_TWO_ROWS: DevCardRow[] = [
  { artKey: 'two-red-1', prestige: 2, cost: c({ white: 1, blue: 4, green: 2 }) },
  { artKey: 'two-white-3', prestige: 1, cost: c({ green: 3, red: 2, black: 2 }) },
  { artKey: 'two-green-3', prestige: 1, cost: c({ white: 2, blue: 3, black: 2 }) },
  { artKey: 'two-green-2', prestige: 1, cost: c({ white: 3, green: 2, red: 3 }) },
  { artKey: 'two-blue-3', prestige: 2, cost: c({ white: 5, blue: 3 }) },
  { artKey: 'two-white-2', prestige: 1, cost: c({ white: 2, blue: 3, red: 3 }) },
  { artKey: 'two-green-1', prestige: 2, cost: c({ white: 4, blue: 2, black: 1 }) },
  { artKey: 'two-red-4', prestige: 3, cost: c({ red: 6 }) },
  { artKey: 'two-white-1', prestige: 2, cost: c({ green: 1, red: 4, black: 2 }) },
  { artKey: 'two-white-5', prestige: 2, cost: c({ red: 5 }) },
  { artKey: 'two-green-6', prestige: 2, cost: c({ green: 5 }) },
  { artKey: 'two-blue-2', prestige: 1, cost: c({ blue: 2, green: 3, black: 3 }) },
  { artKey: 'two-blue-5', prestige: 3, cost: c({ blue: 6 }) },
  { artKey: 'two-blue-4', prestige: 2, cost: c({ white: 2, red: 1, black: 4 }) },
  { artKey: 'two-white-4', prestige: 3, cost: c({ white: 6 }) },
  { artKey: 'two-red-6', prestige: 2, cost: c({ white: 3, black: 5 }) },
  { artKey: 'two-red-5', prestige: 2, cost: c({ black: 5 }) },
  { artKey: 'two-red-3', prestige: 1, cost: c({ white: 2, red: 2, black: 3 }) },
  { artKey: 'two-red-2', prestige: 1, cost: c({ blue: 3, red: 2, black: 3 }) },
  { artKey: 'two-green-5', prestige: 2, cost: c({ blue: 5, green: 3 }) },
  { artKey: 'two-green-4', prestige: 3, cost: c({ green: 6 }) },
  { artKey: 'two-blue-6', prestige: 2, cost: c({ blue: 5 }) },
  { artKey: 'two-blue-1', prestige: 1, cost: c({ blue: 2, green: 2, red: 3 }) },
  { artKey: 'two-black-6', prestige: 1, cost: c({ white: 3, green: 3, black: 2 }) },
  { artKey: 'two-black-5', prestige: 2, cost: c({ blue: 1, green: 4, red: 2 }) },
  { artKey: 'two-black-4', prestige: 1, cost: c({ white: 3, blue: 2, green: 2 }) },
  { artKey: 'two-black-3', prestige: 2, cost: c({ green: 5, red: 3 }) },
  { artKey: 'two-black-2', prestige: 2, cost: c({ white: 5 }) },
  { artKey: 'two-black-1', prestige: 3, cost: c({ black: 6 }) },
  { artKey: 'two-white-6', prestige: 2, cost: c({ red: 5, black: 3 }) },
];

/** Level 3 — costs synced to Cloudinary card art */
const LEVEL_THREE_ROWS: DevCardRow[] = [
  { artKey: 'three-red-2', prestige: 5, cost: c({ green: 7, red: 3 }) },
  { artKey: 'three-white-3', prestige: 5, cost: c({ white: 3, black: 7 }) },
  { artKey: 'three-red-4', prestige: 4, cost: c({ green: 7 }) },
  { artKey: 'three-white-2', prestige: 4, cost: c({ white: 3, red: 3, black: 6 }) },
  { artKey: 'three-red-3', prestige: 3, cost: c({ white: 3, blue: 5, green: 3, black: 3 }) },
  { artKey: 'three-green-2', prestige: 5, cost: c({ blue: 7, green: 3 }) },
  { artKey: 'three-green-1', prestige: 3, cost: c({ white: 5, blue: 3, red: 3, black: 3 }) },
  { artKey: 'three-white-1', prestige: 4, cost: c({ black: 7 }) },
  { artKey: 'three-green-4', prestige: 4, cost: c({ white: 3, blue: 6, green: 3 }) },
  { artKey: 'three-white-4', prestige: 3, cost: c({ blue: 3, green: 3, red: 5, black: 3 }) },
  { artKey: 'three-red-1', prestige: 4, cost: c({ blue: 3, green: 6, red: 3 }) },
  { artKey: 'three-green-3', prestige: 4, cost: c({ blue: 7 }) },
  { artKey: 'three-blue-4', prestige: 5, cost: c({ white: 7, blue: 3 }) },
  { artKey: 'three-blue-3', prestige: 4, cost: c({ white: 6, blue: 3, black: 3 }) },
  { artKey: 'three-blue-2', prestige: 3, cost: c({ white: 3, green: 3, red: 3, black: 5 }) },
  { artKey: 'three-blue-1', prestige: 4, cost: c({ white: 7 }) },
  { artKey: 'three-black-4', prestige: 4, cost: c({ green: 3, red: 6, black: 3 }) },
  { artKey: 'three-black-3', prestige: 4, cost: c({ red: 7 }) },
  { artKey: 'three-black-2', prestige: 5, cost: c({ red: 7, black: 3 }) },
  { artKey: 'three-black-1', prestige: 3, cost: c({ white: 3, blue: 3, green: 5, red: 3 }) },
];

/** All development card artKeys — keep in sync with client splendorImageIds SPLENDOR_DEV_PUBLIC_IDS */
export const SPLENDOR_DEV_ART_KEYS = [
  ...LEVEL_ONE_ROWS.map((r) => r.artKey),
  ...LEVEL_TWO_ROWS.map((r) => r.artKey),
  ...LEVEL_THREE_ROWS.map((r) => r.artKey),
] as const;

export function buildDevelopmentDeck(): SplendorDevCardDef[] {
  return [
    ...LEVEL_ONE_ROWS.map(toCardDef),
    ...LEVEL_TWO_ROWS.map(toCardDef),
    ...LEVEL_THREE_ROWS.map(toCardDef),
  ];
}

export function getSplendorDevCard(artKey: string): SplendorDevCardDef | undefined {
  return buildDevelopmentDeck().find((c) => c.artKey === artKey);
}

export function validateSplendorDevelopmentDeck(): string[] {
  const errors: string[] = [];
  const deck = buildDevelopmentDeck();
  const byKey = new Map(deck.map((c) => [c.artKey, c]));

  if (deck.length !== 90) {
    errors.push(`Expected 90 cards, got ${deck.length}`);
  }

  const counts = splendorDeckCounts();
  if (counts[1] !== 40 || counts[2] !== 30 || counts[3] !== 20) {
    errors.push(`Level counts mismatch: ${JSON.stringify(counts)}`);
  }

  for (const artKey of SPLENDOR_DEV_ART_KEYS) {
    if (!byKey.has(artKey)) {
      errors.push(`Missing artKey in deck: ${artKey}`);
    }
  }

  if (byKey.size !== SPLENDOR_DEV_ART_KEYS.length) {
    errors.push(`Duplicate or unexpected artKeys in deck (${byKey.size} vs ${SPLENDOR_DEV_ART_KEYS.length})`);
  }

  const oneWhite5 = byKey.get('one-white-5');
  if (
    !oneWhite5 ||
    oneWhite5.cost.white !== 3 ||
    oneWhite5.cost.blue !== 1 ||
    oneWhite5.cost.black !== 1
  ) {
    errors.push('one-white-5 cost mismatch');
  }

  const twoWhite3 = byKey.get('two-white-3');
  if (
    !twoWhite3 ||
    twoWhite3.prestige !== 1 ||
    twoWhite3.cost.green !== 3 ||
    twoWhite3.cost.red !== 2 ||
    twoWhite3.cost.black !== 2
  ) {
    errors.push('two-white-3 cost mismatch');
  }

  const twoBlue1 = byKey.get('two-blue-1');
  if (
    !twoBlue1 ||
    twoBlue1.prestige !== 1 ||
    twoBlue1.cost.blue !== 2 ||
    twoBlue1.cost.green !== 2 ||
    twoBlue1.cost.red !== 3
  ) {
    errors.push('two-blue-1 cost mismatch');
  }

  const threeRed3 = byKey.get('three-red-3');
  if (
    !threeRed3 ||
    threeRed3.prestige !== 3 ||
    threeRed3.cost.white !== 3 ||
    threeRed3.cost.blue !== 5 ||
    threeRed3.cost.green !== 3 ||
    threeRed3.cost.black !== 3
  ) {
    errors.push('three-red-3 cost mismatch');
  }

  return errors;
}

export function buildNoblesDeck(): SplendorNobleDef[] {
  return [
    {
      id: 'noble-1',
      artKey: '1',
      name: "Catherine de' Medici",
      prestige: 3,
      requires: { ...z(), white: 4, blue: 4 },
    },
    {
      id: 'noble-2',
      artKey: '2',
      name: 'Elisabeth of Austria',
      prestige: 3,
      requires: { ...z(), blue: 4, green: 4 },
    },
    {
      id: 'noble-3',
      artKey: '3',
      name: 'Isabella I of Castile',
      prestige: 3,
      requires: { ...z(), green: 4, red: 4 },
    },
    {
      id: 'noble-4',
      artKey: '4',
      name: 'Niccolò Machiavelli',
      prestige: 3,
      requires: { ...z(), red: 4, black: 4 },
    },
    {
      id: 'noble-5',
      artKey: '5',
      name: 'Suleiman the Magnificent',
      prestige: 3,
      requires: { ...z(), black: 4, white: 4 },
    },
    {
      id: 'noble-6',
      artKey: '6',
      name: 'Anne of Brittany',
      prestige: 3,
      requires: { ...z(), white: 3, blue: 3, green: 3 },
    },
    {
      id: 'noble-7',
      artKey: '7',
      name: 'Charles V',
      prestige: 3,
      requires: { ...z(), blue: 3, green: 3, red: 3 },
    },
    {
      id: 'noble-8',
      artKey: '8',
      name: 'Francis I of France',
      prestige: 3,
      requires: { ...z(), green: 3, red: 3, black: 3 },
    },
    {
      id: 'noble-9',
      artKey: '9',
      name: 'Henry VIII',
      prestige: 3,
      requires: { ...z(), red: 3, black: 3, white: 3 },
    },
    {
      id: 'noble-10',
      artKey: '10',
      name: 'Mary Stuart',
      prestige: 3,
      requires: { ...z(), black: 3, white: 3, blue: 3 },
    },
  ];
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Count development cards per level — sanity check: 40 / 30 / 20 */
export function splendorDeckCounts(): Record<1 | 2 | 3, number> {
  const deck = buildDevelopmentDeck();
  return {
    1: deck.filter((c) => c.level === 1).length,
    2: deck.filter((c) => c.level === 2).length,
    3: deck.filter((c) => c.level === 3).length,
  };
}
