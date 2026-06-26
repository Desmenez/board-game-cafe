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

function z(): SplendorGems {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

const LEVEL_PREFIX: Record<1 | 2 | 3, string> = { 1: 'one', 2: 'two', 3: 'three' };

const CSV_BONUS: Record<string, SplendorGem> = {
  White: 'white',
  Blue: 'blue',
  Green: 'green',
  Red: 'red',
  Black: 'black',
};

/** Official Splendor development cards — source: bouk/splendimax Splendor Cards.csv */
const DEV_ROWS: Array<{
  level: 1 | 2 | 3;
  bonus: keyof typeof CSV_BONUS;
  prestige: number;
  cost: SplendorGems;
}> = [
  { level: 1, bonus: 'Black', prestige: 0, cost: { ...z(), blue: 1, green: 1, red: 1, white: 1 } },
  { level: 1, bonus: 'Black', prestige: 0, cost: { ...z(), blue: 2, green: 1, red: 1, white: 1 } },
  { level: 1, bonus: 'Black', prestige: 0, cost: { ...z(), blue: 2, red: 1, white: 2 } },
  { level: 1, bonus: 'Black', prestige: 0, cost: { ...z(), white: 1, green: 1, red: 3 } },
  { level: 1, bonus: 'Black', prestige: 0, cost: { ...z(), green: 2, red: 1 } },
  { level: 1, bonus: 'Black', prestige: 0, cost: { ...z(), green: 2, white: 2 } },
  { level: 1, bonus: 'Black', prestige: 0, cost: { ...z(), green: 3 } },
  { level: 1, bonus: 'Black', prestige: 1, cost: { ...z(), blue: 4 } },
  { level: 1, bonus: 'Blue', prestige: 0, cost: { ...z(), black: 1, green: 1, red: 1, white: 1 } },
  { level: 1, bonus: 'Blue', prestige: 0, cost: { ...z(), black: 1, green: 1, red: 2, white: 1 } },
  { level: 1, bonus: 'Blue', prestige: 0, cost: { ...z(), green: 2, red: 2, white: 1 } },
  { level: 1, bonus: 'Blue', prestige: 0, cost: { ...z(), green: 3, red: 1, white: 1 } },
  { level: 1, bonus: 'Blue', prestige: 0, cost: { ...z(), black: 2, white: 1 } },
  { level: 1, bonus: 'Blue', prestige: 0, cost: { ...z(), black: 2, green: 2 } },
  { level: 1, bonus: 'Blue', prestige: 0, cost: { ...z(), black: 3 } },
  { level: 1, bonus: 'Blue', prestige: 1, cost: { ...z(), red: 4 } },
  { level: 1, bonus: 'White', prestige: 0, cost: { ...z(), black: 1, blue: 1, green: 1, red: 1 } },
  { level: 1, bonus: 'White', prestige: 0, cost: { ...z(), black: 1, blue: 1, green: 2, red: 1 } },
  { level: 1, bonus: 'White', prestige: 0, cost: { ...z(), black: 1, green: 2, red: 2 } },
  { level: 1, bonus: 'White', prestige: 0, cost: { ...z(), black: 1, blue: 1, green: 3 } },
  { level: 1, bonus: 'White', prestige: 0, cost: { ...z(), black: 1, red: 2 } },
  { level: 1, bonus: 'White', prestige: 0, cost: { ...z(), black: 2, green: 2 } },
  { level: 1, bonus: 'White', prestige: 0, cost: { ...z(), green: 3 } },
  { level: 1, bonus: 'White', prestige: 1, cost: { ...z(), red: 4 } },
  { level: 1, bonus: 'Green', prestige: 0, cost: { ...z(), black: 1, blue: 1, red: 1, white: 1 } },
  { level: 1, bonus: 'Green', prestige: 0, cost: { ...z(), black: 2, blue: 1, red: 1, white: 1 } },
  { level: 1, bonus: 'Green', prestige: 0, cost: { ...z(), black: 2, blue: 1, red: 2 } },
  { level: 1, bonus: 'Green', prestige: 0, cost: { ...z(), blue: 3, red: 1, white: 1 } },
  { level: 1, bonus: 'Green', prestige: 0, cost: { ...z(), blue: 1, white: 2 } },
  { level: 1, bonus: 'Green', prestige: 0, cost: { ...z(), black: 2, white: 2 } },
  { level: 1, bonus: 'Green', prestige: 0, cost: { ...z(), red: 3 } },
  { level: 1, bonus: 'Green', prestige: 1, cost: { ...z(), black: 4 } },
  { level: 1, bonus: 'Red', prestige: 0, cost: { ...z(), black: 1, blue: 1, green: 1, white: 1 } },
  { level: 1, bonus: 'Red', prestige: 0, cost: { ...z(), black: 1, blue: 1, green: 1, white: 2 } },
  { level: 1, bonus: 'Red', prestige: 0, cost: { ...z(), black: 2, blue: 1, white: 2 } },
  { level: 1, bonus: 'Red', prestige: 0, cost: { ...z(), black: 3, blue: 1, white: 1 } },
  { level: 1, bonus: 'Red', prestige: 0, cost: { ...z(), blue: 2, green: 1 } },
  { level: 1, bonus: 'Red', prestige: 0, cost: { ...z(), green: 2, white: 2 } },
  { level: 1, bonus: 'Red', prestige: 0, cost: { ...z(), white: 3 } },
  { level: 1, bonus: 'Red', prestige: 1, cost: { ...z(), black: 4 } },
  { level: 2, bonus: 'Black', prestige: 1, cost: { ...z(), blue: 2, green: 2, white: 3 } },
  { level: 2, bonus: 'Black', prestige: 1, cost: { ...z(), black: 2, green: 3, white: 3 } },
  { level: 2, bonus: 'Black', prestige: 2, cost: { ...z(), blue: 1, green: 4, red: 2 } },
  { level: 2, bonus: 'Black', prestige: 2, cost: { ...z(), green: 5, red: 3 } },
  { level: 2, bonus: 'Black', prestige: 2, cost: { ...z(), white: 5 } },
  { level: 2, bonus: 'Black', prestige: 3, cost: { ...z(), black: 6 } },
  { level: 2, bonus: 'Blue', prestige: 1, cost: { ...z(), black: 2, green: 2, red: 3 } },
  { level: 2, bonus: 'Blue', prestige: 1, cost: { ...z(), black: 3, blue: 2, green: 3 } },
  { level: 2, bonus: 'Blue', prestige: 2, cost: { ...z(), black: 3, white: 5 } },
  { level: 2, bonus: 'Blue', prestige: 2, cost: { ...z(), black: 4, red: 1, white: 2 } },
  { level: 2, bonus: 'Blue', prestige: 2, cost: { ...z(), black: 5 } },
  { level: 2, bonus: 'Blue', prestige: 3, cost: { ...z(), blue: 6 } },
  { level: 2, bonus: 'White', prestige: 1, cost: { ...z(), black: 2, green: 3, red: 2 } },
  { level: 2, bonus: 'White', prestige: 1, cost: { ...z(), blue: 3, red: 3, white: 2 } },
  { level: 2, bonus: 'White', prestige: 2, cost: { ...z(), black: 2, blue: 1, red: 4 } },
  { level: 2, bonus: 'White', prestige: 2, cost: { ...z(), black: 3, white: 5 } },
  { level: 2, bonus: 'White', prestige: 2, cost: { ...z(), white: 5 } },
  { level: 2, bonus: 'White', prestige: 3, cost: { ...z(), red: 6 } },
  { level: 2, bonus: 'Green', prestige: 1, cost: { ...z(), blue: 3, red: 3, white: 2 } },
  { level: 2, bonus: 'Green', prestige: 1, cost: { ...z(), black: 2, blue: 3, white: 2 } },
  { level: 2, bonus: 'Green', prestige: 2, cost: { ...z(), black: 1, blue: 2, red: 4 } },
  { level: 2, bonus: 'Green', prestige: 2, cost: { ...z(), black: 5, red: 3 } },
  { level: 2, bonus: 'Green', prestige: 2, cost: { ...z(), green: 5 } },
  { level: 2, bonus: 'Green', prestige: 3, cost: { ...z(), green: 6 } },
  { level: 2, bonus: 'Red', prestige: 1, cost: { ...z(), black: 3, green: 2, white: 2 } },
  { level: 2, bonus: 'Red', prestige: 1, cost: { ...z(), black: 3, blue: 3, green: 2 } },
  { level: 2, bonus: 'Red', prestige: 2, cost: { ...z(), blue: 4, green: 2, white: 1 } },
  { level: 2, bonus: 'Red', prestige: 2, cost: { ...z(), black: 5, white: 3 } },
  { level: 2, bonus: 'Red', prestige: 2, cost: { ...z(), black: 5 } },
  { level: 2, bonus: 'Red', prestige: 3, cost: { ...z(), red: 6 } },
  { level: 3, bonus: 'Black', prestige: 3, cost: { ...z(), blue: 3, green: 5, red: 3, white: 3 } },
  { level: 3, bonus: 'Black', prestige: 4, cost: { ...z(), red: 7 } },
  { level: 3, bonus: 'Black', prestige: 4, cost: { ...z(), black: 3, green: 3, red: 6 } },
  { level: 3, bonus: 'Black', prestige: 5, cost: { ...z(), black: 3, red: 7 } },
  { level: 3, bonus: 'Blue', prestige: 3, cost: { ...z(), black: 5, green: 3, red: 3, white: 3 } },
  { level: 3, bonus: 'Blue', prestige: 4, cost: { ...z(), white: 7 } },
  { level: 3, bonus: 'Blue', prestige: 4, cost: { ...z(), black: 3, blue: 3, white: 6 } },
  { level: 3, bonus: 'Blue', prestige: 5, cost: { ...z(), blue: 3, white: 7 } },
  { level: 3, bonus: 'White', prestige: 3, cost: { ...z(), black: 3, blue: 3, green: 3, red: 5 } },
  { level: 3, bonus: 'White', prestige: 4, cost: { ...z(), black: 7 } },
  { level: 3, bonus: 'White', prestige: 4, cost: { ...z(), black: 6, green: 3, red: 3 } },
  { level: 3, bonus: 'White', prestige: 5, cost: { ...z(), black: 7, red: 3 } },
  { level: 3, bonus: 'Green', prestige: 3, cost: { ...z(), black: 3, blue: 3, green: 3, white: 5 } },
  { level: 3, bonus: 'Green', prestige: 4, cost: { ...z(), blue: 7 } },
  { level: 3, bonus: 'Green', prestige: 4, cost: { ...z(), blue: 6, green: 3, white: 3 } },
  { level: 3, bonus: 'Green', prestige: 5, cost: { ...z(), blue: 7, green: 3 } },
  { level: 3, bonus: 'Red', prestige: 3, cost: { ...z(), black: 3, blue: 5, green: 3, white: 3 } },
  { level: 3, bonus: 'Red', prestige: 4, cost: { ...z(), green: 7 } },
  { level: 3, bonus: 'Red', prestige: 4, cost: { ...z(), blue: 3, green: 6, white: 3 } },
  { level: 3, bonus: 'Red', prestige: 5, cost: { ...z(), green: 7, white: 3 } },
];

export function buildDevelopmentDeck(): SplendorDevCardDef[] {
  const counters: Record<string, number> = {};
  const cards: SplendorDevCardDef[] = [];

  for (const row of DEV_ROWS) {
    const bonus = CSV_BONUS[row.bonus];
    const key = `${row.level}-${bonus}`;
    const idx = (counters[key] ?? 0) + 1;
    counters[key] = idx;
    const prefix = LEVEL_PREFIX[row.level];
    const artKey = `${prefix}-${bonus}-${idx}`;
    cards.push({
      id: artKey,
      artKey,
      level: row.level,
      bonus,
      prestige: row.prestige,
      cost: { ...row.cost },
    });
  }

  return cards;
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
