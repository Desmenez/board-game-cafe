import type { GameResult } from './game.js';

// ============================================================
// Salem 1692 — social deduction (MVP core loop)
// ============================================================

export type Salem1692Phase =
  | 'composition'
  | 'role_reveal'
  | 'dawn'
  | 'playing'
  | 'conspiracy'
  | 'night_witch'
  | 'night_constable'
  | 'night_confess'
  | 'night_result'
  | 'game_over';

/** Public tryal mix for the current player count (composition intro). */
export interface Salem1692TryalComposition {
  witch: number;
  constable: number;
  notWitch: number;
}

export type Salem1692SecretRole = 'witch' | 'constable' | 'townsfolk';

export type Salem1692TryalKind = 'not_witch' | 'witch' | 'constable';

export type Salem1692CardColor = 'green' | 'blue' | 'red' | 'black';

export type Salem1692PlayingCardKind =
  | 'accusation'
  | 'evidence'
  | 'witness'
  | 'piety'
  | 'asylum'
  | 'matchmaker'
  | 'alibi'
  | 'stocks'
  | 'scapegoat'
  | 'curse'
  | 'arson'
  | 'robbery'
  | 'conspiracy'
  | 'night';

/** Sentinel id for Curse selecting the Black Cat token (not a front-card id). */
export const SALEM_1692_BLACK_CAT_SELECT_ID = 'salem-black-cat';

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
  | { type: 'acknowledge_composition' }
  | { type: 'acknowledge_role' }
  | { type: 'dawn_select_black_cat'; targetId: string }
  | { type: 'dawn_confirm_black_cat' }
  /** Draw one card toward the turn's two-card draw (DnD from draw pile). */
  | { type: 'draw_card' }
  /** Draw both remaining cards for this turn (button shortcut). */
  | { type: 'draw_two' }
  /**
   * End turn after playing ≥1 card (play path).
   * Draw path ends automatically after 2 cards.
   */
  | { type: 'end_turn' }
  /** Stage a card publicly while choosing targets (others can see the card). */
  | { type: 'begin_play'; cardId: string }
  | {
      type: 'confirm_play';
      targetId?: string;
      secondTargetId?: string;
      /** Alibi: ≤3 red front cards; Curse: exactly 1 blue front card. */
      selectedCardIds?: string[];
    }
  | { type: 'cancel_play' }
  /** Play immediately (no-target cards, or with targets already chosen). */
  | {
      type: 'play_card';
      cardId: string;
      targetId?: string;
      secondTargetId?: string;
      selectedCardIds?: string[];
    }
  | { type: 'select_tryal_on_accusation'; tryalId: string }
  | { type: 'reveal_tryal_on_accusation'; targetId: string; tryalId: string }
  | { type: 'ack_accusation_reveal' }
  | { type: 'conspiracy_select_tryal'; tryalId: string }
  | { type: 'conspiracy_reveal_tryal'; tryalId: string }
  /** After Black Cat reveal (or skip): advance Conspiracy to the pass step. */
  | { type: 'conspiracy_ack_view' }
  /** Pick one face-down Tryal from the player on your left. */
  | { type: 'conspiracy_pass_select'; tryalId: string }
  /** Ack private peek of your new Tryal set after the pass. */
  | { type: 'conspiracy_peek_ack' }
  | { type: 'stocks_ack_skip' }
  /** Night — each witch picks a living player (self / allies allowed; Asylum blocked). */
  | { type: 'night_witch_select'; targetId: string }
  /** Night — confirm when all living witches share the same target. */
  | { type: 'night_witch_confirm' }
  | { type: 'night_constable_save'; targetId: string }
  | { type: 'night_confess'; tryalId: string }
  | { type: 'night_skip_confess' }
  /** Ack Night outcome modal; when everyone acked → reshuffle + resume play. */
  | { type: 'night_result_ack' };

/** Public staged play — card face visible to every seat while actor picks targets. */
export interface Salem1692PendingPlay {
  actorId: string;
  actorName: string;
  card: Salem1692PlayingCard;
}

export interface Salem1692PublicPlayer {
  id: string;
  name: string;
  alive: boolean;
  townHallId: Salem1692TownHallId;
  /** Sum of red accusation values currently in front. */
  accusationPoints: number;
  /** Cards sitting in front of this player (public faces). */
  frontCards: Salem1692PlayingCard[];
  /** Linked Matchmaker partner seat, if any. */
  matchmakerPartnerId: string | null;
  matchmakerPartnerName: string | null;
  /**
   * Tryal row for spectators — unrevealed kinds are null (backs only).
   * Revealed slots include the public kind.
   */
  tryals: Salem1692PublicTryal[];
  /** Kinds of tryals already revealed publicly. */
  revealedTryals: Salem1692TryalKind[];
  hasBlackCat: boolean;
  hasGavel: boolean;
  confessedThisNight: boolean;
  /** Public hand size only — never card faces. */
  handCount: number;
  /** Stocks cards currently in front (each skips one upcoming turn). */
  stocksCount: number;
  /** True when stocksCount > 0 — will skip upcoming turn(s). */
  skippedNextTurn: boolean;
  /**
   * Game-over only — public affiliation reveal (null while playing).
   * `secretRole`: witch > constable > townsfolk.
   */
  endReveal: {
    isWitchTeam: boolean;
    isConstable: boolean;
    secretRole: Salem1692SecretRole;
  } | null;
}

