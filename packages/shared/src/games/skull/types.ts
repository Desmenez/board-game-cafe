import type { GameResult } from '../../platform/game.js';
import { SKULL_COLORS, type SkullColor } from './assets.js';

export { SKULL_COLORS, type SkullColor };
export * from './assets.js';

export const SKULL_MIN_PLAYERS = 3;
export const SKULL_MAX_PLAYERS = 6;
export const SKULL_WINS_TO_VICTORY = 2;

export type SkullDiscFace = 'flower' | 'skull';

export interface SkullDisc {
  id: string;
  color: SkullColor;
  face: SkullDiscFace;
  /** Temporary flower granted after surviving with 1 disc — known publicly. */
  isLastChance?: boolean;
}

/** Disc on a mat stack. Index 0 = bottom; last = top. */
export interface SkullStackDisc extends SkullDisc {
  faceUp: boolean;
}

export type SkullPhase =
  | 'opening_place'
  | 'decision'
  | 'bidding'
  | 'challenge'
  | 'choose_discard'
  | 'discard_reveal'
  | 'choose_first_player'
  | 'round_result'
  | 'game_over';

export type SkullAction =
  | { type: 'place_opening'; discId: string }
  | { type: 'place_disc'; discId: string }
  | { type: 'open_bid'; amount: number }
  | { type: 'outbid'; amount: number }
  | { type: 'pass' }
  /** Flip the topmost face-down disc on `ownerId`'s mat. */
  | { type: 'flip'; ownerId: string }
  /** Challenger picks which disc to lose after revealing their own skull. */
  | { type: 'choose_discard'; discId: string }
  /** Skull owner confirms random discard of challenger's disc. */
  | { type: 'confirm_random_discard' }
  /** Self-eliminated Challenger picks who starts the next round. */
  | { type: 'choose_first_player'; playerId: string }
  | { type: 'ack_round' };

export interface SkullSeat {
  id: string;
  name: string;
  color: SkullColor;
  hand: SkullDisc[];
  stack: SkullStackDisc[];
  /** 0 = blank mat, 1 = flower mat (one successful challenge). */
  wins: 0 | 1;
  eliminated: boolean;
  /** Awarded for the upcoming / current round only. */
  hasLastChance: boolean;
  /** Each player may receive Last Chance at most once. */
  usedLastChance: boolean;
  /** Bidding: true after pass this round. */
  passed: boolean;
}

export interface SkullPendingDiscard {
  challengerId: string;
  skullOwnerId: string;
  mode: 'random_by_owner' | 'choose_by_challenger';
  /** Challenger's discs (hand + stack) available to lose — faces hidden from others in view. */
  pool: SkullDisc[];
}

/** After random discard: faces are private to the Challenger (disc owner). */
export interface SkullDiscardReveal {
  challengerId: string;
  skullOwnerId: string;
  discarded: SkullDisc;
  /** Pool snapshot before the discard. */
  pool: SkullDisc[];
}

/** Public discard-reveal payload — faces only for the Challenger. */
export interface SkullDiscardRevealView {
  challengerId: string;
  skullOwnerId: string;
  /** True when this viewer is not the Challenger — no disc faces. */
  facesHidden: boolean;
  /** Set only when `facesHidden` is false. */
  discarded: SkullDisc | null;
  /** Set only when `facesHidden` is false. */
  pool: SkullDisc[] | null;
}

export type SkullRoundOutcome =
  | { kind: 'success'; challengerId: string; wonGame: boolean }
  | {
      kind: 'failure';
      challengerId: string;
      skullOwnerId: string;
      eliminated: boolean;
    };

