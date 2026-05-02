import type { GameMeta } from 'shared';
import { imageMap } from './imageMap';

/** Local cover overrides — falls back to `game.thumbnail` from API */
export const GAME_CATALOG_COVERS: Record<string, string> = {
  avalon: imageMap.avalon.cover,
  'exploding-kittens': imageMap.explodingKittens.cover,
  'sheriff-of-nottingham': imageMap.sheriffOfNottingham.cover,
  'name-it': imageMap.nameIt.cover,
  insider: imageMap.insider.cover,
  'hues-and-cues': imageMap.huesAndCues.cover,
  'welcome-to-the-dungeon': imageMap.welcomeToTheDungeon.cover,
  'one-night-ultimate-werewolf': imageMap.oneNightUltimateWerewolf.cover,
};

export function getCatalogThumb(game: GameMeta): string {
  return GAME_CATALOG_COVERS[game.id] ?? game.thumbnail?.trim() ?? '';
}
