import type { GameResult } from './game.js';

export type FugitiveRole = 'fugitive' | 'marshal';

export type FugitivePhase =
  | 'fugitive_first'
  | 'marshal_first'
  | 'fugitive_turn'
  | 'marshal_turn'
  | 'manhunt'
  | 'game_over';

export type FugitiveSubphase = 'draw' | 'action';

export type FugitiveDrawPile = 'pile1' | 'pile2' | 'pile3';

export interface FugitiveLobbyOptions {
  fugitiveMode: 'random' | 'manual';
  fugitivePlayerId?: string;
}

export interface FugitiveHideoutSlot {
  instanceId: string;
  value: number;
  revealed: boolean;
  sprintValues: number[];
}

export interface FugitivePlayerSeat {
  id: string;
  name: string;
  role: FugitiveRole;
}

export interface FugitiveState {
  phase: FugitivePhase;
  subphase: FugitiveSubphase | null;
  fugitiveId: string;
  marshalId: string;
  activePlayerId: string;
  players: FugitivePlayerSeat[];
  hideouts: FugitiveHideoutSlot[];
  decks: {
    pile1: number[];
    pile2: number[];
    pile3: number[];
  };
  fugitiveHand: number[];
  marshalHand: number[];
  /** Draws remaining in current draw subphase (0 = action phase). */
  drawsRequired: number;
  /** Hideouts the fugitive must place before ending step (2 on first turn). */
  hideoutsRequiredThisStep: number;
  manhuntActive: boolean;
  result: GameResult | null;
  eventLog: string[];
  lastEvent: string;
}

export interface FugitiveHideoutView {
  instanceId: string;
  value?: number;
  revealed: boolean;
  sprintCount: number;
  sprintValues?: number[];
}

export interface FugitivePlayerView {
  phase: FugitivePhase;
  subphase: FugitiveSubphase | null;
  myId: string;
  myRole: FugitiveRole;
  fugitiveId: string;
  marshalId: string;
  activePlayerId: string;
  opponentName: string;
  opponentHandCount: number;
  players: FugitivePlayerSeat[];
  hideouts: FugitiveHideoutView[];
  deckCounts: { pile1: number; pile2: number; pile3: number };
  myHand?: number[];
  drawsRequired: number;
  hideoutsRequiredThisStep: number;
  manhuntActive: boolean;
  canAct: boolean;
  canDraw: boolean;
  canPlaceHideout: boolean;
  canPass: boolean;
  canGuess: boolean;
  canManhuntGuess: boolean;
  lastHideoutValue: number;
  eventLog: string[];
  lastEvent: string;
  gameResult?: GameResult;
}

export type FugitiveAction =
  | { type: 'draw'; pile: FugitiveDrawPile }
  | { type: 'place_hideout'; hideoutCard: number; sprintCards?: number[] }
  | { type: 'pass' }
  | { type: 'guess'; numbers: number[] }
  | { type: 'manhunt_guess'; number: number };

export const FUGITIVE_MANHUNT_THRESHOLD = 30;

/** Cloudinary upload version for Fugitive cover (card arts use unpinned public_id). */
export const FUGITIVE_CLOUD_VERSION = 'v1782402508';

export const FUGITIVE_PILE1_RANGE = { min: 4, max: 14 } as const;
export const FUGITIVE_PILE2_RANGE = { min: 15, max: 28 } as const;
export const FUGITIVE_PILE3_RANGE = { min: 29, max: 41 } as const;

export function defaultFugitiveLobbyOptions(): FugitiveLobbyOptions {
  return { fugitiveMode: 'random' };
}

export function parseFugitiveLobbyOptions(raw: unknown): FugitiveLobbyOptions {
  const defaults = defaultFugitiveLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  const fugitiveMode = o.fugitiveMode === 'manual' ? 'manual' : 'random';
  const fugitivePlayerId =
    fugitiveMode === 'manual' &&
    typeof o.fugitivePlayerId === 'string' &&
    o.fugitivePlayerId.trim() !== ''
      ? o.fugitivePlayerId.trim()
      : undefined;
  return { fugitiveMode, fugitivePlayerId };
}

/** Sprint value on card n: odd +1, even +2. */
export function sprintValue(card: number): 1 | 2 {
  return card % 2 === 0 ? 2 : 1;
}

export function totalSprintValue(cards: readonly number[]): number {
  return cards.reduce((sum, c) => sum + sprintValue(c), 0);
}

export function lastHideoutValue(hideouts: readonly { value: number }[]): number {
  if (hideouts.length === 0) return 0;
  return hideouts[hideouts.length - 1]!.value;
}

export function maxRevealedHideoutValue(
  hideouts: readonly { value: number; revealed: boolean }[],
  excludeEscape = true,
): number | null {
  let max: number | null = null;
  for (const h of hideouts) {
    if (!h.revealed) continue;
    if (excludeEscape && h.value === 42) continue;
    if (max === null || h.value > max) max = h.value;
  }
  return max;
}

export function hasUnrevealedHideouts(hideouts: readonly { revealed: boolean }[]): boolean {
  return hideouts.some((h) => !h.revealed);
}

export interface HideoutPlacementValidation {
  ok: boolean;
  error?: string;
  sprintNeeded: number;
  sprintProvided: number;
}

export function validateHideoutPlacement(
  prevValue: number,
  hideoutCard: number,
  sprintCards: readonly number[],
): HideoutPlacementValidation {
  if (hideoutCard < 1 || hideoutCard > 42) {
    return { ok: false, error: 'การ์ด hideout ไม่ถูกต้อง', sprintNeeded: 0, sprintProvided: 0 };
  }
  if (hideoutCard <= prevValue) {
    return {
      ok: false,
      error: 'hideout ใหม่ต้องมากกว่าที่ก่อนหน้า',
      sprintNeeded: 0,
      sprintProvided: 0,
    };
  }
  const normalMax = prevValue + 3;
  const sprintNeeded = Math.max(0, hideoutCard - normalMax);
  const sprintProvided = totalSprintValue(sprintCards);
  if (sprintProvided < sprintNeeded) {
    return {
      ok: false,
      error: `ต้อง Sprint อย่างน้อย +${sprintNeeded} (มี +${sprintProvided})`,
      sprintNeeded,
      sprintProvided,
    };
  }
  return { ok: true, sprintNeeded, sprintProvided };
}

export function rangeArray(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = min; i <= max; i += 1) out.push(i);
  return out;
}
