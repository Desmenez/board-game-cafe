import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  SplendorAction,
  SplendorCardView,
  SplendorGem,
  SplendorGems,
  SplendorNobleView,
  SplendorPlayerRowView,
  SplendorPlayerView,
} from 'shared';
import {
  buildDevelopmentDeck,
  buildNoblesDeck,
  shuffle,
  type SplendorDevCardDef,
  type SplendorNobleDef,
} from './deck.js';

// ============================================================
// Splendor — server engine (กฎตาม rulebook; สำรับราคาเป็นชุดสังเคราะห์)
// ============================================================

const GEMS: SplendorGem[] = ['white', 'blue', 'green', 'red', 'black'];

function z(): SplendorGems {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

function gemsGe(a: SplendorGems, b: SplendorGems): boolean {
  return GEMS.every((g) => a[g] >= b[g]);
}

function sumGems(g: SplendorGems): number {
  return GEMS.reduce((s, k) => s + g[k], 0);
}

function cardView(c: SplendorDevCardDef): SplendorCardView {
  return {
    id: c.id,
    level: c.level,
    bonus: c.bonus,
    prestige: c.prestige,
    cost: { ...c.cost },
  };
}

function nobleView(n: SplendorNobleDef): SplendorNobleView {
  return { id: n.id, prestige: n.prestige, requires: { ...n.requires } };
}

interface SplendorInternalPlayer {
  id: string;
  name: string;
  gems: SplendorGems;
  gold: number;
  purchasedCards: SplendorCardView[];
  reserved: [SplendorCardView | null, SplendorCardView | null, SplendorCardView | null];
  nobles: SplendorNobleView[];
}

export interface SplendorState {
  phase: 'playing' | 'return_tokens' | 'noble_pick' | 'game_over';
  currentPlayerIndex: number;
  players: SplendorInternalPlayer[];
  bankGems: SplendorGems;
  bankGold: number;
  decks: [SplendorDevCardDef[], SplendorDevCardDef[], SplendorDevCardDef[]];
  visible: [
    (SplendorDevCardDef | null)[],
    (SplendorDevCardDef | null)[],
    (SplendorDevCardDef | null)[],
  ];
  nobles: SplendorNobleDef[];
  lastEvent?: string;
  endMode: boolean;
  anchorPlayerIndex: number;
  finalRoundNotice?: boolean;
  noblePick?: { playerId: string; options: string[] };
  gameResult?: GameResult & { scores: Record<string, number> };
}

function computeBonuses(p: SplendorInternalPlayer): SplendorGems {
  const b = z();
  for (const c of p.purchasedCards) b[c.bonus] += 1;
  return b;
}

function prestigeTotal(p: SplendorInternalPlayer): number {
  let s = p.purchasedCards.reduce((a, c) => a + c.prestige, 0);
  s += p.nobles.reduce((a, n) => a + n.prestige, 0);
  return s;
}

function reservedCount(p: SplendorInternalPlayer): number {
  return p.reserved.filter(Boolean).length;
}

function totalHeld(p: SplendorInternalPlayer): number {
  return sumGems(p.gems) + p.gold;
}

function effectiveCost(card: SplendorCardView, bonuses: SplendorGems): SplendorGems {
  const e = z();
  for (const g of GEMS) e[g] = Math.max(0, card.cost[g] - bonuses[g]);
  return e;
}

function tryPay(state: SplendorState, idx: number, card: SplendorCardView): boolean {
  const p = state.players[idx];
  const eff = effectiveCost(card, computeBonuses(p));
  const payFrom = z();
  let goldNeed = 0;
  for (const g of GEMS) {
    const use = Math.min(p.gems[g], eff[g]);
    payFrom[g] = use;
    goldNeed += eff[g] - use;
  }
  if (goldNeed > p.gold) return false;
  for (const g of GEMS) {
    p.gems[g] -= payFrom[g];
    state.bankGems[g] += payFrom[g];
  }
  p.gold -= goldNeed;
  state.bankGold += goldNeed;
  return true;
}

function refillSlot(state: SplendorState, levelIdx: number, slotIdx: number): void {
  const deck = state.decks[levelIdx];
  const vis = state.visible[levelIdx];
  if (deck.length > 0) vis[slotIdx] = deck.pop()!;
  else vis[slotIdx] = null;
}

function firstReservedSlot(p: SplendorInternalPlayer): number {
  return p.reserved.findIndex((x) => x === null);
}

function eligibleNobles(state: SplendorState, p: SplendorInternalPlayer): SplendorNobleDef[] {
  const b = computeBonuses(p);
  return state.nobles.filter((n) => gemsGe(b, n.requires));
}

function claimNoble(state: SplendorState, playerIdx: number, nobleId: string): void {
  const ni = state.nobles.findIndex((n) => n.id === nobleId);
  if (ni < 0) return;
  const [n] = state.nobles.splice(ni, 1);
  state.players[playerIdx].nobles.push(nobleView(n));
}

function advanceTurnCheckEnd(state: SplendorState): void {
  const n = state.players.length;
  const next = (state.currentPlayerIndex + 1) % n;
  if (state.endMode && next === state.anchorPlayerIndex) {
    resolveGameEnd(state);
    return;
  }
  state.currentPlayerIndex = next;
  state.phase = 'playing';
  state.noblePick = undefined;
}

function resolveGameEnd(state: SplendorState): void {
  const stats = state.players.map((p) => ({
    id: p.id,
    prestige: prestigeTotal(p),
    cards: p.purchasedCards.length,
    reserves: reservedCount(p),
  }));
  stats.sort(
    (a, b) =>
      b.prestige - a.prestige || a.cards - b.cards || a.reserves - b.reserves,
  );
  const best = stats[0];
  const winners = stats
    .filter(
      (s) =>
        s.prestige === best.prestige &&
        s.cards === best.cards &&
        s.reserves === best.reserves,
    )
    .map((s) => s.id);
  const scores: Record<string, number> = {};
  for (const s of stats) scores[s.id] = s.prestige;
  const names = new Map(state.players.map((p) => [p.id, p.name]));
  const reason =
    winners.length === 1
      ? `${names.get(winners[0]) ?? winners[0]} ชนะ (${best.prestige} แต้ม)`
      : `เสมอ — ${winners.map((id) => names.get(id) ?? id).join(', ')} (${best.prestige} แต้ม)`;
  state.phase = 'game_over';
  state.gameResult = { winners, reason, scores };
  state.lastEvent = 'เกมจบ';
}

function afterNoblesResolved(state: SplendorState): void {
  const idx = state.currentPlayerIndex;
  const p = state.players[idx];
  if (prestigeTotal(p) >= 15 && !state.endMode) {
    state.endMode = true;
    state.anchorPlayerIndex = idx;
    state.finalRoundNotice = true;
    state.lastEvent = 'มีผู้เล่นถึง 15 แต้ม — เล่นจบรอบนี้';
  } else {
    state.finalRoundNotice = false;
  }
  advanceTurnCheckEnd(state);
}

function tryNoblesOrAdvance(state: SplendorState): void {
  const idx = state.currentPlayerIndex;
  const p = state.players[idx];
  const eligible = eligibleNobles(state, p);
  if (eligible.length > 1) {
    state.phase = 'noble_pick';
    state.noblePick = { playerId: p.id, options: eligible.map((n) => n.id) };
    state.lastEvent = 'เลือกโนเบิล 1 คน';
    return;
  }
  if (eligible.length === 1) {
    claimNoble(state, idx, eligible[0].id);
  }
  afterNoblesResolved(state);
}

function finishMainAction(state: SplendorState): void {
  const p = state.players[state.currentPlayerIndex];
  if (totalHeld(p) > 10) {
    state.phase = 'return_tokens';
    state.lastEvent = 'คืนโทเคนให้เหลือ 10 เม็ด';
    return;
  }
  tryNoblesOrAdvance(state);
}

function afterReturnTokens(state: SplendorState): void {
  advanceTurnCheckEnd(state);
}

function assertCurrent(
  state: SplendorState,
  playerId: string,
  phases: SplendorState['phase'][],
): SplendorInternalPlayer | null {
  if (!phases.includes(state.phase)) return null;
  const p = state.players[state.currentPlayerIndex];
  if (p.id !== playerId) return null;
  return p;
}

function setupSplendor(players: Player[]): SplendorState {
  const n = players.length;
  const perColor = n >= 4 ? 7 : n === 3 ? 5 : 4;
  const rng = Math.random;

  const all = buildDevelopmentDeck();
  const d1: SplendorDevCardDef[] = [];
  const d2: SplendorDevCardDef[] = [];
  const d3: SplendorDevCardDef[] = [];
  for (const c of all) {
    if (c.level === 1) d1.push(c);
    else if (c.level === 2) d2.push(c);
    else d3.push(c);
  }
  const decks: SplendorState['decks'] = [
    shuffle(d1, rng),
    shuffle(d2, rng),
    shuffle(d3, rng),
  ];

  const st0: SplendorState = {
    phase: 'playing',
    currentPlayerIndex: 0,
    players: players.map((pl) => ({
      id: pl.id,
      name: pl.name,
      gems: z(),
      gold: 0,
      purchasedCards: [],
      reserved: [null, null, null],
      nobles: [],
    })),
    bankGems: {
      white: perColor,
      blue: perColor,
      green: perColor,
      red: perColor,
      black: perColor,
    },
    bankGold: 5,
    decks,
    visible: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ],
    nobles: shuffle(buildNoblesDeck(), rng).slice(0, n + 1),
    endMode: false,
    anchorPlayerIndex: 0,
    lastEvent: 'เริ่มเกม',
  };
  for (let L = 0; L < 3; L++) {
    for (let s = 0; s < 4; s++) refillSlot(st0, L, s);
  }
  return st0;
}

