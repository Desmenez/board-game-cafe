import type { GameResult } from './game.js';

// ============================================================
// Spyfall — social deduction (honor-system questioning)
// ============================================================

export type SpyfallPhase =
  | 'role_reveal'
  | 'questioning'
  | 'accusation_vote'
  | 'spy_guess'
  | 'round_end'
  | 'game_over';

export interface SpyfallLobbyOptions {
  roundCount: number;
  roundMinutes: number;
  useRoles: boolean;
}

export const SPYFALL_ROUND_COUNT_OPTIONS = [3, 5, 7] as const;
export const SPYFALL_ROUND_MINUTES_OPTIONS = [6, 8, 10, 12, 15] as const;

export function defaultSpyfallLobbyOptions(): SpyfallLobbyOptions {
  return { roundCount: 5, roundMinutes: 8, useRoles: true };
}

export function parseSpyfallLobbyOptions(raw: unknown): SpyfallLobbyOptions {
  const defaults = defaultSpyfallLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  let roundCount = defaults.roundCount;
  let roundMinutes = defaults.roundMinutes;
  if (typeof o.roundCount === 'number' && Number.isFinite(o.roundCount)) {
    roundCount = o.roundCount;
  }
  if (typeof o.roundMinutes === 'number' && Number.isFinite(o.roundMinutes)) {
    roundMinutes = o.roundMinutes;
  }
  if (!SPYFALL_ROUND_COUNT_OPTIONS.includes(roundCount as (typeof SPYFALL_ROUND_COUNT_OPTIONS)[number])) {
    roundCount = defaults.roundCount;
  }
  if (
    !SPYFALL_ROUND_MINUTES_OPTIONS.includes(roundMinutes as (typeof SPYFALL_ROUND_MINUTES_OPTIONS)[number])
  ) {
    roundMinutes = defaults.roundMinutes;
  }
  const useRoles = o.useRoles === false ? false : true;
  return { roundCount, roundMinutes, useRoles };
}

export type SpyfallAction =
  | { type: 'acknowledge_role' }
  | { type: 'ask_player'; targetId: string }
  | { type: 'initiate_accusation'; suspectId: string }
  | { type: 'cast_vote'; suspectId: string }
  | { type: 'spy_reveal' }
  | { type: 'spy_guess_location'; locationId: string }
  | { type: 'ack_round_summary' };

export interface SpyfallPublicPlayer {
  id: string;
  name: string;
  isDealer: boolean;
  hasAcknowledgedRole: boolean;
}

export interface SpyfallRoundSummary {
  roundNo: number;
  spyId: string;
  spyName: string;
  locationId: string;
  locationName: string;
  spyWon: boolean;
  reason: string;
  roundPoints: Record<string, number>;
}

export interface SpyfallPendingAccusationView {
  initiatorId: string;
  initiatorName: string;
  suspectId: string;
  suspectName: string;
  votes: Record<string, string>;
  voteProgress: { done: number; total: number };
  mode: 'timer_end' | 'early_accusation';
}

export interface SpyfallPlayerView {
  phase: SpyfallPhase;
  roundNo: number;
  totalRounds: number;
  dealerId: string;
  currentAskerId: string | null;
  lastAskerId: string | null;
  roundEndsAtMs: number | null;
  useRoles: boolean;
  scores: Record<string, number>;
  players: SpyfallPublicPlayer[];
  you: {
    id: string;
    name: string;
    isSpy: boolean;
    locationName?: string;
    roleName?: string;
    hasAcknowledgedRole: boolean;
  };
  locationChoices?: { id: string; name: string }[];
  pendingAccusation?: SpyfallPendingAccusationView | null;
  accusationUsedByMe: boolean;
  canSpyReveal: boolean;
  lastRoundSummary: SpyfallRoundSummary | null;
  gameResult: GameResult | null;
  lastEvent: string;
  roundReveal?: {
    spyId: string;
    spyName: string;
    locationId: string;
    locationName: string;
    assignments: Record<string, { roleName?: string; isSpy: boolean }>;
  };
}

export interface SpyfallState {
  phase: SpyfallPhase;
  roundNo: number;
  totalRounds: number;
  roundDurationMs: number;
  useRoles: boolean;
  dealerId: string;
  spyId: string;
  locationId: string;
  locationName: string;
  assignments: Record<string, { isSpy: boolean; roleName?: string }>;
  playerOrder: string[];
  playerNames: Record<string, string>;
  scores: Record<string, number>;
  usedLocationIds: string[];
  roleAcknowledged: Record<string, true>;
  roleAcknowledgeCount: number;
  currentAskerId: string | null;
  lastAskerId: string | null;
  roundEndsAtMs: number | null;
  accusationUsed: Record<string, true>;
  accusationVotes: Record<string, string>;
  voteMode: 'none' | 'timer_end' | 'early_accusation';
  accusationInitiatorId: string | null;
  pendingSuspectId: string | null;
  lastRoundSummary: SpyfallRoundSummary | null;
  lastEvent: string;
  result: GameResult | null;
  previousSpyId: string | null;
}
