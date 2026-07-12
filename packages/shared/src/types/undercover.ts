import type { GameResult } from './game.js';

// ============================================================
// Undercover — social deduction word game
// ============================================================

export type UndercoverRole = 'civilian' | 'undercover' | 'mr_white';

export type UndercoverPhase =
  | 'role_reveal'
  | 'clue_round'
  | 'discussion'
  | 'secret_vote'
  | 'tie_break_vote'
  | 'elimination'
  | 'mr_white_guess'
  | 'game_over';

export interface UndercoverCategory {
  id: string;
  label: string;
}

export const UNDERCOVER_CATEGORIES: readonly UndercoverCategory[] = [
  { id: 'food-drink', label: 'อาหารและเครื่องดื่ม' },
  { id: 'animals', label: 'สัตว์' },
  { id: 'everyday-objects', label: 'สิ่งของรอบตัว' },
  { id: 'places', label: 'สถานที่' },
  { id: 'jobs', label: 'อาชีพ' },
  { id: 'sports', label: 'กีฬา' },
  { id: 'movies-series', label: 'ภาพยนตร์และซีรีส์' },
  { id: 'music', label: 'เพลงและดนตรี' },
  { id: 'games', label: 'เกม' },
  { id: 'countries-cities', label: 'ประเทศและเมือง' },
  { id: 'nature', label: 'ธรรมชาติ' },
  { id: 'festivals', label: 'เทศกาล' },
  { id: 'school-work', label: 'โรงเรียนและการทำงาน' },
  { id: 'thai-words', label: 'คำไทยทั่วไป' },
  { id: 'household', label: 'ของใช้ในบ้าน' },
  { id: 'fashion-beauty', label: 'แฟชั่นและความงาม' },
  { id: 'technology', label: 'เทคโนโลยี' },
  { id: 'family-kids', label: 'เด็กและครอบครัว' },
  { id: 'relationships', label: 'ความสัมพันธ์' },
] as const;

export const UNDERCOVER_RANDOM_CATEGORY_ID = 'random';

export const UNDERCOVER_CLUE_TIMER_OPTIONS = [15, 30, 45, 60] as const;
export const UNDERCOVER_DISCUSSION_TIMER_OPTIONS = [30, 60, 90] as const;
export const UNDERCOVER_MAX_CLUE_ROUNDS_OPTIONS = [1, 2, 3] as const;

export interface UndercoverLobbyOptions {
  categoryId: string;
  undercoverCount: number;
  mrWhiteEnabled: boolean;
  timerEnabled: boolean;
  clueTimerSec: (typeof UNDERCOVER_CLUE_TIMER_OPTIONS)[number];
  discussionTimerSec: (typeof UNDERCOVER_DISCUSSION_TIMER_OPTIONS)[number];
  maxClueRounds: number;
  randomEliminationOnTie: boolean;
  allowRecheckRole: boolean;
  roleAssignment: 'auto';
}

export function defaultUndercoverLobbyOptions(): UndercoverLobbyOptions {
  return {
    categoryId: UNDERCOVER_RANDOM_CATEGORY_ID,
    undercoverCount: 1,
    mrWhiteEnabled: true,
    timerEnabled: true,
    clueTimerSec: 30,
    discussionTimerSec: 60,
    maxClueRounds: 1,
    randomEliminationOnTie: false,
    allowRecheckRole: true,
    roleAssignment: 'auto',
  };
}

/** Recommended undercover count for player count (before host override). */
export function recommendedUndercoverCount(playerCount: number): number {
  if (playerCount <= 5) return 1;
  if (playerCount <= 8) return 1;
  if (playerCount <= 12) return 2;
  return Math.max(2, Math.round(playerCount * 0.22));
}

/** Whether Mr. White is recommended for player count. */
export function recommendedMrWhiteEnabled(playerCount: number): boolean {
  return playerCount >= 6;
}

export function undercoverCountBounds(
  playerCount: number,
  mrWhiteEnabled: boolean,
): { min: number; max: number } {
  const mrCount = mrWhiteEnabled ? 1 : 0;
  const min = 1;
  const max = Math.max(1, playerCount - mrCount - 1);
  return { min, max };
}

