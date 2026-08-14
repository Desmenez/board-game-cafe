import type { GameResult } from '../../platform/game.js';
import {
  type SpicySpecialId,
  type SpicySpice,
  spicySpiceLabelTh,
} from './assets.js';

export {
  SPICY_CARD_BACK,
  SPICY_COVER,
  SPICY_SPECIAL_ART,
  SPICY_SPECIAL_BACK,
  SPICY_SPECIAL_IDS,
  SPICY_SPICE_COLOR,
  SPICY_TROPHY,
  SPICY_TROPHY_BACK,
  SPICY_WILD_NUMBER,
  SPICY_WILD_SPICE,
  SPICY_WORLDS_END,
  SPICY_WORLDS_END_BACK,
  spicyNumberCardArt,
  spicySpecialLabelTh,
  spicySpiceLabelTh,
  type SpicySpecialId,
  type SpicySpice,
} from './assets.js';

export const SPICY_MIN_PLAYERS = 2;
export const SPICY_MAX_PLAYERS = 6;
export const SPICY_HAND_SIZE = 6;
export const SPICY_TROPHY_POINTS = 10;
export const SPICY_TROPHY_COUNT = 3;

export type SpicyCardKind = 'numbered' | 'wild_number' | 'wild_spice';

export interface SpicyCard {
  id: string;
  kind: SpicyCardKind;
  /** Present for numbered cards. */
  spice?: SpicySpice;
  /** Present for numbered cards (1–10). */
  number?: number;
}

/** Declared claim when a card is played face-down. */
export interface SpicyDeclaration {
  number: number;
  spice: SpicySpice;
}

export interface SpicyStackEntry {
  card: SpicyCard;
  ownerId: string;
  declaration: SpicyDeclaration;
  /**
   * Cards tucked under a Change Your Luck "5" — not subject to challenge.
   * Stored under the entry that was declared as 5.
   */
  tucked?: SpicyCard[];
  /** True when this entry was a Copy Cat play. */
  isCopyCat?: boolean;
}

export type SpicyPhase =
  | 'turn'
  /** After declaring 5 with Change Your Luck — choose 0–2 cards to tuck. */
  | 'tuck'
  /** After last card: waiting for challenge or all declines. */
  | 'trophy_window'
  /** Brief reveal after a challenge before continuing. */
  | 'challenge_reveal'
  /** After scoring a pile / trophy — ack before the next turn. */
  | 'round_summary'
  | 'game_over';

export type SpicyRoundSummaryReason =
  | 'trophy_uncontested'
  | 'challenge_wrong'
  | 'challenge_right';

export interface SpicyRoundDelta {
  playerId: string;
  name: string;
  /** Cards taken from the spicy stack this beat. */
  wonCards: number;
  /** Trophies awarded this beat (0 or 1). */
  trophies: number;
  /** wonCards + trophies × 10. */
  points: number;
}

export interface SpicyRoundSummary {
  reason: SpicyRoundSummaryReason;
  rows: SpicyRoundDelta[];
  /** Face of the challenged card when this beat came from a challenge. */
  revealed: SpicyCard | null;
}

/** Internal: continuation applied on `ack_round`. */
export interface SpicyPendingContinue {
  drawTwoPlayerId: string | null;
  redrawSixPlayerId: string | null;
  nextActivePlayerId: string;
  gameOverReason: string | null;
  gameOverWinners: string[] | null;
}

export interface SpicyLobbyOptions {
  useSpecialCards: boolean;
}

export function defaultSpicyLobbyOptions(): SpicyLobbyOptions {
  return { useSpecialCards: false };
}

export function parseSpicyLobbyOptions(raw: unknown): SpicyLobbyOptions {
  const defaults = defaultSpicyLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  return { useSpecialCards: o.useSpecialCards === true };
}

export type SpicyAction =
  | { type: 'play_card'; cardId: string; number: number; spice: SpicySpice }
  | { type: 'pass' }
  | { type: 'challenge'; trait: 'number' | 'spice' }
  /** Copy Cat challenge — both traits must match. */
  | { type: 'challenge_copy' }
  | { type: 'decline_challenge' }
  | { type: 'tuck_cards'; cardIds: string[] }
  | { type: 'copy_cat'; cardId: string }
  | { type: 'ack_challenge' }
  | { type: 'ack_round' };

export interface SpicySeat {
  id: string;
  name: string;
  hand: SpicyCard[];
  /** Won spicy cards (face-down pile) — count only for scoring. */
  wonCount: number;
  trophies: number;
}

export interface SpicyChallengeReveal {
  challengerId: string;
  challengedId: string;
  trait: 'number' | 'spice' | 'both';
  declaration: SpicyDeclaration;
  revealed: SpicyCard;
  challengerWon: boolean;
  /** Pending trophy award for challenged player if they emptied hand and won. */
  pendingTrophyId: string | null;
}

