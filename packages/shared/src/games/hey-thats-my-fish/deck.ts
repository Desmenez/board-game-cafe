import {
  HEY_THATS_MY_FISH_ART_BY_FISH,
  HEY_THATS_MY_FISH_DECK_COUNTS,
  HEY_THATS_MY_FISH_TILE_COUNT,
  type HeyThatsMyFishArtKey,
  type HeyThatsMyFishFishValue,
  type HeyThatsMyFishHex,
} from './types.js';

function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/**
 * Artwork is shuffled *inside* each fish-value pile. Fish counts stay 30 / 20 / 10.
 * 4-fish variants are never drawn into this edition’s deck.
 */
function artPile(
  fish: HeyThatsMyFishFishValue,
  count: number,
  random: () => number,
): HeyThatsMyFishArtKey[] {
  const variants = HEY_THATS_MY_FISH_ART_BY_FISH[fish];
  const bag = Array.from({ length: count }, (_, index) => variants[index % variants.length]!);
  return shuffleInPlace(bag, random);
}

const FISH_VALUES = [1, 2, 3] as const satisfies readonly HeyThatsMyFishFishValue[];

export function createHeyThatsMyFishDeck(random = Math.random): HeyThatsMyFishHex[] {
  const tiles: Array<{ fish: HeyThatsMyFishFishValue; artKey: HeyThatsMyFishArtKey }> = [];
  for (const fish of FISH_VALUES) {
    const count = HEY_THATS_MY_FISH_DECK_COUNTS[fish];
    for (const artKey of artPile(fish, count, random)) {
      tiles.push({ fish, artKey });
    }
  }
  shuffleInPlace(tiles, random);
  if (tiles.length !== HEY_THATS_MY_FISH_TILE_COUNT) {
    throw new Error(`Hey That's My Fish deck must be ${HEY_THATS_MY_FISH_TILE_COUNT} tiles`);
  }
  return tiles.map((tile, id) => ({
    id,
    fish: tile.fish,
    artKey: tile.artKey,
    penguinId: null,
  }));
}
