/**
 * Profile icons (เหรียญตรา) — badge overlay on the avatar.
 * Definitions live in code; unlocks reuse `achievement_unlocks`.
 */

import { GAME_REWARD_TRACKS } from './achievements.js';

export const NO_ICON_ID = 'none';

export interface IconDef {
  id: string;
  label: string;
  description: string;
  imageUrl: string;
  /** Optional game association for sectioned profile UI. */
  gameId?: string;
}

export const ICONS: readonly IconDef[] = GAME_REWARD_TRACKS.flatMap((achievement) =>
  achievement.reward.type === 'icon' && achievement.cosmetic.imageUrl
    ? [
        {
          id: achievement.reward.id,
          label: achievement.cosmetic.label,
          description: achievement.description,
          imageUrl: achievement.cosmetic.imageUrl,
          gameId: achievement.cosmetic.gameId,
        },
      ]
    : [],
);

const ICON_BY_ID = new Map(ICONS.map((i) => [i.id, i]));

export function getIconDef(id: string | null | undefined): IconDef | undefined {
  if (!id || id === NO_ICON_ID) return undefined;
  return ICON_BY_ID.get(id);
}

/** Normalize DB / wire value; unknown → none. */
export function normalizeIconId(value: unknown): string {
  if (typeof value === 'string' && (value === NO_ICON_ID || ICON_BY_ID.has(value))) {
    return value;
  }
  return NO_ICON_ID;
}

export function isKnownIconId(id: string): boolean {
  return id === NO_ICON_ID || ICON_BY_ID.has(id);
}

export function isFreeIcon(id: string): boolean {
  return id === NO_ICON_ID;
}
