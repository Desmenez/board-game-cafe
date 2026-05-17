import type { GameDefinition, GameResult, Player } from 'shared';
import {
  parsePowsLobbyOptions,
  powsClampMarketPosition,
  powsNegotiationDurationLabelTh,
  powsNegotiationDurationMs,
  powsRollMarketDelta,
} from 'shared';
import type {
  PowsAction,
  PowsAuctionState,
  PowsColor,
  PowsCompany,
  PowsDebt,
  PowsMarket,
  PowsPhase,
  PowsPlayerPublic,
  PowsPlayerView,
  PowsRoleRevealSlot,
  PowsShortfallPending,
  PowsState,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const STARTING_MONEY = 120_000;
const MANAGEMENT_COST_PER_COMPANY = 10_000;
const BANK_SELL_PRICE = 5_000;
const MIN_AUCTION_INCREMENT = 1_000;
const START_POSITION = 5;

const COLORS: PowsColor[] = ['blue', 'green', 'yellow', 'red'];

const INVESTOR_BANK_COLORS = ['navy', 'teal', 'purple', 'orange', 'magenta', 'lime'];

const MANAGER_SEAT_COLOR = '#d4a84b';

const BANK_COLOR_HEX: Record<string, string> = {
  navy: '#1e3a5f',
  teal: '#0d9488',
  purple: '#7c3aed',
  orange: '#ea580c',
  magenta: '#c026d3',
  lime: '#84cc16',
};

function seatColorForPlayer(p: PowsPlayerPublic): string {
  if (p.bankTokenColor) return BANK_COLOR_HEX[p.bankTokenColor] ?? p.bankTokenColor;
  if (p.role === 'manager' || p.role === 'dual') return MANAGER_SEAT_COLOR;
  return MANAGER_SEAT_COLOR;
}

function buildRoleRevealSlots(
  playerOrder: string[],
  players: Record<string, PowsPlayerPublic>,
  diceRolls: Record<string, number> | null,
): PowsRoleRevealSlot[] {
  return playerOrder.map((id) => {
    const p = players[id]!;
    return {
      playerId: id,
      name: p.name,
      role: p.role,
      seatColor: seatColorForPlayer(p),
      diceRoll: diceRolls?.[id] ?? null,
    };
  });
}

function beginNegotiation(s: PowsState, prefix: string): void {
  s.phase = 'negotiation';
  const ms = powsNegotiationDurationMs(s.negotiationDuration);
  s.negotiationEndsAtMs = ms == null ? null : Date.now() + ms;
  const timePart =
    ms == null ? 'เจรจาไม่จำกัด' : `เจรจา ${powsNegotiationDurationLabelTh(s.negotiationDuration)}`;
  s.lastEvent = `${prefix} — ${timePart}`;
}

function finishRoleReveal(s: PowsState): void {
  s.roleRevealSlots = [];
  s.roleAcknowledged = {};
  s.roleAcknowledgeCount = 0;
  const dualMode = s.playerOrder.length <= 4;
  beginNegotiation(
    s,
    dualMode ? 'เริ่มเดือน 1 — ทุกคนเป็นทั้งผู้จัดการและนักลงทุน' : 'เริ่มเดือน 1',
  );
}

const IMG = {
  blueNorm: 'blue-card-1_oadkka',
  blue2a: 'blue-card-2_sder7t',
  blue2b: 'blue-card-3_jelnpa',
  yellowNorm: 'yellow-card-1_bwr6br',
  yellow2a: 'yellow-card-2_cmtpad',
  yellow2b: 'yellow-card-3_yvvjqb',
  greenNorm: 'green-card-1_ao5rew',
  green2a: 'green-card-2_gjgjho',
  green2b: 'green-card-3_ohxugp',
  redNorm: 'red-card-1_k1hpks',
  red2a: 'red-card-2_hjrsqe',
} as const;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function marketValueFromPosition(position: number): number {
  return 5_000 + position * 5_000;
}

function freshMarketColor(position: number): { position: number; value: number } {
  return { position, value: marketValueFromPosition(position) };
}

function freshMarket(): PowsMarket {
  const p = START_POSITION;
  return {
    blue: freshMarketColor(p),
    green: freshMarketColor(p),
    yellow: freshMarketColor(p),
    red: freshMarketColor(p),
  };
}

function syncMarketValues(m: PowsMarket): void {
  for (const c of COLORS) {
    m[c].value = marketValueFromPosition(m[c].position);
  }
}

function managerSeatCount(n: number): number {
  if (n <= 4) return n;
  if (n === 5) return 2;
  if (n === 6 || n === 7) return 3;
  if (n === 8 || n === 9) return 4;
  if (n === 10) return 5;
  return 5;
}

function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function splitManagersInvestors(
  playerIds: string[],
  m: number,
): {
  managerIds: string[];
  investorIds: string[];
  rolls: Record<string, number>;
} {
  const rolls: Record<string, number> = {};
  for (const id of playerIds) rolls[id] = rollD6();
  const sorted = [...playerIds].sort((a, b) => rolls[b]! - rolls[a]! || a.localeCompare(b));
  return {
    managerIds: sorted.slice(0, m),
    investorIds: sorted.slice(m),
    rolls,
  };
}

function buildCompanyDeck(): Omit<
  PowsCompany,
  'ownerManagerId' | 'investorId' | 'agreedPrice' | 'dealClosed'
>[] {
  const out: Omit<PowsCompany, 'ownerManagerId' | 'investorId' | 'agreedPrice' | 'dealClosed'>[] =
    [];
  let idx = 0;
  const add = (color: PowsColor, isDouble: boolean, imagePublicId: string) => {
    idx += 1;
    out.push({
      id: `${color}-${isDouble ? '2x' : 'n'}-${idx}`,
      color,
      isDoubleIncome: isDouble,
      imagePublicId,
      eliminated: false,
    });
  };
  for (let i = 0; i < 11; i += 1) add('blue', false, IMG.blueNorm);
  for (let i = 0; i < 11; i += 1) add('green', false, IMG.greenNorm);
  for (let i = 0; i < 11; i += 1) add('yellow', false, IMG.yellowNorm);
  for (let i = 0; i < 6; i += 1) add('red', false, IMG.redNorm);
  add('blue', true, IMG.blue2a);
  add('blue', true, IMG.blue2b);
  add('green', true, IMG.green2a);
  add('green', true, IMG.green2b);
  add('yellow', true, IMG.yellow2a);
  add('yellow', true, IMG.yellow2b);
  add('red', true, IMG.red2a);
  return out;
}

function toFullCompany(
  partial: Omit<PowsCompany, 'ownerManagerId' | 'investorId' | 'agreedPrice' | 'dealClosed'>,
): PowsCompany {
  return {
    ...partial,
    ownerManagerId: null,
    investorId: null,
    agreedPrice: null,
    dealClosed: false,
  };
}

function swapDoublesForNormalsInHand(
  hand: string[],
  companies: Record<string, PowsCompany>,
  reserve: string[],
): void {
  for (let i = 0; i < hand.length; i += 1) {
    const cid = hand[i]!;
    if (!companies[cid]?.isDoubleIncome) continue;
    const j = reserve.findIndex((rid) => !companies[rid]!.isDoubleIncome);
    if (j < 0) continue;
    const repl = reserve[j]!;
    reserve.splice(j, 1);
    reserve.push(cid);
    hand[i] = repl;
  }
}

function emptyAuction(): PowsAuctionState {
  return {
    status: 'idle',
    auctioneerId: null,
    companyQueue: [],
    currentCompanyId: null,
    currentBid: 0,
    currentHighestBidderId: null,
    activeBidderIds: [],
    turnPointer: 0,
  };
}

function assertHost(s: PowsState, playerId: string): void {
  if (playerId !== s.hostId) throw new GameActionRejectedError('เฉพาะหัวห้องเท่านั้น');
}

function assertPhase(s: PowsState, phases: PowsPhase[]): void {
  if (!phases.includes(s.phase)) throw new GameActionRejectedError('เฟสไม่ตรง');
}

function isManagerOf(s: PowsState, playerId: string, companyId: string): boolean {
  const c = s.companies[companyId];
  return c != null && c.ownerManagerId === playerId;
}

function canActAsInvestor(s: PowsState, playerId: string): boolean {
  const p = s.players[playerId];
  if (!p || p.isBankrupt) return false;
  return p.role === 'investor' || p.role === 'dual';
}

function newDebtId(): string {
  return `debt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findPendingShortfall(s: PowsState, companyId: string): PowsShortfallPending | undefined {
  return s.pendingShortfalls.find((p) => p.companyId === companyId);
}

function removePendingShortfall(s: PowsState, companyId: string): void {
  s.pendingShortfalls = s.pendingShortfalls.filter((p) => p.companyId !== companyId);
}

function advanceAfterDebtResolution(s: PowsState): void {
  if (s.pendingShortfalls.length > 0) return;
  s.phase = 'management_cost';
  s.lastManagementCostPaid = null;
  s.lastEvent = 'จัดการหนี้ครบแล้ว — หัวห้องกดจ่ายค่าบริหาร';
}

/** Pay down existing debts before new manager-income obligations */
function collectOutstandingDebts(s: PowsState): void {
  const ordered = [...s.debts].sort(
    (a, b) => a.monthCreated - b.monthCreated || a.id.localeCompare(b.id),
  );
  for (const debt of ordered) {
    const debtor = s.players[debt.debtorId];
    const creditor = s.players[debt.creditorId];
    if (!debtor || !creditor || debtor.isBankrupt) continue;
    const pay = Math.min(debtor.money, debt.amountOwed);
    if (pay <= 0) continue;
    debtor.money -= pay;
    creditor.money += pay;
    debt.amountOwed -= pay;
    if (debt.amountOwed <= 0) {
      s.debts = s.debts.filter((d) => d.id !== debt.id);
    }
  }
}

function declareInvestorBankrupt(s: PowsState, investorId: string, reason: string): void {
  const inv = s.players[investorId];
  if (!inv || inv.isBankrupt) return;
  inv.isBankrupt = true;
  s.debts = s.debts.filter((d) => d.debtorId !== investorId);
  s.pendingShortfalls = s.pendingShortfalls.filter((p) => p.debtorId !== investorId);
  for (const co of Object.values(s.companies)) {
    if (co.investorId === investorId) {
      co.investorId = null;
      co.agreedPrice = null;
      co.dealClosed = false;
    }
  }
  s.lastEvent = reason;
}

function applyManagerIncomePayments(s: PowsState): void {
  collectOutstandingDebts(s);
  const paid: Record<string, number> = {};
  const pending: PowsShortfallPending[] = [];
  for (const co of Object.values(s.companies)) {
    if (!co.dealClosed || !co.investorId || !co.ownerManagerId || co.agreedPrice == null) continue;
    const inv = s.players[co.investorId];
    const mgr = s.players[co.ownerManagerId];
    if (!inv || !mgr || inv.isBankrupt) continue;
    const owed = co.agreedPrice;
    const pay = Math.min(inv.money, owed);
    inv.money -= pay;
    mgr.money += pay;
    if (pay > 0) {
      paid[mgr.id] = (paid[mgr.id] ?? 0) + pay;
    }
    const shortfall = owed - pay;
    if (shortfall > 0) {
      pending.push({
        companyId: co.id,
        debtorId: inv.id,
        creditorId: mgr.id,
        amountOwed: shortfall,
      });
    }
  }
  s.pendingShortfalls = pending;
  s.lastManagerIncomePaid = Object.keys(paid).length > 0 ? paid : null;
  if (pending.length > 0) {
    s.phase = 'debt_resolution';
    s.lastEvent = `มีหนี้ค้าง ${pending.length} รายการ — ผู้จัดการเลือกผ่อนหรือล้มละลายนักลงทุน`;
  } else {
    s.phase = 'management_cost';
    s.lastManagementCostPaid = null;
    s.lastEvent = 'จ่ายรายได้ผู้จัดการครบ — หัวห้องกดจ่ายค่าบริหาร';
  }
}

function endNegotiation(s: PowsState): void {
  s.phase = 'investor_income';
  s.negotiationEndsAtMs = null;
  s.lastDiceRoll = null;
  s.lastInvestorMarketPnl = null;
  s.lastEvent = 'จบการเจรจา — รอหัวห้องทอยตลาด';
}

/** Called from socket timer when negotiation time expires. */
export function applyPowsNegotiationExpiry(s: PowsState): PowsState {
  if (s.phase !== 'negotiation' || s.negotiationEndsAtMs == null) return s;
  if (Date.now() < s.negotiationEndsAtMs) return s;
  endNegotiation(s);
  return s;
}

function drawAuctionQueue(s: PowsState): void {
  const mCount = s.managerIds.length;
  const need = Math.max(0, mCount * 2 - 1);
  const q: string[] = [];
  for (let i = 0; i < need && s.companyReserve.length > 0; i += 1) {
    q.push(s.companyReserve.pop()!);
  }
  const investors = s.investorIds.filter((id) => s.players[id]);
  const auctioneer =
    investors.length > 0
      ? investors[Math.floor(Math.random() * investors.length)]!
      : s.playerOrder[0]!;
  s.auction = {
    status: 'selecting_lot',
    auctioneerId: auctioneer,
    companyQueue: q,
    currentCompanyId: null,
    currentBid: 0,
    currentHighestBidderId: null,
    activeBidderIds: [...s.managerIds],
    turnPointer: 0,
  };
  s.lastEvent = `เปิดประมูล — ประมูล ${q.length} ใบ (ผู้ประมูล: ${s.players[auctioneer]?.name ?? ''})`;
}

function startNextAuctionLot(s: PowsState): void {
  if (s.auction.companyQueue.length === 0) {
    s.auction.status = 'idle';
    s.auction.currentCompanyId = null;
    s.lastEvent = 'ประมูลจบ — หัวห้องกดจบเดือน';
    return;
  }
  const cid = s.auction.companyQueue.shift()!;
  s.auction.currentCompanyId = cid;
  s.auction.currentBid = 0;
  s.auction.currentHighestBidderId = null;
  s.auction.activeBidderIds = shuffle([...s.managerIds]);
  s.auction.turnPointer = 0;
  s.auction.status = 'bidding';
  s.lastEvent = `ประมูลบริษัท — ${cid}`;
}

function resolveAuctionWinner(s: PowsState): void {
  const cid = s.auction.currentCompanyId;
  if (!cid) return;
  const winner = s.auction.currentHighestBidderId;
  const bid = s.auction.currentBid;
  const co = s.companies[cid];
  if (!co) return;

  if (!winner || bid <= 0) {
    co.eliminated = true;
    co.ownerManagerId = null;
    s.lastEvent = 'ไม่มีผู้ประมูล — การ์ดถูกถอดออกจากเกม';
  } else {
    const wp = s.players[winner];
    if (wp) {
      wp.money -= bid;
      co.ownerManagerId = winner;
      co.investorId = null;
      co.agreedPrice = null;
      co.dealClosed = false;
      wp.companyIds.push(cid);
    }
    s.lastEvent = `${wp?.name ?? winner} ชนะประมูล $${bid.toLocaleString()}`;
  }
  s.auction.currentCompanyId = null;
  if (s.auction.companyQueue.length === 0) {
    s.auction.status = 'idle';
    s.lastEvent = 'ประมูลจบ — หัวห้องกดจบเดือน';
  } else {
    s.auction.status = 'selecting_lot';
  }
}

function advanceMonthAfterAuction(s: PowsState): void {
  if (s.month >= s.totalMonths) return;
  s.month += 1;
  for (const c of Object.values(s.companies)) {
    if (c.ownerManagerId && !c.eliminated) {
      c.dealClosed = false;
      c.investorId = null;
      c.agreedPrice = null;
    }
  }
  s.lastDiceRoll = null;
  beginNegotiation(s, `เริ่มเดือน ${s.month}`);
}

function finishFinalMonthAfterManagement(s: PowsState): void {
  s.phase = 'game_over';
  s.gameResult = computeGameResult(s);
  s.lastEvent = `เกมจบ (สิ้นเดือน ${s.totalMonths} หลังจ่ายค่าบริหาร)`;
}

function computeGameResult(s: PowsState): GameResult {
  const dualMode = s.playerOrder.length <= 4;
  const names = new Map(s.playerOrder.map((id) => [id, s.players[id]?.name ?? id] as const));

  if (dualMode) {
    let bestId = s.playerOrder[0]!;
    let bestM = s.players[bestId]?.money ?? 0;
    for (const id of s.playerOrder) {
      const m = s.players[id]?.money ?? 0;
      if (m > bestM) {
        bestM = m;
        bestId = id;
      }
    }
    return {
      winners: [bestId],
      reason: `ชนะรวม: ${names.get(bestId)} ($${bestM.toLocaleString()})`,
    };
  }

  let bestMId = s.managerIds[0] ?? s.playerOrder[0]!;
  let bestMM = -Infinity;
  for (const id of s.managerIds) {
    const m = s.players[id]?.money ?? -Infinity;
    if (m > bestMM) {
      bestMM = m;
      bestMId = id;
    }
  }

  const activeInvestors = s.investorIds.filter((id) => !s.players[id]?.isBankrupt);
  let bestIId = activeInvestors[0] ?? s.investorIds[0] ?? s.playerOrder[0]!;
  let bestIM = -Infinity;
  for (const id of activeInvestors.length > 0 ? activeInvestors : s.investorIds) {
    const m = s.players[id]?.money ?? -Infinity;
    if (m > bestIM) {
      bestIM = m;
      bestIId = id;
    }
  }

  return {
    winners: [bestMId, bestIId],
    reason: `ผู้จัดการรวยสุด: ${names.get(bestMId)} ($${bestMM.toLocaleString()}) — นักลงทุนรวยสุด: ${names.get(bestIId)} ($${bestIM.toLocaleString()})`,
  };
}

function setupImpl(players: Player[], options?: unknown): PowsState {
  if (players.length < 3 || players.length > 11) {
    throw new Error('Panic on Wall Street requires 3–11 players');
  }

  const lobby = parsePowsLobbyOptions(options);
  const opts = options && typeof options === 'object' ? (options as { hostId?: string }) : {};
  const hostId = typeof opts.hostId === 'string' ? opts.hostId : players[0]!.id;

  const playerOrder = players.map((p) => p.id);
  const n = playerOrder.length;
  const dualMode = n <= 4;
  const mCount = managerSeatCount(n);

  let managerIds: string[];
  let investorIds: string[];
  let roleRollSummary = '';
  let roleRevealDiceRolls: Record<string, number> | null = null;

  if (dualMode) {
    managerIds = [...playerOrder];
    investorIds = [...playerOrder];
  } else {
    const split = splitManagersInvestors(playerOrder, mCount);
    managerIds = split.managerIds;
    investorIds = split.investorIds;
    roleRevealDiceRolls = split.rolls;
    const rollBits = playerOrder.map(
      (id) => `${players.find((p) => p.id === id)?.name ?? id}:${split.rolls[id]}`,
    );
    roleRollSummary = rollBits.join(', ');
  }

  const deckPartials = shuffle(buildCompanyDeck());
  const companies: Record<string, PowsCompany> = {};
  const deckIds: string[] = [];
  for (const p of deckPartials) {
    const full = toFullCompany(p);
    companies[full.id] = full;
    deckIds.push(full.id);
  }

  const reserve = deckIds;
  const hands = new Map<string, string[]>();
  for (const mid of managerIds) hands.set(mid, []);

  for (let r = 0; r < 3; r += 1) {
    for (const mid of managerIds) {
      const id = reserve.pop();
      if (id) hands.get(mid)!.push(id);
    }
  }

  for (const mid of managerIds) {
    const hand = hands.get(mid)!;
    swapDoublesForNormalsInHand(hand, companies, reserve);
    for (const cid of hand) {
      companies[cid]!.ownerManagerId = mid;
    }
  }

  const playersOut: Record<string, PowsPlayerPublic> = {};
  let invColorIdx = 0;
  for (const p of players) {
    const isMgr = managerIds.includes(p.id);
    const isInv = investorIds.includes(p.id);
    let role: PowsPlayerPublic['role'] = 'investor';
    if (isMgr && isInv) role = 'dual';
    else if (isMgr) role = 'manager';
    else role = 'investor';

    let bankTokenColor: string | null = null;
    if (role === 'investor' || role === 'dual') {
      bankTokenColor = INVESTOR_BANK_COLORS[invColorIdx % INVESTOR_BANK_COLORS.length]!;
      invColorIdx += 1;
    }

    playersOut[p.id] = {
      id: p.id,
      name: p.name,
      money: STARTING_MONEY,
      role,
      isBankrupt: false,
      bankTokenColor,
      companyIds: [...(hands.get(p.id) ?? [])],
    };
  }

  const market = freshMarket();

  const roleRevealSlots = buildRoleRevealSlots(playerOrder, playersOut, roleRevealDiceRolls);

  const state: PowsState = {
    phase: 'role_reveal',
    month: 1,
    totalMonths: lobby.totalMonths,
    hostId,
    playerOrder,
    players: playersOut,
    companies,
    companyReserve: reserve,
    market,
    negotiationDuration: lobby.negotiationDuration,
    negotiationEndsAtMs: null,
    lastDiceRoll: null,
    lastInvestorMarketPnl: null,
    lastManagerIncomePaid: null,
    lastManagementCostPaid: null,
    lastEvent: dualMode
      ? 'เปิดเผยบทบาท — ทุกคนเป็นทั้งผู้จัดการและนักลงทุน · รับทราบให้ครบทุกคน'
      : `เปิดเผยบทบาท — ทอยลูกเต๋าแดง (${mCount} ผู้จัดการ): ${roleRollSummary} · รับทราบให้ครบทุกคน`,
    auction: emptyAuction(),
    managerIds,
    investorIds,
    roleRevealSlots,
    roleAcknowledged: {},
    roleAcknowledgeCount: 0,
    debts: [],
    pendingShortfalls: [],
    gameResult: null,
  };

  return state;
}

function onActionImpl(state: PowsState, playerId: string, action: PowsAction): PowsState {
  const s = state;
  if (s.phase === 'game_over') {
    throw new GameActionRejectedError('เกมจบแล้ว');
  }

  switch (action.type) {
    case 'acknowledge_role': {
      assertPhase(s, ['role_reveal']);
      if (s.roleAcknowledged[playerId]) return s;
      s.roleAcknowledged = { ...s.roleAcknowledged, [playerId]: true };
      s.roleAcknowledgeCount += 1;
      const total = s.playerOrder.length;
      if (s.roleAcknowledgeCount >= total) {
        finishRoleReveal(s);
      } else {
        s.lastEvent = `รับทราบบทบาทแล้ว ${s.roleAcknowledgeCount}/${total} คน`;
      }
      return s;
    }
    case 'host_end_negotiation': {
      assertHost(s, playerId);
      assertPhase(s, ['negotiation']);
      endNegotiation(s);
      return s;
    }
    case 'set_deal': {
      assertPhase(s, ['negotiation']);
      if (!isManagerOf(s, playerId, action.companyId)) {
        throw new GameActionRejectedError('เฉพาะเจ้าของบริษัทตั้งดีลได้');
      }
      const c = s.companies[action.companyId];
      if (!c || c.dealClosed) throw new GameActionRejectedError('ดีลถูกปิดแล้วหรือไม่มีการ์ด');
      if (action.investorId != null) {
        if (s.players[action.investorId]?.isBankrupt) {
          throw new GameActionRejectedError('นักลงทุนล้มละลายแล้ว');
        }
        if (!canActAsInvestor(s, action.investorId))
          throw new GameActionRejectedError('นักลงทุนไม่ถูกต้อง');
        if (s.playerOrder.length <= 4 && action.investorId === c.ownerManagerId) {
          throw new GameActionRejectedError('โหมด 3–4 คน: ลงทุนในบริษัทตัวเองไม่ได้');
        }
      }
      if (action.agreedPrice != null && action.agreedPrice < 0)
        throw new GameActionRejectedError('ราคาไม่ถูกต้อง');
      c.investorId = action.investorId;
      c.agreedPrice = action.agreedPrice;
      s.lastEvent = 'อัปเดตดีล';
      return s;
    }
    case 'close_deal': {
      assertPhase(s, ['negotiation']);
      const c = s.companies[action.companyId];
      if (!c || c.dealClosed) throw new GameActionRejectedError('ปิดดีลไม่ได้');
      if (c.investorId == null || c.agreedPrice == null)
        throw new GameActionRejectedError('ข้อมูลดีลไม่ครบ');
      const inv = c.investorId;
      if (playerId !== c.ownerManagerId && playerId !== inv) {
        throw new GameActionRejectedError('เฉพาะคู่ดีลปิดสัญญาได้');
      }
      c.dealClosed = true;
      s.lastEvent = 'ดีลถูกปิด — แก้ไขไม่ได้ในเดือนนี้';
      return s;
    }
    case 'clear_deal': {
      assertPhase(s, ['negotiation']);
      if (!isManagerOf(s, playerId, action.companyId))
        throw new GameActionRejectedError('เฉพาะเจ้าของล้างดีลได้');
      const c = s.companies[action.companyId];
      if (!c || c.dealClosed) throw new GameActionRejectedError('ล้างดีลไม่ได้');
      c.investorId = null;
      c.agreedPrice = null;
      s.lastEvent = 'ล้างดีล';
      return s;
    }
    case 'host_roll_market': {
      assertHost(s, playerId);
      assertPhase(s, ['investor_income']);
      const before: Record<PowsColor, number> = {
        blue: s.market.blue.value,
        green: s.market.green.value,
        yellow: s.market.yellow.value,
        red: s.market.red.value,
      };
      const rolls: Record<PowsColor, number> = {
        blue: powsRollMarketDelta('blue'),
        green: powsRollMarketDelta('green'),
        yellow: powsRollMarketDelta('yellow'),
        red: powsRollMarketDelta('red'),
      };
      s.lastDiceRoll = rolls;
      for (const col of COLORS) {
        s.market[col].position = powsClampMarketPosition(s.market[col].position + rolls[col]);
      }
      syncMarketValues(s.market);

      const marketPnl: Record<string, number> = {};
      for (const co of Object.values(s.companies)) {
        if (!co.dealClosed || !co.investorId) continue;
        const inv = s.players[co.investorId];
        if (!inv) continue;
        const diff = s.market[co.color].value - before[co.color];
        const mult = co.isDoubleIncome ? 2 : 1;
        const change = diff * mult;
        inv.money += change;
        if (change !== 0) {
          marketPnl[inv.id] = (marketPnl[inv.id] ?? 0) + change;
        }
      }
      s.lastInvestorMarketPnl = Object.keys(marketPnl).length > 0 ? marketPnl : null;

      s.phase = 'manager_income';
      s.lastManagerIncomePaid = null;
      s.lastEvent = 'ทอยตลาดแล้ว — จ่ายรายได้นักลงทุนแล้ว — หัวห้องกดจ่ายให้ผู้จัดการ';
      return s;
    }
    case 'host_apply_manager_income': {
      assertHost(s, playerId);
      assertPhase(s, ['manager_income']);
      applyManagerIncomePayments(s);
      return s;
    }
    case 'resolve_shortfall_defer': {
      assertPhase(s, ['debt_resolution']);
      const pending = findPendingShortfall(s, action.companyId);
      if (!pending) throw new GameActionRejectedError('ไม่มีหนี้ค้างสำหรับบริษัทนี้');
      if (playerId !== pending.creditorId) {
        throw new GameActionRejectedError('เฉพาะผู้จัดการเจ้าหนี้ตัดสินได้');
      }
      const debt: PowsDebt = {
        id: newDebtId(),
        debtorId: pending.debtorId,
        creditorId: pending.creditorId,
        companyId: pending.companyId,
        amountOwed: pending.amountOwed,
        monthCreated: s.month,
      };
      s.debts.push(debt);
      const debtor = s.players[pending.debtorId];
      const mgr = s.players[pending.creditorId];
      removePendingShortfall(s, action.companyId);
      s.lastEvent = `${mgr?.name ?? ''} ผ่อนหนี้ให้ ${debtor?.name ?? ''} $${pending.amountOwed.toLocaleString()}`;
      advanceAfterDebtResolution(s);
      return s;
    }
    case 'resolve_shortfall_bankrupt': {
      assertPhase(s, ['debt_resolution']);
      const pending = findPendingShortfall(s, action.companyId);
      if (!pending) throw new GameActionRejectedError('ไม่มีหนี้ค้างสำหรับบริษัทนี้');
      if (playerId !== pending.creditorId) {
        throw new GameActionRejectedError('เฉพาะผู้จัดการเจ้าหนี้ตัดสินได้');
      }
      const debtor = s.players[pending.debtorId];
      removePendingShortfall(s, action.companyId);
      declareInvestorBankrupt(
        s,
        pending.debtorId,
        `${s.players[pending.creditorId]?.name ?? ''} บังคับล้มละลาย ${debtor?.name ?? ''} ($${pending.amountOwed.toLocaleString()} ค้าง)`,
      );
      advanceAfterDebtResolution(s);
      return s;
    }
    case 'pay_debt': {
      const debt = s.debts.find((d) => d.id === action.debtId);
      if (!debt) throw new GameActionRejectedError('ไม่พบหนี้');
      if (playerId !== debt.debtorId) throw new GameActionRejectedError('เฉพาะผู้เป็นหนี้จ่ายได้');
      const debtor = s.players[debt.debtorId];
      const creditor = s.players[debt.creditorId];
      if (!debtor || debtor.isBankrupt) throw new GameActionRejectedError('จ่ายหนี้ไม่ได้');
      if (!creditor) throw new GameActionRejectedError('ไม่พบเจ้าหนี้');
      const maxPay = action.amount != null ? action.amount : debt.amountOwed;
      if (maxPay <= 0 || Number.isNaN(maxPay)) throw new GameActionRejectedError('จำนวนไม่ถูกต้อง');
      const pay = Math.min(debtor.money, debt.amountOwed, maxPay);
      if (pay <= 0) throw new GameActionRejectedError('เงินไม่พอจ่าย');
      debtor.money -= pay;
      creditor.money += pay;
      debt.amountOwed -= pay;
      if (debt.amountOwed <= 0) {
        s.debts = s.debts.filter((d) => d.id !== debt.id);
        s.lastEvent = `${debtor.name} ปิดหนี้กับ ${creditor.name}ครบแล้ว`;
      } else {
        s.lastEvent = `${debtor.name} จ่ายหนี้ $${pay.toLocaleString()} (คงเหลือ $${debt.amountOwed.toLocaleString()})`;
      }
      return s;
    }
    case 'host_apply_management_costs': {
      assertHost(s, playerId);
      assertPhase(s, ['management_cost']);
      const costPaid: Record<string, number> = {};
      for (const mid of s.managerIds) {
        const mgr = s.players[mid];
        if (!mgr) continue;
        const owned = mgr.companyIds.filter((cid) => {
          const c = s.companies[cid];
          return c && !c.eliminated && c.ownerManagerId === mid;
        });
        let due = owned.length * MANAGEMENT_COST_PER_COMPANY;
        while (mgr.money < due && owned.length > 0) {
          const sellId = [...owned].sort((a, b) => a.localeCompare(b))[0]!;
          const co = s.companies[sellId];
          if (co) {
            co.ownerManagerId = null;
            co.investorId = null;
            co.agreedPrice = null;
            co.dealClosed = false;
            mgr.money += BANK_SELL_PRICE;
            s.companyReserve.push(sellId);
          }
          mgr.companyIds = mgr.companyIds.filter((x) => x !== sellId);
          const ix = owned.indexOf(sellId);
          if (ix >= 0) owned.splice(ix, 1);
          due = owned.length * MANAGEMENT_COST_PER_COMPANY;
        }
        const feePaid = Math.min(mgr.money, due);
        mgr.money = Math.max(0, mgr.money - due);
        if (feePaid > 0) costPaid[mid] = feePaid;
      }
      s.lastManagementCostPaid = Object.keys(costPaid).length > 0 ? costPaid : null;

      if (s.month === s.totalMonths) {
        finishFinalMonthAfterManagement(s);
        return s;
      }

      s.phase = 'auction';
      drawAuctionQueue(s);
      startNextAuctionLot(s);
      s.lastEvent = 'จ่ายค่าบริหารแล้ว — เริ่มประมูล';
      return s;
    }
    case 'host_start_auction_lot': {
      assertHost(s, playerId);
      assertPhase(s, ['auction']);
      if (s.auction.status === 'bidding' && s.auction.currentCompanyId) {
        throw new GameActionRejectedError('ยังประมูลอยู่');
      }
      startNextAuctionLot(s);
      return s;
    }
    case 'auction_bid': {
      assertPhase(s, ['auction']);
      if (s.auction.status !== 'bidding') throw new GameActionRejectedError('ไม่ใช่ช่วงประมูล');
      if (!s.managerIds.includes(playerId))
        throw new GameActionRejectedError('เฉพาะผู้จัดการประมูลได้');
      if (s.players[playerId]?.isBankrupt) throw new GameActionRejectedError('ผู้เล่นล้มละลายแล้ว');
      const actives = s.auction.activeBidderIds;
      if (!actives.includes(playerId)) throw new GameActionRejectedError('คุณผ่านการประมูลนี้แล้ว');
      if (action.amount <= s.auction.currentBid) {
        throw new GameActionRejectedError('ต้องประมูลสูงกว่าราคาปัจจุบัน');
      }
      if (s.auction.currentBid === 0 && action.amount < MIN_AUCTION_INCREMENT) {
        throw new GameActionRejectedError(
          `ประมูลขั้นต่ำ $${MIN_AUCTION_INCREMENT.toLocaleString()}`,
        );
      }
      const p = s.players[playerId];
      if (p && p.money < action.amount) throw new GameActionRejectedError('เงินไม่พอจ่ายหากชนะ');
      s.auction.currentBid = action.amount;
      s.auction.currentHighestBidderId = playerId;
      if (actives.length === 1 && s.auction.currentBid > 0) {
        resolveAuctionWinner(s);
        return s;
      }
      s.lastEvent = `${p?.name} ประมูล $${action.amount.toLocaleString()}`;
      return s;
    }
    case 'auction_pass': {
      assertPhase(s, ['auction']);
      if (s.auction.status !== 'bidding') throw new GameActionRejectedError('ไม่ใช่ช่วงประมูล');
      if (!s.managerIds.includes(playerId))
        throw new GameActionRejectedError('เฉพาะผู้จัดการประมูลได้');
      const actives = s.auction.activeBidderIds;
      if (!actives.includes(playerId)) return s;
      if (playerId === s.auction.currentHighestBidderId && s.auction.currentBid > 0) {
        throw new GameActionRejectedError('คุณเป็นผู้นำการประมูล — รอให้คนอื่นผ่าน');
      }
      const idx = actives.indexOf(playerId);
      if (idx >= 0) actives.splice(idx, 1);
      if (actives.length === 0) {
        resolveAuctionWinner(s);
        return s;
      }
      if (actives.length === 1 && s.auction.currentBid > 0) {
        resolveAuctionWinner(s);
        return s;
      }
      s.lastEvent = `${s.players[playerId]?.name ?? playerId} ผ่านการประมูล`;
      return s;
    }
    case 'host_finish_auction_month': {
      assertHost(s, playerId);
      assertPhase(s, ['auction']);
      if (s.auction.status === 'bidding' && s.auction.currentCompanyId) {
        throw new GameActionRejectedError('ยังประมูลไม่จบ');
      }
      if (s.auction.companyQueue.length > 0 || s.auction.currentCompanyId) {
        throw new GameActionRejectedError('ยังมีการ์ดในคิวประมูล');
      }
      advanceMonthAfterAuction(s);
      return s;
    }
    default:
      throw new GameActionRejectedError('ไม่รู้จักแอ็กชัน');
  }
}

function getPlayerViewImpl(state: PowsState, playerId: string): PowsPlayerView {
  const view: PowsPlayerView = {
    ...state,
    myPlayerId: playerId,
    debts: state.debts ?? [],
    pendingShortfalls: state.pendingShortfalls ?? [],
    roleRevealSlots: state.roleRevealSlots ?? [],
    roleAcknowledged: state.roleAcknowledged ?? {},
  };
  if (state.phase === 'role_reveal') {
    view.hasAcknowledgedRole = state.roleAcknowledged[playerId] === true;
    view.roleAcknowledgeProgress = {
      current: state.roleAcknowledgeCount,
      total: state.playerOrder.length,
    };
  }
  return view;
}

function isGameOverImpl(state: PowsState): GameResult | null {
  return state.gameResult;
}

export const panicOnWallStreetGame: GameDefinition<PowsState, PowsAction> = {
  id: 'panic-on-wall-street',
  name: 'Panic on Wall Street',
  description:
    'เจรจาซื้อขายหุ้น ทอยตลาด รับเงินปันผล และประมูลบริษัท — 3–11 คน ผ่านดิจิทัล (หัวห้องควบคุมเฟสหลัก)',
  minPlayers: 3,
  maxPlayers: 11,
  thumbnail: 'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/cover_klrqhw',

  setup(players: Player[], options?: unknown): PowsState {
    return setupImpl(players, options);
  },

  onAction(state: PowsState, playerId: string, action: PowsAction): PowsState {
    return onActionImpl(state, playerId, action);
  },

  getPlayerView(state: PowsState, playerId: string): unknown {
    return getPlayerViewImpl(state, playerId);
  },

  isGameOver(state: PowsState): GameResult | null {
    return isGameOverImpl(state);
  },
};
