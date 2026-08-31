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
  return (
    <GamePlaySessionContext.Provider value={value}>{children}</GamePlaySessionContext.Provider>
  );
}

/** Fast refresh: this module's public API is the provider plus the session hook. */
// eslint-disable-next-line react-refresh/only-export-components
export function useGamePlaySession(): GamePlaySessionValue | null {
  return useContext(GamePlaySessionContext);
}
