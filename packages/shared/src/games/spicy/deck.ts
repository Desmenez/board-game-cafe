import type { SpicyCard, SpicySpice } from './types.js';

const SPICES: SpicySpice[] = ['chili', 'wasabi', 'pepper'];

/**
 * Cards remaining *above* World's End after dealing (drawn before WE tops).
 * Approximate physical ruler marks on the World's End card by player count.
 */
export const SPICY_CARDS_ABOVE_WORLDS_END: Record<number, number> = {
  2: 48,
  3: 42,
  4: 36,
  5: 30,
  6: 24,
};

/** Build the 100-card spicy deck (3 of each number×spice + 5 wilds each). */
export function buildSpicyDeck(): SpicyCard[] {
  const cards: SpicyCard[] = [];
  let n = 0;
  for (const spice of SPICES) {
    for (let num = 1; num <= 10; num += 1) {
      for (let copy = 0; copy < 3; copy += 1) {
        n += 1;
        cards.push({
          id: `spicy-${spice}-${num}-${copy}`,
          kind: 'numbered',
          spice,
          number: num,
        });
      }
    }
  }
  for (let i = 0; i < 5; i += 1) {
    cards.push({ id: `spicy-wild-number-${i}`, kind: 'wild_number' });
    cards.push({ id: `spicy-wild-spice-${i}`, kind: 'wild_spice' });
  }
  if (cards.length !== 100) {
    throw new Error(`Spicy deck must be 100 cards, got ${cards.length}`);
  }
  return cards;
}

/**
 * Insert World's End sentinel conceptually: return how many cards sit above it
 * (from the top of the draw pile). Clamped to deck size.
 */
export function worldsEndCardsAbove(playerCount: number, drawPileSize: number): number {
  const target = SPICY_CARDS_ABOVE_WORLDS_END[playerCount] ?? 36;
  return Math.max(0, Math.min(drawPileSize - 1, target));
}
