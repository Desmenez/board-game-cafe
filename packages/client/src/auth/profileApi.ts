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

const SCHEMA_CACHE_CODES = new Set(['PGRST002', 'PGRST000', 'PGRST001', 'PGRST003']);

function isTransientDbError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code && SCHEMA_CACHE_CODES.has(error.code)) return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('schema cache') || msg.includes('could not query the database');
}

function userFacingDbError(error: { code?: string; message?: string }): string {
  if (isTransientDbError(error)) {
    return "ฐานข้อมูลยังไม่พร้อม (schema cache) — รอสักครู่แล้วลองใหม่ หรือรัน NOTIFY pgrst, 'reload schema' ใน SQL Editor";
  }
  if (error.code === '23505') return 'ข้อมูลซ้ำในระบบ';
  const msg = error.message ?? '';
  if (msg.toLowerCase().includes('immutable') || msg.toLowerCase().includes('friend code')) {
    return 'รหัสเพื่อนแก้ไม่ได้';
  }
  return msg || 'บันทึกโปรไฟล์ไม่สำเร็จ';
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a few times when PostgREST cannot build the schema cache (PGRST002),
 * common right after project wake / migration on free tier.
 */
async function withDbRetry<T>(
  label: string,
  run: () => Promise<{ data: T; error: { code?: string; message?: string } | null }>,
): Promise<{ data: T; error: { code?: string; message?: string } | null }> {
  const delaysMs = [0, 800, 2000];
  let last = await run();
  for (let i = 1; i < delaysMs.length; i += 1) {
    if (!last.error || !isTransientDbError(last.error)) return last;
    console.warn(`${label}: transient DB error, retry ${i}/${delaysMs.length - 1}`, last.error);
    await sleep(delaysMs[i]!);
    last = await run();
  }
  return last;
}

export async function fetchOwnProfile(userId: string): Promise<ProfileRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await withDbRetry('fetchOwnProfile', async () => {
    const res = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    return { data: res.data as ProfileRow | null, error: res.error };
  });

  if (error) {
    console.error('fetchOwnProfile', error);
    return null;
  }
  return data;
}

export async function updateOwnProfile(
  userId: string,
  patch: {
    display_name?: string;
    avatar_config?: PlayerAvatarConfig;
    show_on_leaderboard?: boolean;
  },
): Promise<{ ok: true; profile: ProfileRow } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  // Never send `handle` — friend codes are immutable (DB trigger enforces).
  const { data, error } = await withDbRetry('updateOwnProfile', async () => {
    const res = await client.from('profiles').update(patch).eq('id', userId).select('*').single();
    return { data: res.data as ProfileRow | null, error: res.error };
  });

  if (error || !data) {
    return { ok: false, error: userFacingDbError(error ?? { message: 'ไม่พบโปรไฟล์' }) };
  }
  return { ok: true, profile: data };
}
