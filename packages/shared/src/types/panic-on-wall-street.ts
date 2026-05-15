// ============================================================
// Panic on Wall Street — shared types (state, actions, player view)
// ============================================================

import type { GameResult } from './game.js';

/** Lobby: negotiation phase length before auto-advance */
export type PowsNegotiationDuration = '2m' | '5m' | '10m' | 'unlimited';

export const POWS_NEGOTIATION_DURATIONS: readonly PowsNegotiationDuration[] = [
  '2m',
  '5m',
  '10m',
  'unlimited',
] as const;

export const POWS_TOTAL_MONTHS_OPTIONS = [3, 4, 5, 6, 7] as const;

export type PowsTotalMonths = (typeof POWS_TOTAL_MONTHS_OPTIONS)[number];

export interface PowsLobbyOptions {
  negotiationDuration: PowsNegotiationDuration;
  totalMonths: PowsTotalMonths;
}

export function parsePowsLobbyOptions(options: unknown): PowsLobbyOptions {
  const defaults: PowsLobbyOptions = { negotiationDuration: '2m', totalMonths: 5 };
  if (!options || typeof options !== 'object') return defaults;
  const o = options as Record<string, unknown>;
  let negotiationDuration = defaults.negotiationDuration;
  const d = o.negotiationDuration;
  if (
    typeof d === 'string' &&
    (POWS_NEGOTIATION_DURATIONS as readonly string[]).includes(d)
  ) {
    negotiationDuration = d as PowsNegotiationDuration;
  }
  let totalMonths = defaults.totalMonths;
  const m = o.totalMonths;
  if (
    typeof m === 'number' &&
    Number.isInteger(m) &&
    (POWS_TOTAL_MONTHS_OPTIONS as readonly number[]).includes(m)
  ) {
    totalMonths = m as PowsTotalMonths;
  }
  return { negotiationDuration, totalMonths };
}

export function powsNegotiationDurationMs(duration: PowsNegotiationDuration): number | null {
  switch (duration) {
    case '2m':
      return 2 * 60_000;
    case '5m':
      return 5 * 60_000;
    case '10m':
      return 10 * 60_000;
    case 'unlimited':
      return null;
  }
}

export function powsNegotiationDurationLabelTh(duration: PowsNegotiationDuration): string {
  switch (duration) {
    case '2m':
      return '2 นาที';
    case '5m':
      return '5 นาที';
    case '10m':
      return '10 นาที';
    case 'unlimited':
      return 'ไม่จำกัด';
  }
}

export type PowsColor = 'blue' | 'green' | 'yellow' | 'red';

export type PowsPhase =
  | 'role_reveal'
  | 'negotiation'
  | 'investor_income'
  | 'manager_income'
  | 'debt_resolution'
  | 'management_cost'
  | 'auction'
  | 'game_over';

/** Money still owed from investor → manager after a closed deal */
export interface PowsDebt {
  id: string;
  debtorId: string;
  creditorId: string;
  companyId: string;
  amountOwed: number;
  monthCreated: number;
}

/** Shortfall awaiting manager choice: defer (record debt) or bankrupt investor */
export interface PowsShortfallPending {
  companyId: string;
  debtorId: string;
  creditorId: string;
  amountOwed: number;
}

export type PowsPlayerRole = 'manager' | 'investor' | 'dual';

/** One seat on the role-reveal board — everyone sees every slot */
export interface PowsRoleRevealSlot {
  playerId: string;
  name: string;
  role: PowsPlayerRole;
  /** Card border / accent (investor bank color or manager gold) */
  seatColor: string;
  /** Red die roll when roles were assigned (5+ players only) */
  diceRoll: number | null;
}

export interface PowsMarketColor {
  /** Board segment 0–10 */
  position: number;
  /** Dollar payout per company this month (derived from position) */
  value: number;
}

export interface PowsMarket {
  blue: PowsMarketColor;
  green: PowsMarketColor;
  yellow: PowsMarketColor;
  red: PowsMarketColor;
}

