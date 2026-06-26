import type { GameResult } from './game.js';

// ============================================================
// Salem 1692 — social deduction (MVP core loop)
// ============================================================

export type Salem1692Phase =
  | 'dawn'
  | 'playing'
  | 'conspiracy'
  | 'night_witch'
  | 'night_constable'
  | 'night_confess'
  | 'game_over';

export type Salem1692TryalKind = 'not_witch' | 'witch' | 'constable';

export type Salem1692CardColor = 'green' | 'blue' | 'red' | 'black';

export type Salem1692PlayingCardKind =
  | 'accusation'
  | 'evidence'
  | 'piety'
  | 'asylum'
  | 'alibi'
  | 'stocks'
  | 'scapegoat'
  | 'curse'
  | 'robbery'
  | 'witness'
  | 'alibi_green'
  | 'conspiracy'
  | 'night';

export type Salem1692TownHallId =
  | 'abigail_williams'
  | 'ann_putnam'
  | 'cotton_mather'
  | 'giles_corey'
  | 'george_burroughs'
  | 'john_proctor'
  | 'martha_corey'
  | 'mary_warren'
  | 'rebecca_nurse'
  | 'samuel_parris'
  | 'sarah_good'
  | 'thomas_danforth'
  | 'tituba'
  | 'will_griggs'
  | 'william_phips';

export interface Salem1692LobbyOptions {
  twoTownHallChoice: boolean;
}

export function defaultSalem1692LobbyOptions(): Salem1692LobbyOptions {
  return { twoTownHallChoice: false };
}

export function parseSalem1692LobbyOptions(raw: unknown): Salem1692LobbyOptions {
  const defaults = defaultSalem1692LobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  return { twoTownHallChoice: o.twoTownHallChoice === true };
}

export interface Salem1692TryalCard {
  id: string;
  kind: Salem1692TryalKind;
  revealed: boolean;
}

export interface Salem1692PlayingCard {
  id: string;
  kind: Salem1692PlayingCardKind;
  color: Salem1692CardColor;
}

export type Salem1692Action =
  | { type: 'dawn_place_black_cat'; targetId: string }
  | { type: 'draw_two' }
  | { type: 'play_card'; cardId: string; targetId?: string; secondTargetId?: string }
  | { type: 'reveal_tryal_on_accusation'; targetId: string; tryalId: string }
  | { type: 'conspiracy_reveal_tryal'; tryalId: string }
  | { type: 'conspiracy_ack_view' }
  | { type: 'night_witch_kill'; townHallId: Salem1692TownHallId }
  | { type: 'night_constable_save'; targetId: string }
  | { type: 'night_confess'; tryalId: string }
  | { type: 'night_skip_confess' }
  | { type: 'ack_night_result' };

export interface Salem1692PublicPlayer {
  id: string;
  name: string;
  alive: boolean;
  townHallId: Salem1692TownHallId;
  accusationPoints: number;
  blueCards: Salem1692PlayingCardKind[];
  revealedTryals: Salem1692TryalKind[];
  hasBlackCat: boolean;
  hasGavel: boolean;
  confessedThisNight: boolean;
}

export interface Salem1692PendingAccusation {
  actorId: string;
  targetId: string;
  targetName: string;
  unrevealedTryalIds: string[];
}

export interface Salem1692PendingConspiracy {
  revealerId: string;
  revealerName: string;
  blackCatHolderId: string | null;
  needsReveal: boolean;
  awaitingView: boolean;
}

export interface Salem1692PlayerView {
  phase: Salem1692Phase;
  playerOrder: string[];
  currentPlayerId: string | null;
  blackCatHolderId: string | null;
  drawPileCount: number;
  discardPileCount: number;
  revealedWitchTryalCount: number;
  totalWitchTryalCount: number;
  nightStepEndsAtMs: number | null;
  players: Salem1692PublicPlayer[];
  you: {
    id: string;
    name: string;
    alive: boolean;
    tryals: Salem1692TryalCard[];
    isWitchTeam: boolean;
    isConstable: boolean;
    townHallId: Salem1692TownHallId;
    hand: Salem1692PlayingCard[];
    hasDrawnThisTurn: boolean;
  };
  witchTeamIds: string[] | null;
  pendingAccusation: Salem1692PendingAccusation | null;
  pendingConspiracy: Salem1692PendingConspiracy | null;
  nightKillTownHallId: Salem1692TownHallId | null;
  canDawnBlackCat: boolean;
  canNightWitchKill: boolean;
  canNightConstableSave: boolean;
  canNightConfess: boolean;
  gameResult: GameResult | null;
  lastEvent: string;
}

export interface Salem1692State {
  phase: Salem1692Phase;
  twoTownHallChoice: boolean;
  playerOrder: string[];
  playerNames: Record<string, string>;
  alive: Record<string, boolean>;
  tryalsByPlayer: Record<string, Salem1692TryalCard[]>;
  everWitch: Record<string, boolean>;
  isConstable: Record<string, boolean>;
  townHallByPlayer: Record<string, Salem1692TownHallId>;
  hands: Record<string, Salem1692PlayingCard[]>;
  drawPile: Salem1692PlayingCard[];
  discardPile: Salem1692PlayingCard[];
  blueCardsByPlayer: Record<string, Salem1692PlayingCardKind[]>;
  accusationPointsByPlayer: Record<string, number>;
  blackCatHolderId: string | null;
  gavelHolderId: string | null;
  currentPlayerId: string | null;
  hasDrawnThisTurn: Record<string, boolean>;
  skippedNextTurn: Record<string, boolean>;
  nightKillTownHallId: Salem1692TownHallId | null;
  witchKillVotes: Record<string, Salem1692TownHallId>;
  confessedThisNight: Record<string, boolean>;
  confessedTryalId: Record<string, string>;
  pendingAccusation: { actorId: string; targetId: string } | null;
  pendingConspiracy: {
    revealerId: string;
    blackCatTryalRevealed: boolean;
    awaitingView: boolean;
  } | null;
  revealedWitchTryalIds: string[];
  totalWitchTryalIds: string[];
  nightStepEndsAtMs: number | null;
  lastEvent: string;
  result: GameResult | null;
}