function rowView(p: SplendorInternalPlayer, myId: string): SplendorPlayerRowView {
  return {
    id: p.id,
    name: p.name,
    gems: { ...p.gems },
    gold: p.gold,
    bonuses: computeBonuses(p),
    prestige: prestigeTotal(p),
    purchasedCards: p.purchasedCards.map((c) => ({ ...c, cost: { ...c.cost } })),
    reservedSlots: p.reserved.map((c) =>
      c === null ? null : p.id === myId ? { ...c, cost: { ...c.cost } } : { hidden: true },
    ),
  };
}

function getPlayerView(state: SplendorState, playerId: string): SplendorPlayerView {
  const vis = state.visible.map((row) =>
    row.map((c) => (c === null ? null : cardView(c))),
  ) as SplendorPlayerView['visible'];

  const view: SplendorPlayerView = {
    phase: state.phase,
    currentPlayerId: state.players[state.currentPlayerIndex]?.id ?? '',
    myPlayerId: playerId,
    bankGems: { ...state.bankGems },
    bankGold: state.bankGold,
    visible: vis,
    deckSizes: [state.decks[0].length, state.decks[1].length, state.decks[2].length],
    nobles: state.nobles.map(nobleView),
    players: state.players.map((p) => rowView(p, playerId)),
    lastEvent: state.lastEvent,
    finalRoundNotice: state.finalRoundNotice,
  };

  if (state.phase === 'noble_pick' && state.noblePick?.playerId === playerId) {
    view.noblePickOptions = [...state.noblePick.options];
  }

  if (state.phase === 'game_over' && state.gameResult) {
    view.result = {
      winners: state.gameResult.winners,
      reason: state.gameResult.reason,
      scores: { ...state.gameResult.scores },
    };
  }

  return view;
}

