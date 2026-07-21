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

export async function fetchMyMatchHistory(userId: string): Promise<MatchHistoryItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: myRows, error: myError } = await client
    .from('match_players')
    .select('match_id, is_winner')
    .eq('user_id', userId)
    .order('match_id', { ascending: false });

  if (myError || !myRows?.length) {
    if (myError) console.error('fetchMyMatchHistory seats', myError);
    return [];
  }

  const matchIds = [...new Set(myRows.map((row) => row.match_id as string))];
  const wonByMatch = new Map(myRows.map((row) => [row.match_id as string, Boolean(row.is_winner)]));

  const { data: matches, error: matchError } = await client
    .from('matches')
    .select('id, game_id, room_code, started_at, ended_at, result_reason')
    .in('id', matchIds)
    .order('ended_at', { ascending: false });

  if (matchError || !matches) {
    if (matchError) console.error('fetchMyMatchHistory matches', matchError);
    return [];
  }

  const { data: players, error: playersError } = await client
    .from('match_players')
    .select('match_id, display_name, is_winner, user_id')
    .in('match_id', matchIds);

  if (playersError) {
    console.error('fetchMyMatchHistory players', playersError);
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

  return matches.map((match) => ({
    id: match.id as string,
    game_id: match.game_id as string,
    room_code: match.room_code as string,
    started_at: match.started_at as string,
    ended_at: match.ended_at as string,
    result_reason: match.result_reason as string,
    players: playersByMatch.get(match.id as string) ?? [],
    iWon: wonByMatch.get(match.id as string) ?? false,
  }));
}
