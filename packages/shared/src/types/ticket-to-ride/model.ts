// ============================================================
// Ticket to Ride — map-agnostic domain model
// ============================================================
// Route/ticket data lives in a `TtrMapDefinition` (see ./maps). Nothing here may
// assume the United States board: expansions plug in by adding a map + rules policy.

export type TtrTrainColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'black'
  | 'white'
  | 'orange'
  | 'purple'
  | 'locomotive';

/** A train card colour that can be a route's printed colour. */
export type TtrCardColor = Exclude<TtrTrainColor, 'locomotive'>;

export type TtrRouteColor = TtrCardColor | 'gray';

export type TtrMapId = 'united-states';

export interface TtrCityDef {
  /** Stable slug used by routes, tickets and board layout. */
  id: string;
  name: string;
}

export interface TtrRouteDef {
  id: string;
  /** City id, not display name. */
  a: string;
  b: string;
  length: number;
  color: TtrRouteColor;
  /** Parallel tracks between the same two cities share one group id. */
  groupId: string;
  /** Europe-style tunnel — reserved for expansions. */
  tunnel?: boolean;
  /** Ferries force this many locomotives into the payment — reserved for expansions. */
  ferryLocomotives?: number;
}

export interface TtrDestinationTicket {
  id: string;
  /** City id, not display name. */
  a: string;
  b: string;
  points: number;
}

export interface TtrTrainDeckSpec {
  cardsPerColor: number;
  locomotives: number;
}

export interface TtrSetupSpec {
  /** Train cards dealt to each player. */
  trainCards: number;
  /** Destination tickets offered at setup. */
  initialTickets: number;
  minInitialKeep: number;
  /** Destination tickets offered by the draw action. */
  ticketDraw: number;
  minTicketKeep: number;
}

export interface TtrRulesPolicy {
  /** At or below this player count, claiming one route of a group closes the whole group. */
  doubleRouteLockMaxPlayers: number;
  /** One player may never own two routes of the same group. */
  oneRoutePerGroupPerPlayer: boolean;
  faceUpCount: number;
  /** Discard and redeal the face-up row once it holds this many locomotives. */
  faceUpLocomotiveReset: number;
  /** Final round triggers when a player is left with at most this many trains. */
  endgameTrainThreshold: number;
  longestPathBonus: number;
}

export interface TtrMapDefinition {
  id: TtrMapId;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  trainsPerPlayer: number;
  /** Route length → points. */
  routePoints: Readonly<Record<number, number>>;
  deck: TtrTrainDeckSpec;
  setup: TtrSetupSpec;
  rules: TtrRulesPolicy;
  cities: readonly TtrCityDef[];
  routes: readonly TtrRouteDef[];
  destinationTickets: readonly TtrDestinationTicket[];
}

export const TTR_TRAIN_COLORS: readonly TtrTrainColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'black',
  'white',
  'orange',
  'purple',
  'locomotive',
];

export const TTR_CARD_COLORS: readonly TtrCardColor[] = TTR_TRAIN_COLORS.filter(
  (c): c is TtrCardColor => c !== 'locomotive',
);

/** Scoring table shared by the classic maps. */
export const TTR_ROUTE_POINTS: Readonly<Record<number, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 15,
  8: 21,
};

export function ttrRouteGroupId(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

/** One legal way to pay for a route, computed by the server. */
export interface TtrClaimOption {
  color: TtrCardColor;
  colorCards: number;
  locomotives: number;
}

export interface TtrPublicPlayer {
  id: string;
  name: string;
  score: number;
  trainsLeft: number;
  handCount: number;
  ticketCount: number;
}

export interface TtrFinalScoreRow {
  playerId: string;
  playerName: string;
  routePoints: number;
  completedTicketPoints: number;
  failedTicketPenalty: number;
  longestPathBonus: number;
  total: number;
}

export interface TtrRouteView {
  id: string;
  ownerId: string | null;
  def: TtrRouteDef;
}

export type TtrTrainDrawNoticeCard =
  | { source: 'face_up'; color: TtrTrainColor }
  | { source: 'deck' };

export interface TtrTrainDrawNotice {
  playerId: string;
  playerName: string;
  cards: TtrTrainDrawNoticeCard[];
}

export interface TtrPlayerView {
  mapId: TtrMapId;
  phase: 'initial_tickets' | 'playing' | 'game_over';
  myId: string;
  currentPlayerId: string;
  players: TtrPublicPlayer[];
  myHand: Record<TtrTrainColor, number>;
  myTickets: TtrDestinationTicket[];
  myCompletedTicketIds: string[];
  faceUpTrainCards: TtrTrainColor[];
  deckTrainRemaining: number;
  deckTicketsRemaining: number;
  routes: TtrRouteView[];
  /**
   * Server-authoritative payments this viewer could make right now, keyed by route id.
   * Empty while it is not their turn — the client must not recompute legality.
   */
  claimOptions: Record<string, TtrClaimOption[]>;
  /**
   * During "draw destination tickets" action, player must choose which to keep
   * before next action.
   */
  pendingTicketChoice: TtrDestinationTicket[] | null;
  /** True when this player has drawn first train card and must draw second card. */
  mustDrawSecondTrainCard: boolean;
  /** Increments whenever a player draws train cards. Deck card colours stay private. */
  trainDrawNoticeSeq: number;
  trainDrawNotice: TtrTrainDrawNotice | null;
  /** Increments whenever face-up train cards are refreshed due to too many locomotives. */
  faceUpResetNoticeSeq: number;
  /** Increments whenever any player completes at least one destination ticket. */
  destinationCompleteNoticeSeq: number;
  destinationCompleteNotice: {
    playerId: string;
    playerName: string;
    a: string;
    b: string;
    points: number;
  } | null;
  /** Initial setup progress: how many players have confirmed starting tickets. */
  initialTicketConfirmProgress: { done: number; total: number };
  /**
   * Endgame countdown: set when a player hits the train threshold; decrements after each turn.
   * The client shows a “ตาสุดท้าย” badge on every seat when this equals `1` (final action round).
   */
  finalTurnsRemaining: number | null;
  finalScoreSummary?: TtrFinalScoreRow[];
  canAct: boolean;
  lastEvent: string;
  gameResult?: { winners: string[]; reason: string };
}

export type TtrAction =
  | { type: 'keep_initial_tickets'; keepIds: string[] }
  | {
      type: 'draw_train_cards';
      first: { source: 'face_up'; index: number } | { source: 'deck' };
      second?: { source: 'face_up'; index: number } | { source: 'deck' };
    }
  | {
      type: 'claim_route';
      routeId: string;
      color: TtrCardColor;
      locomotivesUsed: number;
    }
  | { type: 'draw_destination_tickets' }
  | { type: 'keep_drawn_tickets'; keepIds: string[] };
