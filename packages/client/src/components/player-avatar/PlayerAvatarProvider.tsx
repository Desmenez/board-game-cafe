import { useMemo, type ReactNode } from 'react';
import type { Player } from 'shared';
import { PlayerAvatarContext } from './playerAvatarContext';

interface PlayerAvatarProviderProps {
  players: readonly Player[] | null | undefined;
  children: ReactNode;
}

export function PlayerAvatarProvider({ players, children }: PlayerAvatarProviderProps) {
  const avatars = useMemo(
    () =>
      new Map(
        (players ?? []).map((player) => [
          player.id,
          {
            avatar: player.avatar,
            ...(player.avatarUrl ? { avatarUrl: player.avatarUrl } : {}),
          },
        ]),
      ),
    [players],
  );

  return <PlayerAvatarContext value={avatars}>{children}</PlayerAvatarContext>;
}