/** Public tryal slot — never leaks unrevealed kinds. */
export interface Salem1692PublicTryal {
  id: string;
  revealed: boolean;
  kind: Salem1692TryalKind | null;
}

export interface Salem1692PendingAccusation {
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  /**
   * Full Tryal row of the target — unrevealed kinds are null;
   * already-revealed slots include kind (face-up, not selectable).
   */
  targetTryals: Salem1692PublicTryal[];
  /** Face-down slot ids — visible to every seat (no kinds until revealed). */
  unrevealedTryalIds: string[];
  selectedTryalId: string | null;
  /** Set after Accept / reveal — drives shared flip animation. */
  revealedTryalId: string | null;
  revealedKind: Salem1692TryalKind | null;
  /**
   * Unrevealed Witch tryal ids on the target — only for witch viewers when the
   * target is also on the witch team (so allies avoid revealing each other).
   */
  allyWitchTryalIds: string[];
}

export type Salem1692ConspiracyStep = 'reveal' | 'pass' | 'peek';

export interface Salem1692PendingConspiracy {
  step: Salem1692ConspiracyStep;
  revealerId: string;
  revealerName: string;
  blackCatHolderId: string | null;
  blackCatHolderName: string | null;
  /** Face-down Tryal ids of the Black Cat holder (no kinds until revealed). */
  blackCatUnrevealedTryalIds: string[];
  selectedTryalId: string | null;
  /** Set after Accept / reveal — drives shared flip animation. */
  revealedTryalId: string | null;
  revealedKind: Salem1692TryalKind | null;
  needsReveal: boolean;
  /**
   * Unrevealed Witch tryal ids on the relevant ally seat (Black Cat holder during
   * reveal, or left neighbor during pass) — witch viewers only.
   */
  allyWitchTryalIds: string[];
  /** Pass step — living player to your left (next in playerOrder). */
  leftNeighborId: string | null;
  leftNeighborName: string | null;
  /**
   * Full Tryal row of leftNeighbor for the pass UI — unrevealed kinds are null;
   * revealed slots include kind (face-up, not selectable).
   */
  leftTryals: Salem1692PublicTryal[];
  /** Face-down Tryal ids belonging to leftNeighbor (chooser never sees kinds). */
  leftUnrevealedTryalIds: string[];
  /** Whether you already submitted a pass pick (including auto-skip). */
  hasPassPicked: boolean;
  /** Your pick id, or null when left had no face-down Tryals. */
  myPassPickId: string | null;
  passProgress: { current: number; total: number };
  /** Peek step */
  hasPeekAcknowledged: boolean;
  peekProgress: { current: number; total: number };
}

/** Stocks skip — player must ack before turn advances. */
export interface Salem1692PendingStocksSkip {
  playerId: string;
  playerName: string;
  /** Stocks still in front after this skip is consumed (before ack: count including the one being spent). */
  stocksRemainingAfter: number;
}

export type Salem1692NightSurviveReason = 'gavel' | 'confess' | 'asylum';

export interface Salem1692PendingNightResult {
  victimId: string | null;
  victimName: string | null;
  survived: boolean;
  reasons: Salem1692NightSurviveReason[];
  killed: boolean;
  /** When killed: front cards before they were discarded. */
  victimFrontCards: Salem1692PlayingCard[];
  victimHadBlackCat: boolean;
  /** When killed: all Tryals face-up after death reveal. */
  victimTryals: Salem1692TryalCard[];
  /** Progress for result acks. */
  ackProgress: { current: number; total: number };
  hasAcknowledged: boolean;
}

