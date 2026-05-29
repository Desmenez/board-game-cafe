import type { GameResult } from './game.js';
import { SIMILO_ALL_DECK_IDS, SIMILO_DEFAULT_DECK_IDS, type SimiloDeckId } from '../similo-deck.js';

export type SimiloGameMode = 'team' | 'competitive';

export type SimiloPhase = 'play_clue' | 'discuss' | 'game_over' | 'aborted';

export type SimiloOrientation = 'similar' | 'different';

export type SimiloRole = 'clue_giver' | 'guesser';

export interface SimiloLobbyOptions {
  clueGiverMode: 'random' | 'manual';
  clueGiverPlayerId?: string;
  gameMode: SimiloGameMode;
  selectedDeckIds: SimiloDeckId[];
}

export interface SimiloCharacterView {
  id: string;
  label: string;
  imageUrl: string;
}

export interface SimiloGridCardView {
  index: number;
  characterId: string;
  label: string;
  imageUrl: string;
  /** ถูกเอาออกจากกระดานร่วม (ใช้ปิดการโต้ตอบ) */
  removed: boolean;
  /** แสดงเทาเฉพาะผู้ดู — คนทายเห็นแค่การ์ดที่ตัวเองเลือกเอาออก */
  grayedForViewer?: boolean;
}

export interface SimiloHandCardView {
  instanceId: string;
  characterId: string;
  label: string;
  imageUrl: string;
}

export type SimiloPlayerEliminationReason = 'secret' | 'timeout';

export interface SimiloRoundPlayerEliminationView {
  playerId: string;
  playerName: string;
  reason: SimiloPlayerEliminationReason;
}

export interface SimiloRoundGuesserRemovalView {
  guesserId: string;
  guesserName: string;
  cards: SimiloCharacterView[];
}

/** สรุปหลังจบ discuss ของรอบนั้น (ทุกที่นั่งเห็นเหมือนกัน) */
export interface SimiloRoundResolutionView {
  playersEliminated: SimiloRoundPlayerEliminationView[];
  removalsByGuesser: SimiloRoundGuesserRemovalView[];
}

export interface SimiloPlayedClueView {
  round: number;
  characterId: string;
  label: string;
  imageUrl: string;
  orientation: SimiloOrientation;
  /** มีเมื่อรอบนั้นจบ discuss แล้ว */
  roundResolution?: SimiloRoundResolutionView;
}

export interface SimiloPlayerSeat {
  id: string;
  name: string;
  role: SimiloRole;
  eliminated: boolean;
}

/** One guesser's discuss selections (visible to all seats during discuss). */
export interface SimiloDiscussGuesserView {
  id: string;
  name: string;
  confirmed: boolean;
  /** การเลือกระหว่าง discuss (รอบปัจจุบัน) */
  picks: number[];
  /** การ์ดที่คนนี้เลือกเอาออกสะสม (ให้ Clue Giver สลับดู) */
  eliminatedIndices: number[];
}

export interface SimiloPlayerView {
  phase: SimiloPhase;
  myId: string;
  gameMode: SimiloGameMode;
  selectedDeckIds: SimiloDeckId[];
  clueGiverId: string;
  myRole: SimiloRole;
  eliminated: boolean;
  players: SimiloPlayerSeat[];
  round: number;
  removalsRequired: number;
  grid: SimiloGridCardView[];
  playedClues: SimiloPlayedClueView[];
  clueHand?: SimiloHandCardView[];
  secretCharacter?: SimiloCharacterView;
  /** Indices this guesser selected during discuss (only for self). */
  myDiscussPicks?: number[];
  /** Per-guesser picks during discuss (for name switcher UI). */
  discussGuessers?: SimiloDiscussGuesserView[];
  discussConfirmed: boolean;
  discussProgress: { confirmed: number; total: number };
  canAct: boolean;
  canConfirmDiscuss: boolean;
  /** โหมดทีม — คนทายทุกคนเลือกการ์ด index เดียวกันแล้ว */
  teamDiscussAligned?: boolean;
  eventLog: string[];
  lastEvent: string;
  gameResult?: GameResult;
  gameOverReveal?: {
    secretCharacterId: string;
    secretLabel: string;
    secretImageUrl: string;
  };
  abortReason?: string;
}

export type SimiloAction =
  | { type: 'play_clue'; handInstanceId: string; orientation: SimiloOrientation }
  | { type: 'toggle_discuss_pick'; gridIndex: number }
  | { type: 'confirm_discuss' };

export const SIMILO_REMOVALS_PER_ROUND = [1, 2, 3, 4, 1] as const;

export const SIMILO_MAX_ROUNDS = 5;

export function similoRemovalsForRound(round: number): number {
  const idx = Math.min(Math.max(round, 1), SIMILO_MAX_ROUNDS) - 1;
  return SIMILO_REMOVALS_PER_ROUND[idx] ?? 1;
}

export function parseSimiloLobbyOptions(raw: unknown): SimiloLobbyOptions {
  const defaults: SimiloLobbyOptions = {
    clueGiverMode: 'random',
    gameMode: 'team',
    selectedDeckIds: [...SIMILO_DEFAULT_DECK_IDS],
  };
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  const clueGiverMode = o.clueGiverMode === 'manual' ? 'manual' : 'random';
  const gameMode = o.gameMode === 'competitive' ? 'competitive' : 'team';
  const selectedDeckIds = Array.isArray(o.selectedDeckIds)
    ? o.selectedDeckIds.filter(
        (deckId): deckId is SimiloDeckId =>
          typeof deckId === 'string' && (SIMILO_ALL_DECK_IDS as readonly string[]).includes(deckId),
      )
    : [];
  const clueGiverPlayerId =
    clueGiverMode === 'manual' &&
    typeof o.clueGiverPlayerId === 'string' &&
    o.clueGiverPlayerId.trim() !== ''
      ? o.clueGiverPlayerId.trim()
      : undefined;
  return {
    clueGiverMode,
    clueGiverPlayerId,
    gameMode,
    selectedDeckIds: selectedDeckIds.length > 0 ? selectedDeckIds : [...SIMILO_DEFAULT_DECK_IDS],
  };
}