export interface PowsCompany {
  id: string;
  color: PowsColor;
  isDoubleIncome: boolean;
  /** Cloudinary public id (suffix after upload path) */
  imagePublicId: string;
  ownerManagerId: string | null;
  /** Investor who placed a token / agreed to invest (null if open) */
  investorId: string | null;
  agreedPrice: number | null;
  dealClosed: boolean;
  /** Removed from play (auction no-bid or similar) */
  eliminated: boolean;
}

export interface PowsPlayerPublic {
  id: string;
  name: string;
  money: number;
  role: PowsPlayerRole;
  isBankrupt: boolean;
  /** Investor bank token color (unique among investors); null for manager-only */
  bankTokenColor: string | null;
  /** Company tile ids this player holds as manager */
  companyIds: string[];
}

export type PowsAuctionStatus = 'idle' | 'selecting_lot' | 'bidding' | 'resolving_lot';

export interface PowsAuctionState {
  status: PowsAuctionStatus;
  auctioneerId: string | null;
  /** Company ids still to auction this month */
  companyQueue: string[];
  currentCompanyId: string | null;
  currentBid: number;
  currentHighestBidderId: string | null;
  /** Managers still in the current lot */
  activeBidderIds: string[];
  /** Index into activeBidderIds for who must act */
  turnPointer: number;
}

export interface PowsState {
  phase: PowsPhase;
  month: number;
  /** Total months in this game (from lobby, default 5) */
  totalMonths: number;
  /** Room host — only this player may run automated phase controls in digital rules */
  hostId: string;
  playerOrder: string[];
  players: Record<string, PowsPlayerPublic>;
  companies: Record<string, PowsCompany>;
  companyReserve: string[];
  market: PowsMarket;
  /** From lobby — drives negotiation timer each month */
  negotiationDuration: PowsNegotiationDuration;
  negotiationEndsAtMs: number | null;
  /** Last market roll — position delta per color (not d6 face) */
  lastDiceRoll: Record<PowsColor, number> | null;
  /** Net investor P&L from last market roll (negative = loss; cleared next investor_income) */
  lastInvestorMarketPnl: Record<string, number> | null;
  /** Manager income just paid on host_apply_manager_income (cleared next manager_income) */
  lastManagerIncomePaid: Record<string, number> | null;
  /** Management fees just paid on host_apply_management_costs (cleared next management_cost) */
  lastManagementCostPaid: Record<string, number> | null;
  lastEvent: string;
  auction: PowsAuctionState;
  /** Manager-only set for 5+; in dual mode everyone is a manager for company dealing */
  managerIds: string[];
  investorIds: string[];
  /** Role reveal (cleared after everyone acknowledges) */
  roleRevealSlots: PowsRoleRevealSlot[];
  roleAcknowledged: Record<string, boolean>;
  roleAcknowledgeCount: number;
  /** Outstanding deferred payments */
  debts: PowsDebt[];
  /** Manager must resolve each (defer / bankrupt) before management cost */
  pendingShortfalls: PowsShortfallPending[];
  gameResult: GameResult | null;
}

export interface PowsPlayerView extends PowsState {
  myPlayerId: string;
  hasAcknowledgedRole?: boolean;
  roleAcknowledgeProgress?: { current: number; total: number };
}

export type PowsAction =
  | { type: 'acknowledge_role' }
  | { type: 'host_end_negotiation' }
  | {
      type: 'set_deal';
      companyId: string;
      investorId: string | null;
      agreedPrice: number | null;
    }
  | { type: 'close_deal'; companyId: string }
  | { type: 'clear_deal'; companyId: string }
  | { type: 'host_roll_market' }
  | { type: 'host_apply_manager_income' }
  | { type: 'resolve_shortfall_defer'; companyId: string }
  | { type: 'resolve_shortfall_bankrupt'; companyId: string }
  | { type: 'pay_debt'; debtId: string; amount?: number }
  | { type: 'host_apply_management_costs' }
  | { type: 'host_start_auction_lot' }
  | { type: 'auction_bid'; amount: number }
  | { type: 'auction_pass' }
  | { type: 'host_finish_auction_month' };
