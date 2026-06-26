import type { SushiGoCard, SushiGoCardKind } from './types/sushi-go.js';

/** Pin after uploading a batch to Cloudinary — see `.cursor/design/cloudinary-assets.md` */
export const SUSHI_GO_CLOUD_VERSION = '';

const CLOUD_NAME = 'dpkqjlk3g';

export const SUSHI_GO_CARD_COUNTS: Record<SushiGoCardKind, number> = {
  tempura: 14,
  sashimi: 14,
  dumpling: 14,
  maki_1: 6,
  maki_2: 12,
  maki_3: 8,
  nigiri_squid: 5,
  nigiri_salmon: 10,
  nigiri_egg: 5,
  pudding: 10,
  wasabi: 6,
  chopsticks: 4,
};

/** Cloudinary public_id stems (folder: board-game-cafe/sushi-go/) */
export const SUSHI_GO_CARD_ART_KEYS: Record<SushiGoCardKind, string> = {
  tempura: 'tempura_PLACEHOLDER',
  sashimi: 'sashimi_PLACEHOLDER',
  dumpling: 'dumpling_PLACEHOLDER',
  maki_1: 'maki-1_PLACEHOLDER',
  maki_2: 'maki-2_PLACEHOLDER',
  maki_3: 'maki-3_PLACEHOLDER',
  nigiri_squid: 'nigiri-squid_PLACEHOLDER',
  nigiri_salmon: 'nigiri-salmon_PLACEHOLDER',
  nigiri_egg: 'nigiri-egg_PLACEHOLDER',
  pudding: 'pudding_PLACEHOLDER',
  wasabi: 'wasabi_PLACEHOLDER',
  chopsticks: 'chopsticks_PLACEHOLDER',
};

let cardSeq = 0;

export function sushiGoMakiIcons(kind: SushiGoCardKind): number {
  if (kind === 'maki_1') return 1;
  if (kind === 'maki_2') return 2;
  if (kind === 'maki_3') return 3;
  return 0;
}

export function isSushiGoNigiri(kind: SushiGoCardKind): boolean {
  return kind === 'nigiri_squid' || kind === 'nigiri_salmon' || kind === 'nigiri_egg';
}

export function isSushiGoMaki(kind: SushiGoCardKind): boolean {
  return kind === 'maki_1' || kind === 'maki_2' || kind === 'maki_3';
}

export function newSushiGoCard(kind: SushiGoCardKind): SushiGoCard {
  const id = `sg-${kind}-${cardSeq}`;
  cardSeq += 1;
  return { id, kind };
}

export function buildSushiGoDeck(): SushiGoCard[] {
  cardSeq = 0;
  const deck: SushiGoCard[] = [];
  for (const [kind, count] of Object.entries(SUSHI_GO_CARD_COUNTS) as [SushiGoCardKind, number][]) {
    for (let i = 0; i < count; i += 1) {
      deck.push(newSushiGoCard(kind));
    }
  }
  return deck;
}

/** Cards dealt per player by player count (rulebook) */
export function sushiGoCardsPerPlayer(playerCount: number): number {
  if (playerCount <= 2) return 10;
  if (playerCount === 3) return 9;
  if (playerCount === 4) return 8;
  return 7;
}

export function sushiGoCardImagePath(artKey: string): string {
  const version = SUSHI_GO_CLOUD_VERSION || 'vPLACEHOLDER';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${version}/${artKey}`;
}

export function sushiGoCardLabel(kind: SushiGoCardKind): string {
  const labels: Record<SushiGoCardKind, string> = {
    tempura: 'Tempura',
    sashimi: 'Sashimi',
    dumpling: 'Dumpling',
    maki_1: 'Maki (1)',
    maki_2: 'Maki (2)',
    maki_3: 'Maki (3)',
    nigiri_squid: 'Squid Nigiri',
    nigiri_salmon: 'Salmon Nigiri',
    nigiri_egg: 'Egg Nigiri',
    pudding: 'Pudding',
    wasabi: 'Wasabi',
    chopsticks: 'Chopsticks',
  };
  return labels[kind];
}
