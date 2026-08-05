import {
  ACHIEVEMENTS,
  REWARD_TRACK_GAME_IDS,
  getAchievementDef,
  getFriendCodeValidationError,
  getGameRewardTrack,
  isAchievementSatisfied,
  normalizeFriendCode,
  type AchievementStats,
} from 'shared';
import { listGames } from '../games/registry.js';
import { getSupabaseAdmin, isAuthConfigured } from './index.js';
import { evaluateAchievementsForUsers } from './evaluateAchievements.js';

/** Tagged synthetic matches so reset can find and remove them. */
export const ADMIN_TEST_ROOM_CODE = 'ADMIN-TEST';
export const ADMIN_TEST_RESULT_REASON = 'admin-test-win';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export interface AdminTestProfile {
  id: string;
  handle: string;
  displayName: string;
}

export interface AdminTestTrackStep {
  achievementId: string;
  title: string;
  count: number;
  unlocked: boolean;
}

export interface AdminTestGameSummary {
  gameId: string;
  gameName: string;
  wins: number;
  testWins: number;
  track: AdminTestTrackStep[];
}

export interface AdminTestWinSummary {
  profile: AdminTestProfile;
  totalWins: number;
  unlockedAchievementIds: string[];
  games: AdminTestGameSummary[];
}

export interface AddTestWinResult {
  summary: AdminTestWinSummary;
  newlyGranted: { id: string; title: string }[];
}

export interface ResetTestWinsResult {
  removedMatches: number;
  revokedAchievements: string[];
  summary: AdminTestWinSummary;
}

function requireAdmin(): AdminClient {
  if (!isAuthConfigured()) {
    throw new AdminTestWinsError('Supabase ยังไม่ได้ตั้งค่า', 503);
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AdminTestWinsError('Supabase ยังไม่ได้ตั้งค่า', 503);
  }
  return admin;
}

export class AdminTestWinsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminTestWinsError';
  }
}

function assertValidHandle(raw: string): string {
  const err = getFriendCodeValidationError(raw);
  if (err) throw new AdminTestWinsError(err, 400);
  return normalizeFriendCode(raw);
}

function assertRewardTrackGameId(gameId: string): string {
  if (!REWARD_TRACK_GAME_IDS.includes(gameId)) {
    throw new AdminTestWinsError(`เกม ${gameId} ไม่มี achievement track`, 400);
  }
  return gameId;
}

function gameNameFor(gameId: string): string {
  return listGames().find((g) => g.id === gameId)?.name ?? gameId;
}

function playerTokenFor(userId: string): string {
  return `admin-test:${userId}`;
}

async function loadUnlockedIds(admin: AdminClient, userId: string): Promise<Set<string>> {
  const { data, error } = await admin
    .from('achievement_unlocks')
    .select('achievement_id')
    .eq('user_id', userId);
  if (error) {
    console.error('adminTestWins: unlocks query failed', userId, error);
    throw new AdminTestWinsError('โหลด unlocks ไม่สำเร็จ', 500);
  }
  return new Set((data ?? []).map((r) => r.achievement_id as string));
}

async function loadStats(admin: AdminClient, userId: string): Promise<{
  stats: AchievementStats;
  testWinsByGame: Record<string, number>;
}> {
  const { data: rows, error } = await admin
    .from('match_players')
    .select('is_winner, matches(game_id, result_reason)')
    .eq('user_id', userId);

  if (error) {
    console.error('adminTestWins: stats query failed', userId, error);
    throw new AdminTestWinsError('โหลดสถิติไม่สำเร็จ', 500);
  }

  const winsByGame: Record<string, number> = {};
  const matchesByGame: Record<string, number> = {};
  const testWinsByGame: Record<string, number> = {};
  let wins = 0;
  let matchesPlayed = 0;

  for (const row of rows ?? []) {
    matchesPlayed += 1;
    const nested = row.matches as
      | { game_id: string; result_reason: string }
      | { game_id: string; result_reason: string }[]
      | null;
    const match = Array.isArray(nested) ? (nested[0] ?? null) : nested;
    const gameId = match?.game_id ?? '';
    const isTest = match?.result_reason === ADMIN_TEST_RESULT_REASON;

    if (gameId) {
      matchesByGame[gameId] = (matchesByGame[gameId] ?? 0) + 1;
    }
    if (row.is_winner) {
      wins += 1;
      if (gameId) {
        winsByGame[gameId] = (winsByGame[gameId] ?? 0) + 1;
        if (isTest) {
          testWinsByGame[gameId] = (testWinsByGame[gameId] ?? 0) + 1;
        }
      }
    }
  }

  return {
    stats: { wins, matchesPlayed, winsByGame, matchesByGame },
    testWinsByGame,
  };
}

function buildSummary(
  profile: AdminTestProfile,
  stats: AchievementStats,
  testWinsByGame: Record<string, number>,
  unlocked: Set<string>,
): AdminTestWinSummary {
  const games: AdminTestGameSummary[] = REWARD_TRACK_GAME_IDS.map((gameId) => {
    const track = getGameRewardTrack(gameId).map((a) => ({
      achievementId: a.id,
      title: a.title,
      count: a.rule.kind === 'wins' ? a.rule.count : 0,
      unlocked: unlocked.has(a.id) || isAchievementSatisfied(a.rule, stats),
    }));
    return {
      gameId,
      gameName: gameNameFor(gameId),
      wins: stats.winsByGame?.[gameId] ?? 0,
      testWins: testWinsByGame[gameId] ?? 0,
      track,
    };
  });

  return {
    profile,
    totalWins: stats.wins,
    unlockedAchievementIds: [...unlocked],
    games,
  };
}