export interface SpicyScoreBreakdown {
  playerId: string;
  name: string;
  wonCards: number;
  trophies: number;
  handPenalty: number;
  total: number;
}

export interface SpicyState {
  phase: SpicyPhase;
  playerOrder: string[];
  seats: Record<string, SpicySeat>;
  activePlayerId: string;
  drawPile: SpicyCard[];
  /** Index from top (0) where World's End sits; null if already revealed / game ended by WE. */
  worldsEndAt: number | null;
  spicyStack: SpicyStackEntry[];
  trophiesLeft: number;
  specialCard: SpicySpecialId | null;
  /** Spice Raider: stack index of the declared 4 (cards below go to raider when next card lands). */
  spiceRaiderIndex: number | null;
  spiceRaiderOwnerId: string | null;
  /** After a play, others may Copy Cat until next non-copy turn advances. */
  copyWindowOpen: boolean;
  /** Last successful play declaration (for Copy Cat). */
  lastPlay: {
    playerId: string;
    declaration: SpicyDeclaration;
  } | null;
  /** Players who declined challenge during trophy_window. */
  declineChallengeIds: string[];
  challengeReveal: SpicyChallengeReveal | null;
  roundSummary: SpicyRoundSummary | null;
  pendingContinue: SpicyPendingContinue | null;
  /** Seat waiting to tuck after Change Your Luck. */
  tuckPlayerId: string | null;
  lastEvent: string;
  /** Bumps whenever someone passes and draws so clients can toast. */
  passNoticeSeq: number;
  passNotice: { playerId: string; playerName: string } | null;
  result: GameResult | null;
  scores: SpicyScoreBreakdown[] | null;
}

export interface SpicyPublicSeat {
  id: string;
  name: string;
  handCount: number;
  wonCount: number;
  trophies: number;
}

export interface SpicyPlayerView {
  phase: SpicyPhase;
  playerOrder: string[];
  seats: SpicyPublicSeat[];
  activePlayerId: string;
  drawCount: number;
  /** Approximate cards until World's End (null if already passed / unknown). */
  cardsUntilWorldsEnd: number | null;
  spicyStackCount: number;
  /** Public declared top of stack (face still hidden). */
  topDeclaration: SpicyDeclaration | null;
  topOwnerId: string | null;
  trophiesLeft: number;
  specialCard: SpicySpecialId | null;
  spiceRaiderIndex: number | null;
  copyWindowOpen: boolean;
  lastPlay: SpicyState['lastPlay'];
  declineChallengeIds: string[];
  challengeReveal: SpicyChallengeReveal | null;
  roundSummary: SpicyRoundSummary | null;
  lastEvent: string;
  passNoticeSeq: number;
  passNotice: { playerId: string; playerName: string } | null;
  result: GameResult | null;
  scores: SpicyScoreBreakdown[] | null;
  you: {
    hand: SpicyCard[];
    canAct: boolean;
    canPlay: boolean;
    canPass: boolean;
    canChallenge: boolean;
    canChallengeCopy: boolean;
    canDecline: boolean;
    canCopyCat: boolean;
    canTuck: boolean;
    canAckChallenge: boolean;
    canAckRound: boolean;
    legalDeclarations: SpicyDeclaration[];
  };
}

export function spicyPhaseLabelTh(phase: SpicyPhase): string {
  switch (phase) {
    case 'turn':
      return 'ตาเล่น';
    case 'tuck':
      return 'สอดการ์ดใต้ 5';
    case 'trophy_window':
      return 'รอท้าทายถ้วย';
    case 'challenge_reveal':
      return 'ผลท้าทาย';
    case 'round_summary':
      return 'สรุปรอบ';
    case 'game_over':
      return 'จบเกม';
  }
}

export function spicyRoundSummaryTitleTh(reason: SpicyRoundSummaryReason): string {
  switch (reason) {
    case 'trophy_uncontested':
      return 'ได้ถ้วยรางวัล';
    case 'challenge_wrong':
      return 'สรุปรอบ';
    case 'challenge_right':
      return 'สรุปรอบ';
  }
}

export function spicyRoundSummaryHintTh(reason: SpicyRoundSummaryReason): string {
  switch (reason) {
    case 'trophy_uncontested':
      return 'ทุกคนไม่ท้า — ได้ถ้วย +10 แต้ม';
    case 'challenge_wrong':
      return 'ผู้ท้าแพ้ — กองเผ็ดตกเป็นของผู้ถูกท้า';
    case 'challenge_right':
      return 'ผู้ท้าชนะ — ได้กองเผ็ดเป็นแต้ม';
  }
}

export function spicyDeclareLabelTh(d: SpicyDeclaration): string {
  return `${d.number} ${spicySpiceLabelTh(d.spice)}`;
}
