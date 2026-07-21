import { getFriendCodeValidationError, normalizeFriendCode, type PlayerAvatarConfig } from 'shared';
import { getSupabaseClient } from './index';
import type { ProfileRow } from './profileApi';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendListItem {
  friendshipId: string;
  status: FriendshipStatus;
  /** True when the other user sent the request to me. */
  incoming: boolean;
  other: Pick<ProfileRow, 'id' | 'handle' | 'display_name' | 'avatar_config'>;
}

function mapError(error: { code?: string; message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (error.code === '23505') return 'มีคำขอหรือเป็นเพื่อนกับคนนี้อยู่แล้ว';
  return error.message || fallback;
}

async function fetchProfilesByIds(
  ids: string[],
): Promise<Map<string, Pick<ProfileRow, 'id' | 'handle' | 'display_name' | 'avatar_config'>>> {
  const map = new Map<
    string,
    Pick<ProfileRow, 'id' | 'handle' | 'display_name' | 'avatar_config'>
  >();
  if (ids.length === 0) return map;
  const client = getSupabaseClient();
  if (!client) return map;
  const { data, error } = await client
    .from('profiles')
    .select('id, handle, display_name, avatar_config')
    .in('id', ids);
  if (error) {
    console.error('fetchProfilesByIds', error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      handle: row.handle as string,
      display_name: row.display_name as string,
      avatar_config: row.avatar_config as PlayerAvatarConfig | unknown,
    });
  }
  return map;
}

export async function lookupProfileByFriendCode(
  rawCode: string,
): Promise<
  | { ok: true; profile: Pick<ProfileRow, 'id' | 'handle' | 'display_name'> }
  | { ok: false; error: string }
> {
  const err = getFriendCodeValidationError(rawCode);
  if (err) return { ok: false, error: err };
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  const code = normalizeFriendCode(rawCode);
  const { data, error } = await client
    .from('profiles')
    .select('id, handle, display_name')
    .eq('handle', code)
    .maybeSingle();

  if (error) return { ok: false, error: mapError(error, 'ค้นหาไม่สำเร็จ') };
  if (!data) return { ok: false, error: 'ไม่พบรหัสเพื่อนนี้' };
  return {
    ok: true,
    profile: {
      id: data.id as string,
      handle: data.handle as string,
      display_name: data.display_name as string,
    },
  };
}

export async function listMyFriendships(userId: string): Promise<FriendListItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: rows, error } = await client
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error || !rows?.length) {
    if (error) console.error('listMyFriendships', error);
    return [];
  }

  const otherIds = [
    ...new Set(
      rows.map((row) =>
        row.requester_id === userId ? (row.addressee_id as string) : (row.requester_id as string),
      ),
    ),
  ];
  const profiles = await fetchProfilesByIds(otherIds);

  const items: FriendListItem[] = [];
  for (const row of rows) {
    const incoming = row.addressee_id === userId;
    const otherId = incoming ? (row.requester_id as string) : (row.addressee_id as string);
    const other = profiles.get(otherId);
    if (!other) continue;
    items.push({
      friendshipId: row.id as string,
      status: row.status as FriendshipStatus,
      incoming,
      other,
    });
  }
  return items;
}

export async function sendFriendRequest(
  myUserId: string,
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (myUserId === targetUserId) return { ok: false, error: 'เพิ่มตัวเองเป็นเพื่อนไม่ได้' };
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  const { data: existing, error: existingError } = await client
    .from('friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${myUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${myUserId})`,
    );

  if (existingError) return { ok: false, error: mapError(existingError, 'ตรวจสอบเพื่อนไม่สำเร็จ') };

  for (const row of existing ?? []) {
    if (row.status === 'blocked') return { ok: false, error: 'ไม่สามารถเพิ่มเพื่อนคนนี้ได้' };
    if (row.status === 'accepted') return { ok: false, error: 'เป็นเพื่อนกันอยู่แล้ว' };
    if (row.status === 'pending' && row.requester_id === myUserId) {
      return { ok: false, error: 'ส่งคำขอไปแล้ว รอการตอบรับ' };
    }
    if (row.status === 'pending' && row.addressee_id === myUserId) {
      const accepted = await respondFriendRequest(row.id as string, 'accepted');
      return accepted.ok ? { ok: true } : accepted;
    }
  }

  const { error } = await client.from('friendships').insert({
    requester_id: myUserId,
    addressee_id: targetUserId,
    status: 'pending',
  });

  if (error) return { ok: false, error: mapError(error, 'ส่งคำขอไม่สำเร็จ') };
  return { ok: true };
}

export async function respondFriendRequest(
  friendshipId: string,
  status: 'accepted' | 'declined',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  if (status === 'declined') {
    const { error } = await client.from('friendships').delete().eq('id', friendshipId);
    if (error) return { ok: false, error: mapError(error, 'ปฏิเสธไม่สำเร็จ') };
    return { ok: true };
  }

  const { error } = await client
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  if (error) return { ok: false, error: mapError(error, 'ยอมรับไม่สำเร็จ') };
  return { ok: true };
}

export async function removeFriendship(
  friendshipId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };
  const { error } = await client.from('friendships').delete().eq('id', friendshipId);
  if (error) return { ok: false, error: mapError(error, 'ลบเพื่อนไม่สำเร็จ') };
  return { ok: true };
}

export async function listAcceptedFriends(userId: string): Promise<FriendListItem[]> {
  const all = await listMyFriendships(userId);
  return all.filter((item) => item.status === 'accepted');
}