export async function lookupProfileByHandle(rawHandle: string): Promise<AdminTestProfile> {
  const handle = assertValidHandle(rawHandle);
  const admin = requireAdmin();

  const { data, error } = await admin
    .from('profiles')
    .select('id, handle, display_name')
    .eq('handle', handle)
    .maybeSingle();

  if (error) {
    console.error('adminTestWins: profile lookup failed', handle, error);
    throw new AdminTestWinsError('ค้นหาโปรไฟล์ไม่สำเร็จ', 500);
  }
  if (!data) {
    throw new AdminTestWinsError(`ไม่พบรหัสเพื่อน ${handle}`, 404);
  }

  return {
    id: data.id as string,
    handle: data.handle as string,
    displayName: data.display_name as string,
  };
}

export async function getTestWinSummary(rawHandle: string): Promise<AdminTestWinSummary> {
  const profile = await lookupProfileByHandle(rawHandle);
  const admin = requireAdmin();
  const [{ stats, testWinsByGame }, unlocked] = await Promise.all([
    loadStats(admin, profile.id),
    loadUnlockedIds(admin, profile.id),
  ]);
  return buildSummary(profile, stats, testWinsByGame, unlocked);
}

export async function addTestWin(rawHandle: string, gameIdRaw: string): Promise<AddTestWinResult> {
  const gameId = assertRewardTrackGameId(gameIdRaw);
  const profile = await lookupProfileByHandle(rawHandle);
  const admin = requireAdmin();

  const unlockedBefore = await loadUnlockedIds(admin, profile.id);
  const now = new Date().toISOString();

  const { data: match, error: matchError } = await admin
    .from('matches')
    .insert({
      game_id: gameId,
      room_code: ADMIN_TEST_ROOM_CODE,
      started_at: now,
      ended_at: now,
      result_reason: ADMIN_TEST_RESULT_REASON,
    })
    .select('id')
    .single();

  if (matchError || !match) {
    console.error('adminTestWins: match insert failed', matchError);
    throw new AdminTestWinsError('บันทึกแมตช์ทดสอบไม่สำเร็จ', 500);
  }

  const { error: playersError } = await admin.from('match_players').insert({
    match_id: match.id as string,
    user_id: profile.id,
    player_token: playerTokenFor(profile.id),
    display_name: profile.displayName,
    is_winner: true,
    placement: 1,
  });

  if (playersError) {
    console.error('adminTestWins: match_players insert failed', playersError);
    // Best-effort cleanup of the orphan match row.
    await admin.from('matches').delete().eq('id', match.id);
    throw new AdminTestWinsError('บันทึกผู้เล่นแมตช์ทดสอบไม่สำเร็จ', 500);
  }

  await evaluateAchievementsForUsers([profile.id]);

  const [{ stats, testWinsByGame }, unlockedAfter] = await Promise.all([
    loadStats(admin, profile.id),
    loadUnlockedIds(admin, profile.id),
  ]);

  const newlyGranted = ACHIEVEMENTS.filter(
    (a) => !unlockedBefore.has(a.id) && unlockedAfter.has(a.id),
  ).map((a) => ({ id: a.id, title: a.title }));

  return {
    summary: buildSummary(profile, stats, testWinsByGame, unlockedAfter),
    newlyGranted,
  };
}

export async function resetTestWins(rawHandle: string): Promise<ResetTestWinsResult> {
  const profile = await lookupProfileByHandle(rawHandle);
  const admin = requireAdmin();

  const { data: seatRows, error: seatError } = await admin
    .from('match_players')
    .select('match_id')
    .eq('user_id', profile.id);

  if (seatError) {
    console.error('adminTestWins: seat query for reset failed', seatError);
    throw new AdminTestWinsError('โหลดแมตช์ทดสอบไม่สำเร็จ', 500);
  }

  const matchIds = [...new Set((seatRows ?? []).map((r) => r.match_id as string).filter(Boolean))];
  let removedMatches = 0;

  if (matchIds.length > 0) {
    const { data: testMatches, error: testError } = await admin
      .from('matches')
      .select('id')
      .in('id', matchIds)
      .eq('result_reason', ADMIN_TEST_RESULT_REASON);

    if (testError) {
      console.error('adminTestWins: test match query failed', testError);
      throw new AdminTestWinsError('โหลดแมตช์ทดสอบไม่สำเร็จ', 500);
    }

    const testIds = (testMatches ?? []).map((m) => m.id as string);
    if (testIds.length > 0) {
      const { error: deleteError } = await admin.from('matches').delete().in('id', testIds);
      if (deleteError) {
        console.error('adminTestWins: delete test matches failed', deleteError);
        throw new AdminTestWinsError('ลบแมตช์ทดสอบไม่สำเร็จ', 500);
      }
      removedMatches = testIds.length;
    }
  }

  const [{ stats, testWinsByGame }, unlocked] = await Promise.all([
    loadStats(admin, profile.id),
    loadUnlockedIds(admin, profile.id),
  ]);

  const toRevoke = [...unlocked].filter((achievementId) => {
    const def = getAchievementDef(achievementId);
    if (!def) return false;
    return !isAchievementSatisfied(def.rule, stats);
  });

  if (toRevoke.length > 0) {
    const { error: revokeError } = await admin
      .from('achievement_unlocks')
      .delete()
      .eq('user_id', profile.id)
      .in('achievement_id', toRevoke);

    if (revokeError) {
      console.error('adminTestWins: revoke unlocks failed', revokeError);
      throw new AdminTestWinsError('ถอน unlocks ไม่สำเร็จ', 500);
    }
  }

  const unlockedAfter = new Set([...unlocked].filter((id) => !toRevoke.includes(id)));

  return {
    removedMatches,
    revokedAchievements: toRevoke,
    summary: buildSummary(profile, stats, testWinsByGame, unlockedAfter),
  };
}
