import { createContext, useContext } from 'react';
import type { PlayerAvatarConfig } from 'shared';

export interface PlayerAvatarSeat {
  avatar: PlayerAvatarConfig;
  avatarUrl?: string;
}

export const PlayerAvatarContext = createContext<ReadonlyMap<string, PlayerAvatarSeat>>(new Map());

export function usePlayerAvatar(playerId: string): PlayerAvatarSeat | undefined {
  return useContext(PlayerAvatarContext).get(playerId);
}
