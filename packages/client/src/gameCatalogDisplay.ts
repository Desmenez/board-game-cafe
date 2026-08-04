import type { GameMeta } from 'shared';
import { imageMap } from './imageMap';

/** Local cover overrides — falls back to `game.thumbnail` from API */
export const GAME_CATALOG_COVERS: Record<string, string> = {
  avalon: imageMap.avalon.cover,
  'exploding-kittens': imageMap.explodingKittens.cover,
  codenames: imageMap.codenames.cover,
  'sheriff-of-nottingham': imageMap.sheriffOfNottingham.cover,
  'name-it': imageMap.nameIt.cover,
  insider: imageMap.insider.cover,
  'hues-and-cues': imageMap.huesAndCues.cover,
  'welcome-to-the-dungeon': imageMap.welcomeToTheDungeon.cover,
  'one-night-ultimate-werewolf': imageMap.oneNightUltimateWerewolf.cover,
  'cs-files': imageMap.csFiles.cover,
  'ticket-to-ride': imageMap.ticketToRide.cover,
  flip7: imageMap.flip7.cover,
  abracawhat: imageMap.abracawhat.cover,
  'camel-up': imageMap.camelUp.cover,
  'cup-the-crab': imageMap.cupTheCrab.cover,
  fugitive: imageMap.fugitive.cover,
  splendor: imageMap.splendor.cover,
  'love-letter': imageMap.loveLetter.cover,
  spyfall: imageMap.spyfall.cover,
  'sushi-go': imageMap.sushiGo.cover,
  'salem-1692': imageMap.salem1692.cover,
  'sky-team': imageMap.skyTeam.cover,
  marrakech: imageMap.marrakech.cover,
};

export function getCatalogThumb(game: GameMeta): string {
  return getGameCoverById(game.id) || game.thumbnail?.trim() || '';
}

/** Cover URL by game id — works without fetching the games catalog (e.g. invite toasts). */
export function getGameCoverById(gameId: string): string {
  const local = GAME_CATALOG_COVERS[gameId]?.trim();
  if (local) return local;
  return '';
}
