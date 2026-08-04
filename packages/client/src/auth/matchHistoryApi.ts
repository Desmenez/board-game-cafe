import { getSupabaseClient } from './index';

export interface MatchHistoryPlayer {
  display_name: string;
  is_winner: boolean;
  user_id: string | null;
}

export interface MatchHistoryItem {
  id: string;
  game_id: string;
  room_code: string;
  started_at: string;
  ended_at: string;
  result_reason: string;
  players: MatchHistoryPlayer[];
  iWon: boolean;
}

export interface MatchHistoryPage {
  items: MatchHistoryItem[];
  /** Next page offset, or null when exhausted. */
  nextOffset: number | null;
}

export interface MatchHistoryStats {
  total: number;
  wins: number;
}

export const MATCH_HISTORY_PAGE_SIZE = 10;

type MatchHistoryRow = {
  id: string;
  game_id: string;
  room_code: string;
  started_at: string;
  ended_at: string;
  result_reason: string;
};

/**
 * One page of the signed-in user's matches, newest `ended_at` first.
 * Offset is in match rows (one per match for this user).
 */
export async function fetchMyMatchHistoryPage(
  userId: string,
  offset: number,
  pageSize = MATCH_HISTORY_PAGE_SIZE,
): Promise<MatchHistoryPage> {
  const client = getSupabaseClient();
  if (!client) return { items: [], nextOffset: null };

  const to = offset + pageSize - 1;
  // Query matches (not match_players) so ORDER BY ended_at works on the root table.
  const { data: matches, error: matchError } = await client
    .from('matches')
    .select(
      `
      id,
      game_id,
      room_code,
      started_at,
      ended_at,
      result_reason,
      match_players!inner ( user_id )
    `,
    )
    .eq('match_players.user_id', userId)
    .order('ended_at', { ascending: false })
    .range(offset, to);

  if (matchError) {
    console.error('fetchMyMatchHistoryPage matches', matchError);
    return { items: [], nextOffset: null };
  }

  const rows = (matches ?? []) as unknown as MatchHistoryRow[];
  if (rows.length === 0) return { items: [], nextOffset: null };

  const matchIds = rows.map((row) => row.id);

  const { data: players, error: playersError } = await client
    .from('match_players')
    .select('match_id, display_name, is_winner, user_id')
    .in('match_id', matchIds);

  if (playersError) {
    console.error('fetchMyMatchHistoryPage players', playersError);
  }

  const playersByMatch = new Map<string, MatchHistoryPlayer[]>();
  for (const row of players ?? []) {
    const list = playersByMatch.get(row.match_id as string) ?? [];
    list.push({
      display_name: row.display_name as string,
      is_winner: Boolean(row.is_winner),
      user_id: (row.user_id as string | null) ?? null,
    });
    playersByMatch.set(row.match_id as string, list);
  }

  const items: MatchHistoryItem[] = rows.map((match) => {
    const roster = playersByMatch.get(match.id) ?? [];
    return {
      id: match.id,
      game_id: match.game_id,
      room_code: match.room_code,
      started_at: match.started_at,
      ended_at: match.ended_at,
      result_reason: match.result_reason,
      players: roster,
      iWon: roster.some((p) => p.user_id === userId && p.is_winner),
    };
  });

  const nextOffset = rows.length < pageSize ? null : offset + rows.length;
  return { items, nextOffset };
}

/** Aggregate counts for the summary strip (not loaded page-by-page). */
export async function fetchMyMatchHistoryStats(userId: string): Promise<MatchHistoryStats> {
  const client = getSupabaseClient();
  if (!client) return { total: 0, wins: 0 };

  const [totalRes, winsRes] = await Promise.all([
    client.from('match_players').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    client
      .from('match_players')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_winner', true),
  ]);

  if (totalRes.error) console.error('fetchMyMatchHistoryStats total', totalRes.error);
  if (winsRes.error) console.error('fetchMyMatchHistoryStats wins', winsRes.error);

  return {
    total: totalRes.count ?? 0,
    wins: winsRes.count ?? 0,
  };
}