export function parseUndercoverLobbyOptions(
  raw: unknown,
  playerCount?: number,
): UndercoverLobbyOptions {
  const defaults = defaultUndercoverLobbyOptions();
  if (!raw || typeof raw !== 'object') {
    if (playerCount != null) {
      return {
        ...defaults,
        undercoverCount: recommendedUndercoverCount(playerCount),
        mrWhiteEnabled: recommendedMrWhiteEnabled(playerCount),
      };
    }
    return defaults;
  }
  const o = raw as Record<string, unknown>;

  let categoryId = defaults.categoryId;
  if (typeof o.categoryId === 'string' && o.categoryId.trim()) {
    categoryId = o.categoryId.trim();
  }
  const validCategory =
    categoryId === UNDERCOVER_RANDOM_CATEGORY_ID ||
    UNDERCOVER_CATEGORIES.some((c) => c.id === categoryId);
  if (!validCategory) categoryId = defaults.categoryId;

  let undercoverCount =
    typeof o.undercoverCount === 'number' && Number.isFinite(o.undercoverCount)
      ? Math.round(o.undercoverCount)
      : playerCount != null
        ? recommendedUndercoverCount(playerCount)
        : defaults.undercoverCount;

  const mrWhiteFromOpts =
    o.mrWhiteEnabled === false ? false : o.mrWhiteEnabled === true ? true : defaults.mrWhiteEnabled;
  const effectiveMrWhite = playerCount != null && playerCount < 6 ? false : mrWhiteFromOpts;

  if (playerCount != null) {
    const { min, max } = undercoverCountBounds(playerCount, effectiveMrWhite);
    undercoverCount = Math.min(max, Math.max(min, undercoverCount));
  }

  return {
    categoryId,
    undercoverCount,
    mrWhiteEnabled: effectiveMrWhite,
    timerEnabled: true,
    clueTimerSec: defaults.clueTimerSec,
    discussionTimerSec: defaults.discussionTimerSec,
    maxClueRounds: defaults.maxClueRounds,
    randomEliminationOnTie: false,
    allowRecheckRole: true,
    roleAssignment: 'auto',
  };
}

export type UndercoverAction =
  | { type: 'acknowledge_role' }
  | { type: 'complete_clue' }
  | { type: 'host_skip_player' }
  | { type: 'start_voting' }
  | { type: 'cast_vote'; targetId: string }
  | { type: 'mr_white_guess'; text: string }
  | { type: 'ack_elimination' }
  | { type: 'recheck_role' }
  | { type: 'dismiss_recheck_role' };

export interface UndercoverPublicPlayer {
  id: string;
  name: string;
  eliminated: boolean;
  hasAcknowledgedRole: boolean;
}

export interface UndercoverVoteRecord {
  roundNo: number;
  votes: Record<string, string>;
  eliminatedId: string | null;
  tie: boolean;
}

export interface UndercoverPlayerView {
  phase: UndercoverPhase;
  roundNo: number;
  hostId: string;
  players: UndercoverPublicPlayer[];
  you: {
    id: string;
    name: string;
    role?: UndercoverRole;
    secretWord?: string;
    hasAcknowledgedRole: boolean;
    eliminated: boolean;
  };
  categoryLabel: string;
  timerEnabled: boolean;
  allowRecheckRole: boolean;
  roleAcknowledgeProgress: { current: number; total: number };
  clueTurn: {
    currentPlayerId: string | null;
    currentPlayerName: string | null;
    index: number;
    total: number;
    clueRoundNo: number;
    maxClueRounds: number;
  };
  clueEndsAtMs: number | null;
  discussionEndsAtMs: number | null;
  voteProgress: { done: number; total: number };
  yourVoteSubmitted: boolean;
  tieBreakCandidates: { id: string; name: string }[];
  voteResults: Record<string, number> | null;
  tiedPlayerIds: string[] | null;
  eliminationReveal: {
    playerId: string;
    playerName: string;
  } | null;
  eliminationAckProgress: { current: number; total: number };
  mrWhiteGuessPrompt: boolean;
  recheckRoleView: { secretWord?: string } | null;
  lastEvent: string;
  gameResult: GameResult | null;
  gameOverReveal?: {
    civilianWord: string;
    undercoverWord: string;
    categoryLabel: string;
    roles: Record<string, UndercoverRole>;
    words: Record<string, string | undefined>;
    voteHistory: UndercoverVoteRecord[];
    roundsPlayed: number;
    mostVotedPlayerId: string | null;
    winningTeam: 'civilian' | 'hidden' | 'mr_white';
  };
}

export interface UndercoverPlayerFull {
  id: string;
  name: string;
  role: UndercoverRole;
  eliminated: boolean;
}

export interface UndercoverState {
  phase: UndercoverPhase;
  hostId: string;
  players: UndercoverPlayerFull[];
  playerNames: Record<string, string>;
  options: UndercoverLobbyOptions;
  categoryLabel: string;
  civilianWord: string;
  undercoverWord: string;
  civilianVariants: string[];
  roleAcknowledged: Record<string, true>;
  roleAcknowledgeCount: number;
  roundNo: number;
  clueRoundNo: number;
  clueOrder: string[];
  clueIndex: number;
  clueEndsAtMs: number | null;
  discussionEndsAtMs: number | null;
  votes: Record<string, string>;
  tieBreakCandidates: string[];
  isTieBreakVote: boolean;
  voteResults: Record<string, number> | null;
  tiedPlayerIds: string[] | null;
  pendingEliminationId: string | null;
  eliminationAcknowledged: Record<string, true>;
  eliminationAckCount: number;
  mrWhiteGuessPlayerId: string | null;
  voteHistory: UndercoverVoteRecord[];
  recheckRoleViewByPlayer: Record<string, { secretWord?: string }>;
  lastEvent: string;
  outcome: GameResult | null;
  winningTeam: 'civilian' | 'hidden' | 'mr_white' | null;
}