export interface SkullState {
  phase: SkullPhase;
  playerOrder: string[];
  seats: Record<string, SkullSeat>;
  firstPlayerId: string;
  /** Decision / bidding turn. */
  activePlayerId: string | null;
  challengerId: string | null;
  currentBid: number;
  /** Flowers flipped so far this challenge. */
  flippedCount: number;
  pendingDiscard: SkullPendingDiscard | null;
  /** Set after random discard until players ack the reveal. */
  discardReveal: SkullDiscardReveal | null;
  /**
   * When a self-eliminated Challenger must pick the next first player,
   * or after they chose — consumed in startNextRound.
   */
  nextFirstPlayerId: string | null;
  /** Player who holds the Last Chance disc this round (if any). */
  lastChanceHolderId: string | null;
  /** Player who will receive LC when the next round starts. */
  pendingLastChanceId: string | null;
  round: number;
  lastEvent: string;
  result: GameResult | null;
  roundOutcome: SkullRoundOutcome | null;
  /** Active (non-eliminated) players — legacy field; one ack advances the round. */
  pendingAcks: string[];
}

/** Public stack disc as seen by a viewer. */
export interface SkullPublicStackDisc {
  id: string;
  color: SkullColor;
  faceUp: boolean;
  /** Present only when faceUp (or Last Chance known-flower while face-down is still back art). */
  face: SkullDiscFace | null;
  isLastChance?: boolean;
}

export interface SkullPublicSeat {
  id: string;
  name: string;
  color: SkullColor;
  wins: 0 | 1;
  eliminated: boolean;
  hasLastChance: boolean;
  handCount: number;
  stack: SkullPublicStackDisc[];
  passed: boolean;
  /** Mat pushed toward center after pass (bidding). */
  matAside: boolean;
}

export interface SkullPlayerView {
  phase: SkullPhase;
  playerOrder: string[];
  seats: SkullPublicSeat[];
  firstPlayerId: string;
  activePlayerId: string | null;
  challengerId: string | null;
  currentBid: number;
  flippedCount: number;
  discsInPlay: number;
  round: number;
  lastEvent: string;
  result: GameResult | null;
  roundOutcome: SkullRoundOutcome | null;
  pendingAcks: string[];
  lastChanceHolderId: string | null;
  /** Present during discard_reveal — faces only for the Challenger. */
  discardReveal: SkullDiscardRevealView | null;
  you: {
    hand: SkullDisc[];
    canAct: boolean;
    /** Disc ids legal to place this turn. */
    legalPlaceDiscIds: string[];
    /** Owner ids whose top face-down disc may be flipped now. */
    legalFlipOwnerIds: string[];
    /**
     * Challenger's discs: selectable when choosing after own skull,
     * or read-only preview when waiting for random discard of your discs.
     */
    discardPool: SkullDisc[] | null;
    /** True when you must confirm random discard of challenger's disc. */
    mustConfirmRandomDiscard: boolean;
    /** Surviving players you may pick as next first player (self-elim). */
    legalFirstPlayerIds: string[];
    minBid: number;
    maxBid: number;
  };
}

export function skullColorLabelTh(color: SkullColor): string {
  switch (color) {
    case 'red':
      return 'แดง';
    case 'purple':
      return 'ม่วง';
    case 'orange':
      return 'ส้ม';
    case 'green':
      return 'เขียว';
    case 'brown':
      return 'น้ำตาล';
    case 'blue':
      return 'น้ำเงิน';
  }
}

export function skullPhaseLabelTh(phase: SkullPhase): string {
  switch (phase) {
    case 'opening_place':
      return 'วางดิสก์แรก';
    case 'decision':
      return 'วางหรือบิด';
    case 'bidding':
      return 'ประมูล';
    case 'challenge':
      return 'ท้าทาย';
    case 'choose_discard':
      return 'ทิ้งดิสก์';
    case 'discard_reveal':
      return 'เปิดเผยดิสก์ที่ทิ้ง';
    case 'choose_first_player':
      return 'เลือกผู้เริ่มรอบถัดไป';
    case 'round_result':
      return 'จบรอบ';
    case 'game_over':
      return 'จบเกม';
  }
}
