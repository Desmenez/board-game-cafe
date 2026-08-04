import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import {
  canEquipNameplate,
  canEquipTitle,
  normalizeNameplateId,
  normalizeTitleId,
  NO_TITLE_ID,
  type AchievementStats,
} from 'shared';
import { getSupabaseClient } from './index';

export interface ProfileRow {
  id: string;
  google_sub: string;
  handle: string;
  display_name: string;
  avatar_config: PlayerAvatarConfig | unknown;
  /** Null when using DiceBear only; may be absent before migration. */
  avatar_url?: string | null;
  /** character | photo — may be absent before migration. */
  avatar_display?: PlayerAvatarDisplay | null;
  /** Catalog nameplate id; null/absent = default. */
  equipped_nameplate_id?: string | null;
  /** Catalog title id; null/absent/none = no title. */
  equipped_title_id?: string | null;
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

export async function fetchOwnAchievementUnlocks(userId: string): Promise<Set<string>> {
  const client = getSupabaseClient();
  if (!client) return new Set();

  const { data, error } = await withDbRetry('fetchOwnAchievementUnlocks', async () => {
    const res = await client
      .from('achievement_unlocks')
      .select('achievement_id')
      .eq('user_id', userId);
    return {
      data: (res.data ?? []) as { achievement_id: string }[],
      error: res.error,
    };
  });

  if (error) {
    console.warn('fetchOwnAchievementUnlocks', error);
    return new Set();
  }
  return new Set(data.map((row) => row.achievement_id));
}

/** Win / match counts for achievement progress UI (own rows only). */
export async function fetchOwnAchievementStats(userId: string): Promise<AchievementStats> {
  const empty: AchievementStats = {
    wins: 0,
    matchesPlayed: 0,
    winsByGame: {},
    matchesByGame: {},
  };
  const client = getSupabaseClient();
  if (!client) return empty;

  const { data, error } = await withDbRetry('fetchOwnAchievementStats', async () => {
    const res = await client
      .from('match_players')
      .select('is_winner, matches(game_id)')
      .eq('user_id', userId);
    return {
      data: (res.data ?? []) as {
        is_winner: boolean;
        matches: { game_id: string } | { game_id: string }[] | null;
      }[],
      error: res.error,
    };
  });

  if (error) {
    console.warn('fetchOwnAchievementStats', error);
    return empty;
  }

  const winsByGame: Record<string, number> = {};
  const matchesByGame: Record<string, number> = {};
  let wins = 0;
  let matchesPlayed = 0;
  for (const row of data) {
    matchesPlayed += 1;
    const nested = row.matches;
    const gameId = Array.isArray(nested) ? (nested[0]?.game_id ?? '') : (nested?.game_id ?? '');
    if (gameId) matchesByGame[gameId] = (matchesByGame[gameId] ?? 0) + 1;
    if (row.is_winner) {
      wins += 1;
      if (gameId) winsByGame[gameId] = (winsByGame[gameId] ?? 0) + 1;
    }
  }
  return { wins, matchesPlayed, winsByGame, matchesByGame };
}

export async function updateOwnProfile(
  userId: string,
  patch: {
    display_name?: string;
    avatar_config?: PlayerAvatarConfig;
    avatar_url?: string | null;
    avatar_display?: PlayerAvatarDisplay;
    show_on_leaderboard?: boolean;
    equipped_nameplate_id?: string | null;
    equipped_title_id?: string | null;
  },
  options?: { unlockedAchievementIds?: ReadonlySet<string> },
): Promise<{ ok: true; profile: ProfileRow } | { ok: false; error: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };

  const unlocked = options?.unlockedAchievementIds;

  if (patch.equipped_nameplate_id !== undefined) {
    const id = normalizeNameplateId(patch.equipped_nameplate_id);
    if (unlocked && !canEquipNameplate(id, unlocked)) {
      return { ok: false, error: 'ยังไม่ได้ปลดล็อกพื้นหลังนี้' };
    }
    patch = { ...patch, equipped_nameplate_id: id };
  }

  if (patch.equipped_title_id !== undefined) {
    const id = normalizeTitleId(patch.equipped_title_id);
    if (unlocked && !canEquipTitle(id, unlocked)) {
      return { ok: false, error: 'ยังไม่ได้ปลดล็อกฉายานี้' };
    }
    patch = {
      ...patch,
      equipped_title_id: id === NO_TITLE_ID ? null : id,
    };
  }

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