export interface Salem1692PlayerView {
  phase: Salem1692Phase;
  playerOrder: string[];
  currentPlayerId: string | null;
  blackCatHolderId: string | null;
  drawPileCount: number;
  discardPileCount: number;
  /** Top of discard (face-up), if any. */
  discardTop: Salem1692PlayingCard | null;
  /** Cards still to draw this turn after starting a draw (null = not mid-draw). */
  drawsLeftThisAction: number | null;
  /** Cards successfully played this turn (play path; end_turn needs ≥1). */
  cardsPlayedThisTurn: number;
  revealedWitchTryalCount: number;
  totalWitchTryalCount: number;
  /** @deprecated Night no longer uses a countdown — always null. */
  nightStepEndsAtMs: number | null;
  players: Salem1692PublicPlayer[];
  you: {
    id: string;
    name: string;
    alive: boolean;
    tryals: Salem1692TryalCard[];
    isWitchTeam: boolean;
    isConstable: boolean;
    secretRole: Salem1692SecretRole;
    townHallId: Salem1692TownHallId;
    hand: Salem1692PlayingCard[];
    frontCards: Salem1692PlayingCard[];
    accusationPoints: number;
    matchmakerPartnerId: string | null;
    matchmakerPartnerName: string | null;
    hasBlackCat: boolean;
    hasDrawnThisTurn: boolean;
  };
  /** Staged play while choosing targets — visible to all players. */
  pendingPlay: Salem1692PendingPlay | null;
  /** composition — tryal mix for this seat count */
  tryalComposition: Salem1692TryalComposition | null;
  hasAcknowledgedComposition: boolean;
  compositionAcknowledgeProgress: { current: number; total: number } | null;
  hasAcknowledgedRole: boolean;
  roleAcknowledgeProgress: { current: number; total: number } | null;
  /** Known witch-team seat ids during role_reveal (only if you are on the witch team). */
  roleRevealWitchAllies: { id: string; name: string }[] | null;
  witchTeamIds: string[] | null;
  /** Dawn — witch votes for Black Cat target (visible to witch team only). */
  dawnBlackCatVotes: Record<string, string> | null;
  /** Dawn — agreed target when every witch picked the same player. */
  dawnBlackCatConsensusTargetId: string | null;
  pendingAccusation: Salem1692PendingAccusation | null;
  pendingConspiracy: Salem1692PendingConspiracy | null;
  pendingStocksSkip: Salem1692PendingStocksSkip | null;
  /** Night — witch kill votes (player ids; witch team only). */
  nightWitchKillVotes: Record<string, string> | null;
  nightWitchKillConsensusTargetId: string | null;
  /** Night kill target after witches confirm. */
  nightKillPlayerId: string | null;
  nightKillPlayerName: string | null;
  gavelHolderId: string | null;
  gavelHolderName: string | null;
  pendingNightResult: Salem1692PendingNightResult | null;
  canDawnBlackCat: boolean;
  canNightWitchKill: boolean;
  canNightConstableSave: boolean;
  /** Alive, not Gavel holder, not yet done confess step. */
  canNightConfess: boolean;
  /** Must act on confess (same as canNightConfess). */
  mustConfess: boolean;
  hasConfessed: boolean;
  /** Set at game_over — which affiliation won. */
  winningSide: 'witch' | 'town' | null;
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
  /** Red, lasting blue, and Stocks sitting in front of each player. */
  frontCardsByPlayer: Record<string, Salem1692PlayingCard[]>;
  /** Symmetric Matchmaker links. */
  matchmakerPartnerId: Record<string, string | null>;
  blackCatHolderId: string | null;
  gavelHolderId: string | null;
  currentPlayerId: string | null;
  hasDrawnThisTurn: Record<string, boolean>;
  /** Count of cards resolved this turn on the play path (reset when turn advances). */
  cardsPlayedThisTurn: number;
  /** Night kill target player after witches confirm (null until then). */
  nightKillPlayerId: string | null;
  /** Witch votes: voterId → targetPlayerId. */
  witchKillVotes: Record<string, string>;
  dawnBlackCatVotes: Record<string, string>;
  /** Finished confess step this Night (skip or confess or auto-Gavel). */
  confessedThisNight: Record<string, boolean>;
  /** Actually opened a Tryal via Confess — grants Night protection. */
  confessedTryalId: Record<string, string>;
  pendingAccusation: {
    actorId: string;
    targetId: string;
    selectedTryalId: string | null;
    revealedTryalId: string | null;
    revealedKind: Salem1692TryalKind | null;
  } | null;
  pendingConspiracy: {
    step: Salem1692ConspiracyStep;
    revealerId: string;
    blackCatHolderId: string | null;
    blackCatTryalRevealed: boolean;
    selectedTryalId: string | null;
    revealedTryalId: string | null;
    revealedKind: Salem1692TryalKind | null;
    /** Living playerId → chosen face-down tryal id, or null if left had none. */
    passPicks: Record<string, string | null>;
    peekAcknowledgedBy: string[];
  } | null;
  pendingNightResult: {
    victimId: string | null;
    victimName: string | null;
    survived: boolean;
    reasons: Salem1692NightSurviveReason[];
    killed: boolean;
    victimFrontCards: Salem1692PlayingCard[];
    victimHadBlackCat: boolean;
    victimTryals: Salem1692TryalCard[];
  } | null;
  nightResultAcknowledgedBy: string[];
  /** Waiting for skipped player to ack Stocks before advancing. */
  pendingStocksSkip: { playerId: string } | null;
  /** Card removed from hand while actor chooses targets. */
  pendingPlay: { actorId: string; card: Salem1692PlayingCard } | null;
  /**
   * After Night/Conspiracy interrupts a draw: finish these draws for playerId,
   * then end their turn.
   */
  pendingDrawResume: { playerId: string; remaining: number } | null;
  /** Remaining draws in the current draw action (1–2), or null if not drawing. */
  drawsLeftThisAction: number | null;
  revealedWitchTryalIds: string[];
  totalWitchTryalIds: string[];
  tryalComposition: Salem1692TryalComposition;
  compositionAcknowledgedBy: string[];
  roleAcknowledgedBy: string[];
  /** Unused — Night no longer timed. */
  nightStepEndsAtMs: number | null;
  lastEvent: string;
  result: GameResult | null;
}
