import {
  DEFAULT_NAMEPLATE_ID,
  NO_ICON_ID,
  NO_TITLE_ID,
  achievementsToGrant,
  canEquipIcon,
  canEquipNameplate,
  canEquipTitle,
  effectiveUnlockedAchievementIds,
  normalizeIconId,
  normalizeNameplateId,
  normalizeTitleId,
  type AchievementStats,
} from 'shared';
import { getSupabaseAdmin, isAuthConfigured } from './index.js';

/**
 * After a match is persisted, recompute account stats and grant any newly
 * earned achievements. No-op when Auth is unconfigured.
 */
export async function evaluateAchievementsForUsers(userIds: string[]): Promise<void> {
  if (!isAuthConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const unique = [...new Set(userIds.filter(Boolean))];
  for (const userId of unique) {
    try {
      await evaluateForUser(admin, userId);
    } catch (err) {
      console.error('evaluateAchievementsForUsers', userId, err);
    }
  }
}

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

async function evaluateForUser(admin: AdminClient, userId: string): Promise<void> {
  const { data: rows, error } = await admin
    .from('match_players')
    .select('is_winner, matches(game_id)')
    .eq('user_id', userId);

  if (error) {
    console.error('evaluateAchievements: stats query failed', userId, error);
    return;
  }

  const winsByGame: Record<string, number> = {};
  const matchesByGame: Record<string, number> = {};
  let wins = 0;
  let matchesPlayed = 0;

  for (const row of rows ?? []) {
    matchesPlayed += 1;
    const nested = row.matches as { game_id: string } | { game_id: string }[] | null;
    const gameId = Array.isArray(nested) ? (nested[0]?.game_id ?? '') : (nested?.game_id ?? '');
    if (gameId) {
      matchesByGame[gameId] = (matchesByGame[gameId] ?? 0) + 1;
    }
    if (row.is_winner) {
      wins += 1;
      if (gameId) winsByGame[gameId] = (winsByGame[gameId] ?? 0) + 1;
    }
  }

  const stats: AchievementStats = { wins, matchesPlayed, winsByGame, matchesByGame };

  const { data: unlockRows, error: unlockError } = await admin
    .from('achievement_unlocks')
    .select('achievement_id')
    .eq('user_id', userId);

  if (unlockError) {
    console.error('evaluateAchievements: unlocks query failed', userId, unlockError);
    return;
  }

  const already = new Set((unlockRows ?? []).map((r) => r.achievement_id as string));
  const toGrant = achievementsToGrant(stats, already);
  if (toGrant.length === 0) return;

  const { error: insertError } = await admin.from('achievement_unlocks').insert(
    toGrant.map((a) => ({
      user_id: userId,
      achievement_id: a.id,
    })),
  );

  if (insertError) {
    if (insertError.code !== '23505') {
      console.error('evaluateAchievements: insert failed', userId, insertError);
    }
  } else {
    console.log(`🏆 Granted ${toGrant.map((a) => a.id).join(', ')} to ${userId} (wins=${wins})`);
  }
}

export interface EquippedCosmetics {
  nameplateId: string;
  titleId: string;
  iconId: string;
}

async function loadAchievementStats(admin: AdminClient, userId: string): Promise<AchievementStats> {
  const { data: rows, error } = await admin
    .from('match_players')
    .select('is_winner, matches(game_id)')
    .eq('user_id', userId);

  if (error) {
    console.error('resolveEquippedCosmetics: stats query failed', userId, error);
    return { wins: 0, matchesPlayed: 0, winsByGame: {}, matchesByGame: {} };
  }

  const winsByGame: Record<string, number> = {};
  const matchesByGame: Record<string, number> = {};
  let wins = 0;
  let matchesPlayed = 0;

  for (const row of rows ?? []) {
    matchesPlayed += 1;
    const nested = row.matches as { game_id: string } | { game_id: string }[] | null;
    const gameId = Array.isArray(nested) ? (nested[0]?.game_id ?? '') : (nested?.game_id ?? '');
    if (gameId) matchesByGame[gameId] = (matchesByGame[gameId] ?? 0) + 1;
    if (row.is_winner) {
      wins += 1;
      if (gameId) winsByGame[gameId] = (winsByGame[gameId] ?? 0) + 1;
    }
  }

  return { wins, matchesPlayed, winsByGame, matchesByGame };
}

/**
 * Load equipped nameplate + title + icon for a verified account.
 * Validates against DB unlocks ∪ stats-satisfied rewards (same as client picker).
 */
export async function resolveEquippedCosmetics(
  userId: string,
): Promise<EquippedCosmetics | undefined> {
  if (!isAuthConfigured()) return undefined;
  const admin = getSupabaseAdmin();
  if (!admin) return undefined;

  const { data: profile, error } = await admin
    .from('profiles')
    .select('equipped_nameplate_id, equipped_title_id, equipped_icon_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) return undefined;

  const { data: unlockRows } = await admin
    .from('achievement_unlocks')
    .select('achievement_id')
    .eq('user_id', userId);

  const unlockedRows = new Set((unlockRows ?? []).map((r) => r.achievement_id as string));
  const stats = await loadAchievementStats(admin, userId);
  const unlocked = effectiveUnlockedAchievementIds(unlockedRows, stats);

  const nameplateCandidate = normalizeNameplateId(profile.equipped_nameplate_id);
  const titleCandidate = normalizeTitleId(profile.equipped_title_id);
  const iconCandidate = normalizeIconId(profile.equipped_icon_id);

  return {
    nameplateId: canEquipNameplate(nameplateCandidate, unlocked)
      ? nameplateCandidate
      : DEFAULT_NAMEPLATE_ID,
    titleId: canEquipTitle(titleCandidate, unlocked) ? titleCandidate : NO_TITLE_ID,
    iconId: canEquipIcon(iconCandidate, unlocked) ? iconCandidate : NO_ICON_ID,
  };
}

/** @deprecated Prefer resolveEquippedCosmetics */
export async function resolveEquippedNameplateId(userId: string): Promise<string | undefined> {
  const cosmetics = await resolveEquippedCosmetics(userId);
  return cosmetics?.nameplateId;
}
