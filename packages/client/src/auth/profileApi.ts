import type { PlayerAvatarConfig } from 'shared';
import { getSupabaseClient } from './index';

export interface ProfileRow {
  id: string;
  google_sub: string;
  handle: string;
  display_name: string;
  avatar_config: PlayerAvatarConfig | unknown;
  show_on_leaderboard: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchOwnProfile(userId: string): Promise<ProfileRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.error('fetchOwnProfile', error);
    return null;
  }
  return data as ProfileRow | null;
}

export async function updateOwnProfile(
  userId: string,
  patch: {
    handle?: string;
    display_name?: string;
    avatar_config?: PlayerAvatarConfig;
    show_on_leaderboard?: boolean;
  },
): Promise<{ ok: true; profile: ProfileRow } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  const { data, error } = await client
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'แฮนเดิลนี้มีคนใช้แล้ว' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, profile: data as ProfileRow };
}