function onAction(state: SplendorState, playerId: string, action: SplendorAction): SplendorState {
  if (state.phase === 'game_over') {
    throw new Error('เกมจบแล้ว');
  }

  if (state.phase === 'return_tokens') {
    const p = assertCurrent(state, playerId, ['return_tokens']);
    if (!p) throw new Error('ไม่ใช่ตาคุณ');
    if (action.type !== 'return_tokens') throw new Error('ต้องคืนโทเคน');
    const cur = totalHeld(p);
    if (cur <= 10) throw new Error('ไม่ต้องคืนโทเคน');
    const mustReturn = cur - 10;
    const retG = action.gems;
    const retGold = action.gold;
    if (sumGems(retG) + retGold !== mustReturn) throw new Error('จำนวนคืนไม่ถูกต้อง');
    for (const g of GEMS) {
      if (retG[g] < 0 || retG[g] > p.gems[g]) throw new Error('จำนวนอัญมณีไม่ถูกต้อง');
    }
    if (retGold < 0 || retGold > p.gold) throw new Error('จำนวนทองไม่ถูกต้อง');
    for (const g of GEMS) {
      p.gems[g] -= retG[g];
      state.bankGems[g] += retG[g];
    }
    p.gold -= retGold;
    state.bankGold += retGold;
    state.phase = 'playing';
    afterReturnTokens(state);
    return state;
  }

  if (state.phase === 'noble_pick') {
    if (action.type !== 'choose_noble') throw new Error('ต้องเลือกโนเบิล');
    if (!state.noblePick || state.noblePick.playerId !== playerId) {
      throw new Error('ไม่ใช่รอบเลือกโนเบิลของคุณ');
    }
    if (!state.noblePick.options.includes(action.nobleId)) throw new Error('โนเบิลนี้เลือกไม่ได้');
    const idx = state.players.findIndex((x) => x.id === playerId);
    claimNoble(state, idx, action.nobleId);
    state.noblePick = undefined;
    afterNoblesResolved(state);
    return state;
  }

  const p = assertCurrent(state, playerId, ['playing']);
  if (!p) throw new Error('ไม่ใช่ตาคุณ');

  const idx = state.currentPlayerIndex;

  switch (action.type) {
    case 'take_three': {
      const [a, b, c] = action.colors;
      if (a === b || a === c || b === c) throw new Error('ต้องเป็นคนละสี');
      for (const g of [a, b, c]) {
        if (state.bankGems[g] < 1) throw new Error('ธนาคารไม่มีอัญมณีเพียงพอ');
      }
      for (const g of [a, b, c]) {
        state.bankGems[g] -= 1;
        p.gems[g] += 1;
      }
      state.lastEvent = `${p.name} หยิบอัญมณีคนละสี 3 เม็ด`;
      finishMainAction(state);
      break;
    }
    case 'take_two': {
      const { color } = action;
      if (state.bankGems[color] < 4) {
        throw new Error('ธนาคารต้องมีอัญมณีสีนี้อย่างน้อย 4 เม็ด');
      }
      state.bankGems[color] -= 2;
      p.gems[color] += 2;
      state.lastEvent = `${p.name} หยิบ ${color} 2 เม็ด`;
      finishMainAction(state);
      break;
    }
    case 'reserve_table': {
      if (reservedCount(p) >= 3) throw new Error('จองได้ไม่เกิน 3 ใบ');
      const L = action.level - 1;
      const slot = action.slot;
      if (slot < 0 || slot > 3) throw new Error('ช่องการ์ดไม่ถูกต้อง');
      const card = state.visible[L][slot];
      if (card === null) throw new Error('ไม่มีการ์ดในช่องนี้');
      const rs = firstReservedSlot(p);
      if (rs < 0) throw new Error('มือจองเต็ม');
      state.visible[L][slot] = null;
      refillSlot(state, L, slot);
      p.reserved[rs] = cardView(card);
      if (state.bankGold > 0) {
        state.bankGold -= 1;
        p.gold += 1;
      }
      state.lastEvent = `${p.name} จองการ์ดจากโต๊ะ`;
      finishMainAction(state);
      break;
    }
    case 'reserve_deck': {
      if (reservedCount(p) >= 3) throw new Error('จองได้ไม่เกิน 3 ใบ');
      const L = action.level - 1;
      const deck = state.decks[L];
      if (deck.length === 0) throw new Error('กองการ์ดหมด');
      const card = deck.pop()!;
      const rs = firstReservedSlot(p);
      if (rs < 0) throw new Error('มือจองเต็ม');
      p.reserved[rs] = cardView(card);
      if (state.bankGold > 0) {
        state.bankGold -= 1;
        p.gold += 1;
      }
      state.lastEvent = `${p.name} จองการ์ดจากกอง`;
      finishMainAction(state);
      break;
    }
    case 'buy_table': {
      const L = action.level - 1;
      const slot = action.slot;
      if (slot < 0 || slot > 3) throw new Error('ช่องการ์ดไม่ถูกต้อง');
      const raw = state.visible[L][slot];
      if (raw === null) throw new Error('ไม่มีการ์ดในช่องนี้');
      const cv = cardView(raw);
      if (!tryPay(state, idx, cv)) throw new Error('อัญมณีไม่พอ');
      state.visible[L][slot] = null;
      refillSlot(state, L, slot);
      p.purchasedCards.push(cv);
      state.lastEvent = `${p.name} ซื้อการ์ดจากโต๊ะ`;
      finishMainAction(state);
      break;
    }
    case 'buy_reserved': {
      const slot = action.slot;
      if (slot < 0 || slot > 2) throw new Error('ช่องจองไม่ถูกต้อง');
      const cv = p.reserved[slot];
      if (cv === null) throw new Error('ไม่มีการ์ดในช่องจอง');
      if (!tryPay(state, idx, cv)) throw new Error('อัญมณีไม่พอ');
      p.reserved[slot] = null;
      p.purchasedCards.push(cv);
      state.lastEvent = `${p.name} ซื้อการ์ดที่จองไว้`;
      finishMainAction(state);
      break;
    }
    case 'choose_noble':
    case 'return_tokens':
      throw new Error('แอ็กชันนี้ใช้ไม่ได้ในขณะนี้');
    default:
      throw new Error('แอ็กชันไม่รู้จัก');
  }

  return state;
}

function isGameOver(state: SplendorState): GameResult | null {
  if (state.phase !== 'game_over' || !state.gameResult) return null;
  return { winners: state.gameResult.winners, reason: state.gameResult.reason };
}

export const splendorGame: GameDefinition<SplendorState, SplendorAction> = {
  id: 'splendor',
  name: 'Splendor',
  description: 'สะสมอัญมณี ซื้อการ์ดพัฒนาการ ดึงดูดโนเบิล — แข่งกันถึง 15 แต้มเกียรติยศ',
  minPlayers: 2,
  maxPlayers: 4,
  thumbnail: '/games/splendor/thumbnail.png',

  setup: (players) => setupSplendor(players),

  onAction: (state, playerId, action) => onAction(state, playerId, action),

  getPlayerView: (state, playerId) => getPlayerView(state, playerId),

  isGameOver: (state) => isGameOver(state),
};
