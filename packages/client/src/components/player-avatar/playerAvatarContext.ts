import { createContext, useContext } from 'react';
import type { PlayerAvatarConfig } from 'shared';

export const PlayerAvatarContext = createContext<ReadonlyMap<string, PlayerAvatarConfig>>(
  new Map(),
);

export function usePlayerAvatar(playerId: string): PlayerAvatarConfig | undefined {
  return useContext(PlayerAvatarContext).get(playerId);
}
