import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type GamePlaySessionValue = {
  gameId: string;
  /** Resolved catalog / room thumbnail — same URL the lobby and leaderboard use. */
  coverUrl?: string;
};

const GamePlaySessionContext = createContext<GamePlaySessionValue | null>(null);

export function GamePlaySessionProvider({
  gameId,
  coverUrl,
  children,
}: GamePlaySessionValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ gameId, coverUrl: coverUrl?.trim() || undefined }),
    [gameId, coverUrl],
  );
  return <GamePlaySessionContext.Provider value={value}>{children}</GamePlaySessionContext.Provider>;
}

export function useGamePlaySession(): GamePlaySessionValue | null {
  return useContext(GamePlaySessionContext);
}
