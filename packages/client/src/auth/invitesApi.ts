import { RECONNECT_WINDOW_MS } from 'shared';
import { getSupabaseClient } from './index';
import type { ProfileRow } from './profileApi';
import { listAcceptedFriends } from './friendsApi';

export type GameInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface GameInviteRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  room_code: string;
  game_id: string;
  status: GameInviteStatus;
  created_at: string;
  expires_at: string;
}

export interface IncomingInviteItem {
  invite: GameInviteRow;
  from: Pick<ProfileRow, 'id' | 'handle' | 'display_name'>;
  expired: boolean;
}

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message || fallback;
}

export async function createGameInvites(input: {
  fromUserId: string;
  toUserIds: string[];
  roomCode: string;
  gameId: string;
}): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  const friends = await listAcceptedFriends(input.fromUserId);
  const friendIds = new Set(friends.map((f) => f.other.id));
  const targets = [...new Set(input.toUserIds)].filter(
    (id) => id !== input.fromUserId && friendIds.has(id),
  );
  if (targets.length === 0) return { ok: false, error: 'เลือกเพื่อนที่รับคำขอแล้วอย่างน้อย 1 คน' };

  const expiresAt = new Date(Date.now() + RECONNECT_WINDOW_MS).toISOString();
  const rows = targets.map((toUserId) => ({
    from_user_id: input.fromUserId,
    to_user_id: toUserId,
    room_code: input.roomCode.toUpperCase().trim(),
    game_id: input.gameId,
    status: 'pending' as const,
    expires_at: expiresAt,
  }));

  const { error } = await client.from('game_invites').insert(rows);
  if (error) return { ok: false, error: mapError(error, 'ส่งคำเชิญไม่สำเร็จ') };
  return { ok: true, created: rows.length };
}

export async function listIncomingInvites(userId: string): Promise<IncomingInviteItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: rows, error } = await client
    .from('game_invites')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !rows?.length) {
    if (error) console.error('listIncomingInvites', error);
    return [];
  }

  const fromIds = [...new Set(rows.map((r) => r.from_user_id as string))];
  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, handle, display_name')
    .in('id', fromIds);

  if (profileError) console.error('listIncomingInvites profiles', profileError);
  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        id: p.id as string,
        handle: p.handle as string,
        display_name: p.display_name as string,
      },
    ]),
  );

  const now = Date.now();
  return rows
    .map((row) => {
      const from = byId.get(row.from_user_id as string);
      if (!from) return null;
      const expiresAt = new Date(row.expires_at as string).getTime();
      return {
        invite: row as GameInviteRow,
        from,
        expired: Number.isFinite(expiresAt) && expiresAt <= now,
      };
    })
    .filter((item): item is IncomingInviteItem => item != null);
}

export async function respondGameInvite(
  inviteId: string,
  status: 'accepted' | 'declined' | 'expired',
): Promise<{ ok: true; roomCode?: string } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  const { data, error } = await client
    .from('game_invites')
    .update({ status })
    .eq('id', inviteId)
    .select('room_code')
    .single();

  if (error) return { ok: false, error: mapError(error, 'อัปเดตคำเชิญไม่สำเร็จ') };
  return { ok: true, roomCode: data?.room_code as string | undefined };
}
