import type { PlayerAvatarConfig } from 'shared';
import { getSupabaseClient } from './index';

export interface LeaderboardEntry {
  userId: string;
  handle: string;
  displayName: string;
  avatarConfig: PlayerAvatarConfig | unknown;
  avatarUrl?: string | null;
  avatarDisplay?: 'character' | 'photo' | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

const DEFAULT_LIMIT = 50;

/**
 * Aggregate wins / games for a game from match_players (RLS filters to
 * opted-in profiles). Guests (null user_id) never appear.
 */
export async function fetchGameLeaderboard(
  gameId: string,
  limit = DEFAULT_LIMIT,
): Promise<LeaderboardEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: rows, error } = await client
    .from('match_players')
    .select('user_id, is_winner, matches!inner(game_id)')
    .eq('matches.game_id', gameId)
    .not('user_id', 'is', null);

  if (error) {
    console.error('fetchGameLeaderboard seats', error);
    return [];
  }
  if (!rows?.length) return [];

  const stats = new Map<string, { gamesPlayed: number; wins: number }>();
  for (const row of rows) {
    const userId = row.user_id as string | null;
    if (!userId) continue;
    const prev = stats.get(userId) ?? { gamesPlayed: 0, wins: 0 };
    prev.gamesPlayed += 1;
    if (row.is_winner) prev.wins += 1;
    stats.set(userId, prev);
  }

  const userIds = [...stats.keys()];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select(
      'id, handle, display_name, avatar_config, avatar_url, avatar_display, show_on_leaderboard',
    )
    .in('id', userIds)
    .eq('show_on_leaderboard', true);

  if (profileError) {
    console.error('fetchGameLeaderboard profiles', profileError);
    return [];
  }

  const entries: LeaderboardEntry[] = [];
  for (const profile of profiles ?? []) {
    const id = profile.id as string;
    const s = stats.get(id);
    if (!s) continue;
    const winRate = s.gamesPlayed > 0 ? s.wins / s.gamesPlayed : 0;
    entries.push({
      userId: id,
      handle: profile.handle as string,
      displayName: profile.display_name as string,
      avatarConfig: profile.avatar_config,
      avatarUrl: (profile.avatar_url as string | null) ?? null,
      avatarDisplay: (profile.avatar_display as 'character' | 'photo' | null) ?? null,
      gamesPlayed: s.gamesPlayed,
      wins: s.wins,
      winRate,
    });
  }

  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return a.displayName.localeCompare(b.displayName, 'th');
  });

  return entries.slice(0, limit);
}
