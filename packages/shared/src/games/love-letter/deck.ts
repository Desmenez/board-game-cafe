import type { LoveLetterCard, LoveLetterRole } from './types.js';

/** Pin after uploading a batch to Cloudinary — see `.agents/design/cloudinary-assets.md` */
export const LOVE_LETTER_CLOUD_VERSION = 'v1786415833';

/** Cover uploaded slightly later than the card batch */
export const LOVE_LETTER_COVER_CLOUD_VERSION = 'v1786415876';

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

export const LOVE_LETTER_COVER_PUBLIC_ID = 'cover_vipl0o';
export const LOVE_LETTER_BACK_CARD_PUBLIC_ID = 'back-card_kjgfan';

/** Classic roles mapped to 2019 art by character (card-N ≈ printed rank).
 * King/Countess/Princess use card-7/8/9; card-6 is Chancellor (unused in Classic). */
export const LOVE_LETTER_CARD_ART_KEYS: Record<LoveLetterRole, string> = {
  guard: 'card-1_lfwg6c',
  priest: 'card-2_ywtufp',
  baron: 'card-3_qmhkl4',
  handmaid: 'card-4_tstdsu',
  prince: 'card-5_pshgap',
  king: 'card-7_i2phjx',
  countess: 'card-8_m9dwf4',
  princess: 'card-9_kdm71t',
};

/** Premium stubs — Spy (0) / Chancellor (6) art already uploaded */
export const LOVE_LETTER_PREMIUM_ART_KEYS = {
  spy: 'card-0_tw2kvj',
  chancellor: 'card-6_lusnkv',
} as const;

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
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${LOVE_LETTER_CLOUD_VERSION}/${artKey}`;
}

export function loveLetterCoverImagePath(): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${LOVE_LETTER_COVER_CLOUD_VERSION}/${LOVE_LETTER_COVER_PUBLIC_ID}`;
}
