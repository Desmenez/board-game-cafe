import type { Player } from 'shared';
import type { ServerRoom } from '../room-manager.js';
import { getSupabaseAdmin, isAuthConfigured } from './index.js';

export interface MatchResultPayload {
  winners: string[];
  reason: string;
}

/**
 * Persist a finished match. Guests are stored without user_id.
 * No-op when Supabase service role is not configured.
 * Safe to call fire-and-forget; errors are logged only.
 */
export async function persistMatchResult(
  room: ServerRoom,
  result: MatchResultPayload,
): Promise<void> {
  if (!isAuthConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  try {
    const startedAt = new Date(room.createdAt).toISOString();
    const endedAt = new Date().toISOString();
    const winnerSet = new Set(result.winners);

    const { data: match, error: matchError } = await admin
      .from('matches')
      .insert({
        game_id: room.gameId,
        room_code: room.code,
        started_at: startedAt,
        ended_at: endedAt,
        result_reason: result.reason ?? '',
      })
      .select('id')
      .single();

    if (matchError || !match) {
      console.error('persistMatchResult: match insert failed', matchError);
      return;
    }

    const rows = room.players.map((player: Player) => ({
      match_id: match.id as string,
      user_id: player.userId ?? null,
      player_token: player.id,
      display_name: player.name,
      is_winner: winnerSet.has(player.id),
      placement: null as number | null,
    }));

    const { error: playersError } = await admin.from('match_players').insert(rows);
    if (playersError) {
      console.error('persistMatchResult: match_players insert failed', playersError);
    }
  } catch (err) {
    console.error('persistMatchResult', err);
  }
}
