import type { GameResult } from './game.js';

export type Flip7NumberValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Flip7AddModifier = 2 | 4 | 6 | 8 | 10;

export type Flip7Card =
  | { kind: 'number'; value: Flip7NumberValue }
  | { kind: 'modifier_add'; value: Flip7AddModifier }
  | { kind: 'modifier_mul2' }
  | { kind: 'second_chance' }
  | { kind: 'action_freeze' }
  | { kind: 'action_discard' }
  | { kind: 'action_steal' }
  | { kind: 'action_flip_n'; count: 3 | 4 }
  | { kind: 'action_just_one_more' };

/** Everyone sees pending; only sourcePlayerId may submit resolve_pending_action. */
export type Flip7PendingActionView =
  | {
      mode: 'action_target';
      kind: Extract<
        Flip7Card['kind'],
        | 'action_freeze'
        | 'action_discard'
        | 'action_steal'
        | 'action_flip_n'
        | 'action_just_one_more'
      >;
      sourcePlayerId: string;
      targetOptions: { id: string; name: string }[];
      drawCount?: 1 | 3 | 4;
    }
  | {
      mode: 'second_chance_gift';
      sourcePlayerId: string;
      targetOptions: { id: string; name: string }[];
    }
  | {
      mode: 'bust_second_chance';
      playerId: string;
      /** เลขที่จั่วซ้ำ (ยังไม่วางบนแถวจนกว่าจะเลือก Bust) */
      duplicateCard: Flip7Card;
    };

/** Broadcast when someone draws a non-number “special” card (modifiers, SC, actions). */
export interface Flip7SpecialDrawBroadcast {
  id: string;
  playerId: string;
  playerName: string;
  card: Flip7Card;
  /** True when the drawer must pick another player (action target or SC gift). */
  needsTarget: boolean;
}

/** Ordered UI steps after Flip 3/4 (and similar) resolves — client plays strictly in order. */
export type Flip7ModalScriptItem =
  | {
      kind: 'special_draw';
      id: string;
      playerId: string;
      playerName: string;
      card: Flip7Card;
      needsTarget: boolean;
    }
  | {
      kind: 'flip_card';
      id: string;
      flipIndex: number;
      flipTotal: number;
      card: Flip7Card;
      revealedPlayerId: string;
      revealedPlayerName: string;
      sourcePlayerId: string;
      sourceName: string;
      targetPlayerId: string;
      targetName: string;
    }
  | {
      kind: 'second_chance_acquired';
      id: string;
      playerId: string;
      playerName: string;
    }
  | {
      kind: 'second_chance_consumed';
      id: string;
      playerId: string;
      playerName: string;
    }
  | {
      kind: 'bust';
      id: string;
      playerId: string;
      playerName: string;
      card: Flip7Card;
    };

export interface Flip7ModalScript {
  id: string;
  items: Flip7ModalScriptItem[];
}

export interface Flip7PublicPlayer {
  id: string;
  name: string;
  totalScore: number;
  /** Potential score from cards in this round (0 when busted). */
  roundPreviewScore: number;
  active: boolean;
  busted: boolean;
  stayed: boolean;
  flip7: boolean;
  lineCount: number;
  /**
   * จำนวนครั้งที่ยังต้อง Hit จาก Flip N / Just One More ที่คิวไว้ (รวมทุกเฟรมใน stack)
   */
  forcedDrawRemaining: number;
}

/** Snapshot of the round that just ended (before lines reset). */
export interface Flip7LastRoundSummaryRow {
  id: string;
  name: string;
  /** Points banked this round (0 if bust). */
  roundPoints: number;
  busted: boolean;
  stayed: boolean;
  flip7: boolean;
}

export interface Flip7SoloBustReveal {
  playerId: string;
  playerName: string;
  card: Flip7Card;
}

export interface Flip7LastRoundSummary {
  endedRoundNo: number;
  /** When the round ends in the same update as a Flip 3/4 script, play this before recap. */
  prefaceModalScript?: Flip7ModalScript | null;
  rows: Flip7LastRoundSummaryRow[];
  /**
   * True when the round was ended by the last active player via bust or stay
   * (not a Flip 7 bonus finish).
   */
  showRecapModal: boolean;
  /** Dealer for the next round (after this round is scored). */
  nextDealerId: string;
  nextDealerName: string;
  /**
   * When the sole remaining active player busted to end the round; clients may
   * show BUST first then round recap for everyone.
   */
  soloEndingBust?: Flip7SoloBustReveal | null;
}

export interface Flip7PlayerView {
  phase: 'playing' | 'game_over';
  myId: string;
  round: number;
  targetScore: number;
  dealerId: string;
  currentPlayerId: string;
  players: Flip7PublicPlayer[];
  tableLines: Record<string, Flip7Card[]>;
  deckRemaining: number;
  discardCount: number;
  lastEvent: string;
  canAct: boolean;
  /** Remaining forced draws for this viewer (from Flip N / Just One More). */
  myForcedDrawRemaining: number;
  pendingAction?: Flip7PendingActionView;
  gameResult?: GameResult;
  /** Present after a round is scored; may drive a one-shot recap UI. */
  lastRoundSummary?: Flip7LastRoundSummary | null;
  /** Last non-number card drawn on a hit (cleared on next hit / some resolves). */
  lastSpecialDraw?: Flip7SpecialDrawBroadcast | null;
  /** Ordered modals after Flip 3/4 resolve (special → each flip → SC / bust). */
  modalScript?: Flip7ModalScript | null;
}

export type Flip7Action =
  | { type: 'hit' }
  | { type: 'stay' }
  | { type: 'resolve_pending_action'; targetPlayerId: string }
  | { type: 'resolve_bust_second_chance'; useSecondChance: boolean };
