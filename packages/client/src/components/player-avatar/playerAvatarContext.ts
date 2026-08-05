import { createContext, useContext } from 'react';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';

export interface PlayerAvatarSeat {
  avatar: PlayerAvatarConfig;
  avatarUrl?: string;
  avatarDisplay?: PlayerAvatarDisplay;
  equippedNameplateId?: string;
  equippedTitleId?: string;
  equippedIconId?: string;
}

export const PlayerAvatarContext = createContext<ReadonlyMap<string, PlayerAvatarSeat>>(new Map());

export function usePlayerAvatar(playerId: string): PlayerAvatarSeat | undefined {
  return useContext(PlayerAvatarContext).get(playerId);
}
