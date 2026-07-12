import type { LoveLetterCard, LoveLetterRole } from './types/love-letter.js';

/** Pin after uploading a batch to Cloudinary — see `.agents/design/cloudinary-assets.md` */
export const LOVE_LETTER_CLOUD_VERSION = '';

const CLOUD_NAME = 'dpkqjlk3g';

export const LOVE_LETTER_CLASSIC_COUNTS: Record<LoveLetterRole, number> = {
  guard: 5,
  priest: 2,
  baron: 2,
  handmaid: 2,
  prince: 2,
  king: 1,
  countess: 1,
  princess: 1,
};

/** Cloudinary public_id stems (folder: board-game-cafe/love-letter/cards/) */
export const LOVE_LETTER_CARD_ART_KEYS: Record<LoveLetterRole, string> = {
  guard: 'guard_PLACEHOLDER',
  priest: 'priest_PLACEHOLDER',
  baron: 'baron_PLACEHOLDER',
  handmaid: 'handmaid_PLACEHOLDER',
  prince: 'prince_PLACEHOLDER',
  king: 'king_PLACEHOLDER',
  countess: 'countess_PLACEHOLDER',
  princess: 'princess_PLACEHOLDER',
};

// Premium roles (5–8 players) — wire when expanding:
// bishop, dowager_queen, constable, count, sycophant, baroness, cardinal, guard_dougual, jester, assassin

const RANK_BY_ROLE: Record<LoveLetterRole, number> = {
  guard: 1,
  priest: 2,
  baron: 3,
  handmaid: 4,
  prince: 5,
  king: 6,
  countess: 7,
  princess: 8,
};

let cardSeq = 0;

export function loveLetterRank(role: LoveLetterRole): number {
  return RANK_BY_ROLE[role];
}

export function newLoveLetterCard(role: LoveLetterRole): LoveLetterCard {
  const id = `ll-${role}-${cardSeq}`;
  cardSeq += 1;
  return { id, role, rank: RANK_BY_ROLE[role] };
}

export function buildClassicDeck(): LoveLetterCard[] {
  cardSeq = 0;
  const deck: LoveLetterCard[] = [];
  for (const [role, count] of Object.entries(LOVE_LETTER_CLASSIC_COUNTS) as [
    LoveLetterRole,
    number,
  ][]) {
    for (let i = 0; i < count; i += 1) {
      deck.push(newLoveLetterCard(role));
    }
  }
  return deck;
}

export function loveLetterCardImagePath(artKey: string): string {
  const version = LOVE_LETTER_CLOUD_VERSION || 'vPLACEHOLDER';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${version}/${artKey}`;
}
