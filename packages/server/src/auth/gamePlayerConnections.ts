import { createHash } from 'node:crypto';
import type { Player } from 'shared';
import { getSupabaseAdmin, isAuthConfigured, type VerifiedAccessToken } from './index.js';

/**
 * Optional audit/persistence layer for account sessions. Live gameplay remains
 * in memory; these writes must never delay or block guests.
 */
export async function recordAuthenticatedConnection(input: {
  roomCode: string;
  gameId: string;
  player: Player;
  socketId: string;
  auth: VerifiedAccessToken;
}): Promise<void> {
  if (!isAuthConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin || !input.player.userId) return;

  const tokenHash = createHash('sha256').update(input.auth.sessionKey).digest('hex');
  try {
    const { error: sessionError } = await admin.from('app_auth_sessions').upsert(
      {
        session_key_hash: tokenHash,
        user_id: input.auth.userId,
        expires_at: input.auth.expiresAt?.toISOString() ?? null,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'session_key_hash' },
    );
    if (sessionError) {
      console.error('recordAuthenticatedConnection auth session', sessionError);
      return;
    }

    // A partial unique index in the migration ensures at most one active
    // connection per GamePlayer, even when two resumes race.
    const now = new Date().toISOString();
    const { error: closeError } = await admin
      .from('game_player_connections')
      .update({ disconnected_at: now, replaced_at: now })
      .eq('room_code', input.roomCode)
      .eq('player_id', input.player.id)
      .is('disconnected_at', null);
    if (closeError) console.error('recordAuthenticatedConnection close previous', closeError);

    const { error: connectionError } = await admin.from('game_player_connections').insert({
      room_code: input.roomCode,
      game_id: input.gameId,
      player_id: input.player.id,
      user_id: input.auth.userId,
      auth_session_key_hash: tokenHash,
      socket_id: input.socketId,
      connected_at: now,
      last_seen_at: now,
    });
    if (connectionError) console.error('recordAuthenticatedConnection insert', connectionError);
  } catch (err) {
    console.error('recordAuthenticatedConnection', err);
  }
}

/** Persist identity metadata only; this never stores game state or raw tokens. */
export async function recordGamePlayer(input: {
  roomCode: string;
  gameId: string;
  player: Player;
}): Promise<void> {
  if (!isAuthConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    const { error } = await admin.from('game_players').upsert(
      {
        room_code: input.roomCode,
        game_id: input.gameId,
        player_id: input.player.id,
        user_id: input.player.userId ?? null,
        guest_id: input.player.userId ? null : input.player.guestId ?? input.player.id,
        player_snapshot: input.player,
        last_active_at: new Date().toISOString(),
        disconnected_at: input.player.connected ? null : new Date().toISOString(),
      },
      { onConflict: 'room_code,player_id' },
    );
    if (error) console.error('recordGamePlayer', error);
  } catch (err) {
    console.error('recordGamePlayer', err);
  }
}

export async function recordAuthenticatedDisconnect(socketId: string): Promise<void> {
  if (!isAuthConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    const { error } = await admin
      .from('game_player_connections')
      .update({ disconnected_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
      .eq('socket_id', socketId)
      .is('disconnected_at', null);
    if (error) console.error('recordAuthenticatedDisconnect', error);
  } catch (err) {
    console.error('recordAuthenticatedDisconnect', err);
  }
}
