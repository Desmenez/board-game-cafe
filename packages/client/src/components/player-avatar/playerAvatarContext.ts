import { createContext, useContext } from 'react';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';

export interface PlayerAvatarSeat {
  avatar: PlayerAvatarConfig;
  avatarUrl?: string;
  avatarDisplay?: PlayerAvatarDisplay;
}

export const PlayerAvatarContext = createContext<ReadonlyMap<string, PlayerAvatarSeat>>(new Map());

export function usePlayerAvatar(playerId: string): PlayerAvatarSeat | undefined {
  return useContext(PlayerAvatarContext).get(playerId);
}
