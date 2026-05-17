import type { GameResult } from './game.js';

/** Spell rank 1–8 — count in deck: rank r appears r times (36 total) */
export type AbracaSpellRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type AbracaAction =
  | { type: 'cast_spell'; spellRank: AbracaSpellRank }
  | { type: 'end_turn' }
  | { type: 'pick_secret'; index: number };

export interface AbracaPublicPlayer {
  id: string;
  name: string;
  life: number;
  /** 0–7 = below floors; 8 = won */
  towerFloor: number;
  handSize: number;
}

export interface AbracaPlayerView {
  phase: 'playing' | 'game_over';
  myId: string;
  roundNo: number;
  targetTowerFloor: 8;
  players: AbracaPublicPlayer[];
  /** Visible spellstones for each other player (multiset of ranks 1–8) */
  othersHands: Record<string, number[]>;
  playerOrder: string[];
  currentPlayerId: string;
  /** Same turn chain: next cast must be ≥ this (null = first cast this turn) */
  lastCastRankThisTurn: number | null;
  successfulCastsThisTurn: number;
  /** Spellstones placed next to the board this round (by rank) */
  stonesOnBoardThisRound: Partial<Record<number, number>>;
  drawPileCount: number;
  secretPileCount: number;
  /** You (current player) must pick a secret stone index */
  subPhase: 'normal' | 'pick_secret';
  /** Only when subPhase === pick_secret' — valid indices 0 .. pickSecretCount-1 */
  pickSecretCount: number;
  lastEvent: string;
  gameResult?: GameResult;
  /** Shown once for dice animation (Ancient Dragon / Sweet Dream / fail spell 1) */
  lastDieRoll: { value: 1 | 2 | 3 | 4 | 5 | 6; context: AbracaDieContext } | null;
  /** Secret stones you took this round (ranks) — only you see */
  mySecretRanks: number[];
  /** ผลล่าสุดของการร่ายสเปลล์ (ทายถูก/ผิด) — ล้างเมื่อเริ่มรอบใหม่ */
  lastSpellReveal: AbracaSpellReveal | null;
}

export type AbracaDieContext = 'dragon_success' | 'dragon_fail' | 'sweet_dream' | 'generic';

/** แจ้งผลการ “ทาย” เลขสเปลล์เมื่อร่าย — ใช้โชว์โมดัล (seq เพิ่มทุกครั้งที่มีเหตุการณ์ใหม่) */
export type AbracaSpellReveal =
  | {
      seq: number;
      playerId: string;
      spellRank: AbracaSpellRank;
      outcome: 'success';
    }
  | {
      seq: number;
      playerId: string;
      spellRank: AbracaSpellRank;
      outcome: 'fail_no_stone';
    }
  | {
      seq: number;
      playerId: string;
      spellRank: 1;
      outcome: 'fail_dragon';
      dragonDamage: number;
    }
  | {
      seq: number;
      playerId: string;
      spellRank: AbracaSpellRank;
      outcome: 'fail_chain';
      chainRequiredRank: number;
    };
