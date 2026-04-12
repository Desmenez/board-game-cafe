import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  SheriffAction,
  SheriffCard,
  SheriffGoodType,
  SheriffLegalGood,
  SheriffLobbyOptions,
  SheriffPlayerState,
  SheriffPlayerView,
  SheriffState,
} from 'shared';
import {
  goodsValueScoreExplanationTh,
  kingQueenUnitsForLegalGood,
  stallGoodsGoldAtGameEnd,
} from './stall-gold-value.js';

const LEGAL_GOODS: SheriffLegalGood[] = ['apple', 'cheese', 'bread', 'chicken'];

function stallGroupsFromStall(stall: SheriffCard[]): { type: SheriffGoodType; count: number }[] {
  const m = new Map<SheriffGoodType, number>();
  for (const c of stall) {
    m.set(c.type, (m.get(c.type) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

const GOODS_META: Record<SheriffGoodType, { value: number; penalty: number }> = {
  apple: { value: 2, penalty: 2 },
  cheese: { value: 3, penalty: 2 },
  bread: { value: 3, penalty: 2 },
  chicken: { value: 4, penalty: 2 },
  pepper: { value: 6, penalty: 4 },
  mead: { value: 7, penalty: 4 },
  silk: { value: 8, penalty: 4 },
  crossbow: { value: 9, penalty: 4 },
  feast_plate: { value: 2, penalty: 2 },
  dragon_pepper: { value: 7, penalty: 4 },
  brimstone_oil: { value: 8, penalty: 4 },
  olive_oil: { value: 6, penalty: 4 },
  strawberry_mead: { value: 8, penalty: 4 },
  golden_silk: { value: 10, penalty: 4 },
  heavy_crossbow: { value: 11, penalty: 4 },
  prince_johns_sword: { value: 12, penalty: 5 },
  green_apples: { value: 4, penalty: 3 },
  golden_apples: { value: 6, penalty: 4 },
  bleu_cheese: { value: 5, penalty: 3 },
  gouda_cheese: { value: 6, penalty: 4 },
  rye_bread: { value: 5, penalty: 3 },
  pumpernickel_bread: { value: 6, penalty: 4 },
  royal_rooster: { value: 8, penalty: 4 },
};

const KING_QUEEN_BONUS: Record<SheriffLegalGood, { king: number; queen: number }> = {
  apple: { king: 20, queen: 10 },
  cheese: { king: 15, queen: 10 },
  bread: { king: 15, queen: 10 },
  chicken: { king: 10, queen: 5 },
};

const KING_QUEEN_GOOD_LABEL_TH: Record<SheriffLegalGood, string> = {
  apple: 'แอปเปิ้ล',
  cheese: 'ชีส',
  bread: 'ขนมปัง',
  chicken: 'ไก่',
};

function kingQueenBonusExplanationTh(
  state: SheriffState,
  playerId: string,
  bonusTotal: number,
): string {
  const parts: string[] = [];
  for (const good of LEGAL_GOODS) {
    const counts = state.players.map((p) => ({
      id: p.id,
      count: kingQueenUnitsForLegalGood(p.stall, good),
    }));
    counts.sort((a, b) => b.count - a.count);
    if ((counts[0]?.count ?? 0) === 0) continue;
    const topCount = counts[0].count;
    const top = counts.filter((c) => c.count === topCount);
    const kingSplit = Math.floor(KING_QUEEN_BONUS[good].king / top.length);
    if (top.some((t) => t.id === playerId)) {
      parts.push(
        `${KING_QUEEN_GOOD_LABEL_TH[good]} King +${kingSplit} (สูงสุด ${topCount} หน่วย${top.length > 1 ? ` หาร ${top.length} คนเสมอ` : ''})`,
      );
    }
    const nextCount = counts.find((c) => c.count < topCount)?.count ?? 0;
    if (nextCount > 0) {
      const queens = counts.filter((c) => c.count === nextCount);
      const queenSplit = Math.floor(KING_QUEEN_BONUS[good].queen / queens.length);
      if (queens.some((c) => c.id === playerId)) {
        parts.push(
          `${KING_QUEEN_GOOD_LABEL_TH[good]} Queen +${queenSplit} (รองลงมา ${nextCount} หน่วย${queens.length > 1 ? ` หาร ${queens.length} คนเสมอ` : ''})`,
        );
      }
    }
  }
  if (parts.length === 0) {
    return 'โบนัส = 0 — ไม่ได้อยู่ในอันดับ King/Queen ของสายสินค้าถูกกฎหมายใด (นับหน่วยจากแผงเทียบทั้งโต๊ะ)';
  }
  return `แบ่งจากโบนัส King/Queen ต่อสาย (แอปเปิ้ล ชีส ขนมปัง ไก่): ${parts.join(' · ')} → นำมาบวกกัน = +${bonusTotal}`;
}

/** ขนมปังพื้นฐาน — เกม 3–4 คนใช้น้อยกว่า; เกม 5 คนเท่ากับจำนวนเดิมในกติกาเต็ม */
const BREAD_COUNT_DECK_3_TO_4_PLAYERS = 30;
const BREAD_COUNT_DECK_5_PLAYERS = 36;

const BASE_DECK_COUNTS: Record<SheriffGoodType, number> = {
  apple: 48,
  cheese: 36,
  /** ค่าเริ่มต้นตามโต๊ะเล็ก — `buildDeck` จะปรับเป็น 36 เมื่อมีผู้เล่น 5 คน */
  bread: BREAD_COUNT_DECK_3_TO_4_PLAYERS,
  chicken: 24,
  pepper: 22,
  mead: 21,
  silk: 12,
  crossbow: 5,
  feast_plate: 0,
  dragon_pepper: 0,
  brimstone_oil: 0,
  olive_oil: 0,
  strawberry_mead: 0,
  golden_silk: 0,
  heavy_crossbow: 0,
  prince_johns_sword: 0,
  green_apples: 0,
  golden_apples: 0,
  bleu_cheese: 0,
  gouda_cheese: 0,
  rye_bread: 0,
  pumpernickel_bread: 0,
  royal_rooster: 0,
};

/** การ์ดเสริมทั้งหมด — ใส่เมื่อ `playerCount > 4` เท่านั้น (โต๊ะ 5 คน) */
const EXTRA_CARDS_FOR_5P: Partial<Record<SheriffGoodType, number>> = {
  dragon_pepper: 2,
  olive_oil: 2,
  strawberry_mead: 2,
  golden_silk: 2,
  heavy_crossbow: 2,
  prince_johns_sword: 1,
  green_apples: 2,
  golden_apples: 1,
  bleu_cheese: 2,
  gouda_cheese: 1,
  rye_bread: 2,
  pumpernickel_bread: 1,
  royal_rooster: 2,
};

let nextCardId = 1;
let nextInspectionId = 1;

function newCard(type: SheriffGoodType): SheriffCard {
  return { id: `sheriff-of-nottingham-${nextCardId++}`, type };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseSheriffLobbyOptions(options?: unknown): SheriffLobbyOptions {
  if (options && typeof options === 'object' && 'includeSpecialCards' in options) {
    const v = (options as { includeSpecialCards?: unknown }).includeSpecialCards;
    if (typeof v === 'boolean') return { includeSpecialCards: v };
  }
  return { includeSpecialCards: true };
}

function buildDeck(playerCount: number, includeSpecialCards: boolean): SheriffCard[] {
  const cards: SheriffCard[] = [];
  const mergedCounts: Record<SheriffGoodType, number> = { ...BASE_DECK_COUNTS };
  mergedCounts.bread =
    playerCount > 4 ? BREAD_COUNT_DECK_5_PLAYERS : BREAD_COUNT_DECK_3_TO_4_PLAYERS;

  if (playerCount > 4 && includeSpecialCards) {
    for (const [type, count] of Object.entries(EXTRA_CARDS_FOR_5P) as [SheriffGoodType, number][]) {
      mergedCounts[type] = (mergedCounts[type] ?? 0) + count;
    }
  } else {
    /** เกม 3–4 คน หรือ 5 คนแต่ปิดการ์ดพิเศษ: ไม่รวมชุดเสริม */
    for (const t of Object.keys(EXTRA_CARDS_FOR_5P) as SheriffGoodType[]) {
      mergedCounts[t] = BASE_DECK_COUNTS[t] ?? 0;
    }
  }

  for (const [type, count] of Object.entries(mergedCounts) as [SheriffGoodType, number][]) {
    for (let i = 0; i < count; i += 1) cards.push(newCard(type));
  }
  return shuffle(cards);
}

function pushPublicLog(state: SheriffState, message: string): void {
  state.publicLog = [...state.publicLog, message].slice(-24);
}

function drawOne(state: SheriffState): SheriffCard | undefined {
  const direct = state.drawPile.pop();
  if (direct) return direct;
  const refill = [...state.discardPiles[0], ...state.discardPiles[1]];
  if (refill.length === 0) return undefined;
  state.drawPile = shuffle(refill);
  state.discardPiles = [[], []];
  return state.drawPile.pop();
}

function transferCoins(from: SheriffPlayerState, to: SheriffPlayerState, amount: number): number {
  if (amount <= 0) return 0;
  const paid = Math.min(from.coins, amount);
  from.coins -= paid;
  to.coins += paid;
  return paid;
}

function drawToSix(state: SheriffState, player: SheriffPlayerState): void {
  while (player.hand.length < 6) {
    const card = drawOne(state);
    if (!card) break;
    player.hand.push(card);
  }
}

function legalBagSelection(hand: SheriffCard[], cardIds: string[]): SheriffCard[] | null {
  if (cardIds.length > 5) return null;
  /** ร่างถุงว่าง (คืนการ์ดทั้งหมดจากร่างกลับมือ) — ต้องยอมรับได้ */
  if (cardIds.length === 0) return [];
  const uniq = new Set(cardIds);
  if (uniq.size !== cardIds.length) return null;
  const bag = cardIds.map((id) => hand.find((c) => c.id === id)).filter(Boolean) as SheriffCard[];
  if (bag.length !== cardIds.length) return null;
  return bag;
}

function isTruthfulDeclaration(card: SheriffCard, declared: SheriffLegalGood): boolean {
  if (card.type === declared) return true;
  if (bonusFamily(card.type) === declared) return true;
  return false;
}

function bonusFamily(type: SheriffGoodType): SheriffLegalGood | null {
  if (type === 'apple' || type === 'green_apples' || type === 'golden_apples') return 'apple';
  if (type === 'cheese' || type === 'bleu_cheese' || type === 'gouda_cheese') return 'cheese';
  if (type === 'bread' || type === 'rye_bread' || type === 'pumpernickel_bread') return 'bread';
  if (type === 'chicken' || type === 'royal_rooster') return 'chicken';
  return null;
}

function rotateSheriff(state: SheriffState): void {
  const n = state.players.length;
  const currentSheriff = state.players[state.sheriffIndex];
  state.sheriffTurnsTaken[currentSheriff.id] =
    (state.sheriffTurnsTaken[currentSheriff.id] ?? 0) + 1;
  state.sheriffIndex = (state.sheriffIndex + 1) % n;
  const sheriffId = state.players[state.sheriffIndex].id;
  state.merchantOrder = state.players
    .map((p, idx) => ({ p, idx }))
    .filter(({ idx }) => idx !== state.sheriffIndex)
    .map(({ idx }) => idx);
  state.merchantTurnPointer = 0;
  for (const p of state.players) {
    drawToSix(state, p);
    state.bagByPlayer[p.id] = [];
    state.declaredGoodByPlayer[p.id] = undefined;
    state.declaredBagCountByPlayer[p.id] = undefined;
    state.marketDoneByPlayer[p.id] = false;
    state.bribeByPlayer[p.id] = 0;
    state.bribeDoneByPlayer[p.id] = false;
  }
  state.draftBagByPlayer = {};
  state.merchantIdsPendingSheriff = [];
  state.marketStagingPublic = undefined;
  state.phase = 'merchant_market';
  state.marketDrawReveal = undefined;
  state.lastRoundSummary = `รอบใหม่เริ่มแล้ว — Sheriff คือ ${state.players[state.sheriffIndex].name}`;
  state.lastInspection = undefined;
  state.winnerIds = undefined;
  if (!state.sheriffTurnsTaken[sheriffId]) state.sheriffTurnsTaken[sheriffId] = 0;
  pushPublicLog(state, `รอบใหม่: Sheriff คือ ${state.players[state.sheriffIndex].name}`);
}

function targetSheriffTurns(playerCount: number): number {
  return playerCount === 3 ? 2 : 1;
}

function maybeFinishGame(state: SheriffState): boolean {
  const need = targetSheriffTurns(state.players.length);
  const allDone = state.players.every((p) => (state.sheriffTurnsTaken[p.id] ?? 0) >= need);
  if (!allDone) return false;
  state.phase = 'game_over';
  return true;
}

function computeScores(state: SheriffState): Array<{
  id: string;
  coins: number;
  goodsValue: number;
  bonus: number;
  total: number;
}> {
  const base = state.players.map((p) => ({
    id: p.id,
    coins: p.coins,
    goodsValue: stallGoodsGoldAtGameEnd(p.stall, GOODS_META),
    bonus: 0,
    total: 0,
  }));

  for (const good of LEGAL_GOODS) {
    const counts = state.players.map((p) => ({
      id: p.id,
      count: kingQueenUnitsForLegalGood(p.stall, good),
    }));
    counts.sort((a, b) => b.count - a.count);
    if ((counts[0]?.count ?? 0) > 0) {
      const topCount = counts[0].count;
      const top = counts.filter((c) => c.count === topCount);
      const kingSplit = Math.floor(KING_QUEEN_BONUS[good].king / top.length);
      for (const t of top) {
        const s = base.find((x) => x.id === t.id);
        if (s) s.bonus += kingSplit;
      }
      const nextCount = counts.find((c) => c.count < topCount)?.count ?? 0;
      if (nextCount > 0) {
        const queens = counts.filter((c) => c.count === nextCount);
        const queenSplit = Math.floor(KING_QUEEN_BONUS[good].queen / queens.length);
        for (const q of queens) {
          const s = base.find((x) => x.id === q.id);
          if (s) s.bonus += queenSplit;
        }
      }
    }
  }
  for (const row of base) {
    row.total = row.coins + row.goodsValue + row.bonus;
  }
  return base;
}

/** แคชต่อ reference ของ state — broadcast getPlayerView หลายครั้งต่อรอบไม่ต้องคำนวณซ้ำ */
const gameOverViewCache = new WeakMap<
  SheriffState,
  {
    winners: NonNullable<SheriffPlayerView['winners']>;
    scoreBreakdown: NonNullable<SheriffPlayerView['scoreBreakdown']>;
  }
>();

function getGameOverDerived(state: SheriffState): {
  winners: NonNullable<SheriffPlayerView['winners']>;
  scoreBreakdown: NonNullable<SheriffPlayerView['scoreBreakdown']>;
} {
  let cached = gameOverViewCache.get(state);
  if (cached) return cached;
  const scores = computeScores(state).sort((a, b) => b.total - a.total);
  const winners = scores.map((s) => ({
    id: s.id,
    name: state.players.find((p) => p.id === s.id)?.name ?? '?',
    score: s.total,
  }));
  const scoreBreakdown = scores.map((s) => {
    const pl = state.players.find((p) => p.id === s.id);
    return {
      id: s.id,
      name: pl?.name ?? '?',
      coins: s.coins,
      goodsValue: s.goodsValue,
      bonus: s.bonus,
      total: s.total,
      goodsValueDetail: pl ? goodsValueScoreExplanationTh(pl.stall, GOODS_META) : '',
      bonusDetail: kingQueenBonusExplanationTh(state, s.id, s.bonus),
    };
  });
  cached = { winners, scoreBreakdown };
  gameOverViewCache.set(state, cached);
  return cached;
}

export const sheriffGame: GameDefinition<SheriffState, SheriffAction> = {
  id: 'sheriff-of-nottingham',
  name: 'Sheriff of Nottingham',
  description: 'เกมโกหก เจรจา และลักลอบค้าของเถื่อน เอาตัวรอดจาก Sheriff แล้วทำกำไรให้มากที่สุด',
  minPlayers: 3,
  maxPlayers: 5,
  thumbnail: '/games/sheriff-of-nottingham/thumbnail.png',

  setup(players: Player[], options?: unknown): SheriffState {
    const { includeSpecialCards } = parseSheriffLobbyOptions(options);
    const deck = buildDeck(players.length, includeSpecialCards);
    const sheriffIndex = Math.floor(Math.random() * players.length);
    const gamePlayers: SheriffPlayerState[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: [],
      stall: [],
      coins: 50,
    }));

    const state: SheriffState = {
      phase: 'merchant_market',
      players: gamePlayers,
      drawPile: deck,
      discardPiles: [[], []],
      sheriffIndex,
      merchantOrder: [],
      merchantTurnPointer: 0,
      bagByPlayer: {},
      declaredGoodByPlayer: {},
      declaredBagCountByPlayer: {},
      marketDoneByPlayer: {},
      bribeByPlayer: {},
      bribeDoneByPlayer: {},
      publicLog: [],
      roundsCompleted: 0,
      sheriffTurnsTaken: Object.fromEntries(gamePlayers.map((p) => [p.id, 0])),
      draftBagByPlayer: {},
      merchantIdsPendingSheriff: [],
    };
    state.merchantOrder = state.players.map((_, idx) => idx).filter((idx) => idx !== sheriffIndex);
    state.merchantTurnPointer = 0;
    state.phase = 'merchant_market';
    for (const p of state.players) {
      drawToSix(state, p);
      state.bagByPlayer[p.id] = [];
      state.declaredGoodByPlayer[p.id] = undefined;
      state.declaredBagCountByPlayer[p.id] = undefined;
      state.marketDoneByPlayer[p.id] = false;
      state.bribeByPlayer[p.id] = 0;
      state.bribeDoneByPlayer[p.id] = false;
    }
    state.lastRoundSummary = `เริ่มเกมแล้ว — Sheriff คนแรกคือ ${state.players[sheriffIndex].name}`;
    pushPublicLog(state, state.lastRoundSummary);
    return state;
  },

  onAction(state: SheriffState, playerId: string, action: SheriffAction): SheriffState {
    const s: SheriffState = {
      ...state,
      players: state.players.map((p) => ({ ...p, hand: [...p.hand], stall: [...p.stall] })),
      drawPile: [...state.drawPile],
      discardPiles: [[...state.discardPiles[0]], [...state.discardPiles[1]]],
      bagByPlayer: Object.fromEntries(
        Object.entries(state.bagByPlayer).map(([k, v]) => [k, [...v]]),
      ),
      declaredGoodByPlayer: { ...state.declaredGoodByPlayer },
      declaredBagCountByPlayer: { ...state.declaredBagCountByPlayer },
      marketDoneByPlayer: { ...state.marketDoneByPlayer },
      bribeByPlayer: { ...state.bribeByPlayer },
      bribeDoneByPlayer: { ...state.bribeDoneByPlayer },
      publicLog: [...state.publicLog],
      sheriffTurnsTaken: { ...state.sheriffTurnsTaken },
      marketRevealSeq: state.marketRevealSeq ?? 0,
      marketDrawReveal: state.marketDrawReveal ? { ...state.marketDrawReveal } : undefined,
      draftBagByPlayer: Object.fromEntries(
        Object.entries(state.draftBagByPlayer ?? {}).map(([k, v]) => [
          k,
          v
            ? {
                cardIds: [...v.cardIds],
                declaredGood: v.declaredGood,
                declaredCount: v.declaredCount,
              }
            : undefined,
        ]),
      ),
      merchantIdsPendingSheriff: [...(state.merchantIdsPendingSheriff ?? [])],
      marketStagingPublic: state.marketStagingPublic
        ? {
            ...state.marketStagingPublic,
            cardTypes: [...state.marketStagingPublic.cardTypes],
          }
        : undefined,
    };
    if (s.phase === 'game_over') return s;

    const sheriff = s.players[s.sheriffIndex];

    if (action.type === 'market_stage_preview') {
      if (s.phase !== 'merchant_market') {
        s.marketStagingPublic = undefined;
        return s;
      }
      const ami = s.merchantOrder[s.merchantTurnPointer];
      const am = ami !== undefined ? s.players[ami] : undefined;
      if (!am || playerId !== am.id) return s;

      const { discardPileIndex, cardIds } = action;
      if (discardPileIndex !== null && discardPileIndex !== 0 && discardPileIndex !== 1) return s;

      if (cardIds.length === 0 || discardPileIndex === null) {
        s.marketStagingPublic = undefined;
        return s;
      }
      if (cardIds.length > 5) return s;
      const uniq = new Set(cardIds);
      if (uniq.size !== cardIds.length) return s;
      const resolved = cardIds
        .map((id) => am.hand.find((c) => c.id === id))
        .filter(Boolean) as SheriffCard[];
      if (resolved.length !== cardIds.length) return s;

      s.marketStagingPublic = {
        merchantId: am.id,
        merchantName: am.name,
        discardPileIndex,
        cardTypes: resolved.map((c) => c.type),
      };
      return s;
    }

    if (action.type === 'bag_draft') {
      if (s.phase !== 'merchant_market' && s.phase !== 'parallel_bagging') return s;
      const p = s.players.find((x) => x.id === playerId);
      if (!p || playerId === sheriff.id) return s;
      if (!s.merchantOrder.some((mi) => s.players[mi].id === playerId)) return s;
      if (!s.marketDoneByPlayer[playerId]) return s;
      if ((s.bagByPlayer[playerId] ?? []).length > 0) return s;
      if (legalBagSelection(p.hand, action.cardIds) === null) return s;
      if (!LEGAL_GOODS.includes(action.declaredGood)) return s;
      const declaredCount = Math.floor(Number(action.declaredCount));
      if (!Number.isFinite(declaredCount) || declaredCount < 1 || declaredCount > 5) return s;
      s.marketDrawReveal = undefined;
      s.draftBagByPlayer = {
        ...s.draftBagByPlayer,
        [playerId]: { cardIds: action.cardIds, declaredGood: action.declaredGood, declaredCount },
      };
      return s;
    }

    if (action.type === 'submit_bag') {
      if (s.phase !== 'parallel_bagging') return s;
      const p = s.players.find((x) => x.id === playerId);
      if (!p || playerId === sheriff.id) return s;
      if (!s.merchantOrder.some((mi) => s.players[mi].id === playerId)) return s;
      if ((s.bagByPlayer[playerId] ?? []).length > 0) return s;
      const draft = s.draftBagByPlayer[playerId];
      if (!draft) return s;
      s.marketDrawReveal = undefined;
      const bag = legalBagSelection(p.hand, draft.cardIds);
      if (bag === null || bag.length < 1) return s;
      p.hand = p.hand.filter((c) => !draft.cardIds.includes(c.id));
      s.bagByPlayer[playerId] = bag;
      s.declaredGoodByPlayer[playerId] = draft.declaredGood;
      s.declaredBagCountByPlayer[playerId] = draft.declaredCount;
      s.bribeByPlayer[playerId] = 0;
      s.bribeDoneByPlayer[playerId] = false;
      delete s.draftBagByPlayer[playerId];
      const allBagsIn = s.merchantOrder.every(
        (mi) => (s.bagByPlayer[s.players[mi].id] ?? []).length > 0,
      );
      if (allBagsIn) {
        s.phase = 'sheriff_judging';
        s.merchantIdsPendingSheriff = s.merchantOrder.map((mi) => s.players[mi].id);
        s.lastRoundSummary = 'ทุกคนส่งถุงแล้ว — Sheriff เลือกตรวจหรือผ่านแต่ละคน';
        pushPublicLog(s, 'ทุกพ่อค้าส่งถุงแล้ว — เข้าสู่การเจรจาสินบนกับ Sheriff');
      } else {
        s.lastRoundSummary = `${p.name} ส่งถุงแล้ว — รอพ่อค้าคนอื่นยืนยัน`;
        pushPublicLog(
          s,
          `${p.name} ประกาศถุง ${draft.declaredCount} ใบ ว่าเป็น ${draft.declaredGood.toUpperCase()}`,
        );
      }
      return s;
    }

    const activeMerchantIndex = s.merchantOrder[s.merchantTurnPointer];
    const activeMerchant =
      activeMerchantIndex !== undefined ? s.players[activeMerchantIndex] : undefined;

    if (action.type === 'merchant_market') {
      if (s.phase !== 'merchant_market' || !activeMerchant || playerId !== activeMerchant.id)
        return s;
      if (s.marketDoneByPlayer[playerId]) return s;
      const discardSet = new Set(action.discardCardIds);
      if (discardSet.size !== action.discardCardIds.length) return s;
      const discardCards = action.discardCardIds
        .map((id) => activeMerchant.hand.find((c) => c.id === id))
        .filter(Boolean) as SheriffCard[];
      if (discardCards.length !== action.discardCardIds.length) return s;
      const n = discardCards.length;
      if (n < 1 || n > 5) return s;

      const { drawSource, discardPileIndex } = action;
      if (drawSource !== 'deck' && drawSource !== 'left' && drawSource !== 'right') return s;
      // ห้ามจั่วจากกองทิ้งที่เพิ่งทิ้งลงไป (จั่วได้แค่กองจั่วหรือกองทิ้งอีกฝั่ง)
      if (discardPileIndex === 0 && drawSource === 'left') return s;
      if (discardPileIndex === 1 && drawSource === 'right') return s;

      const deckAvail = s.drawPile.length;
      const leftAvail = s.discardPiles[0].length;
      const rightAvail = s.discardPiles[1].length;
      if (drawSource === 'deck' && deckAvail < n) return s;
      if (drawSource === 'left' && leftAvail < n) return s;
      if (drawSource === 'right' && rightAvail < n) return s;

      activeMerchant.hand = activeMerchant.hand.filter((c) => !discardSet.has(c.id));
      s.discardPiles[discardPileIndex].push(...discardCards);

      const drawn: SheriffCard[] = [];
      for (let i = 0; i < n; i++) {
        let card: SheriffCard | undefined;
        if (drawSource === 'left') card = s.discardPiles[0].pop();
        else if (drawSource === 'right') card = s.discardPiles[1].pop();
        else card = drawOne(s);
        if (!card) return s;
        drawn.push(card);
        activeMerchant.hand.push(card);
      }
      drawToSix(s, activeMerchant);
      s.marketDoneByPlayer[playerId] = true;
      const allMarketDone = s.merchantOrder.every((mi) => s.marketDoneByPlayer[s.players[mi].id]);
      if (allMarketDone) {
        s.phase = 'parallel_bagging';
        s.merchantTurnPointer = 0;
      } else {
        let nextI = 0;
        for (let i = 0; i < s.merchantOrder.length; i += 1) {
          const mid = s.merchantOrder[i];
          if (!s.marketDoneByPlayer[s.players[mid].id]) {
            nextI = i;
            break;
          }
        }
        s.merchantTurnPointer = nextI;
        s.phase = 'merchant_market';
      }
      s.marketRevealSeq = (s.marketRevealSeq ?? 0) + 1;
      s.marketDrawReveal = {
        revealId: s.marketRevealSeq,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.name,
        fromPile: drawSource === 'deck' ? 'deck' : drawSource,
        cardTypes: drawn.map((c) => c.type),
      };
      s.lastRoundSummary = `${activeMerchant.name} จัดตลาดและเตรียมถุงแล้ว`;
      pushPublicLog(
        s,
        `${activeMerchant.name} ทิ้ง ${discardCards.length} ใบลงกอง${discardPileIndex === 0 ? 'ซ้าย' : 'ขวา'}`,
      );
      s.marketStagingPublic = undefined;
      return s;
    }

    if (action.type === 'merchant_market_pass') {
      if (s.phase !== 'merchant_market' || !activeMerchant || playerId !== activeMerchant.id)
        return s;
      if (s.marketDoneByPlayer[playerId]) return s;
      s.marketStagingPublic = undefined;
      s.marketRevealSeq = (s.marketRevealSeq ?? 0) + 1;
      s.marketDrawReveal = {
        revealId: s.marketRevealSeq,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.name,
        fromPile: 'pass',
        cardTypes: [],
      };
      s.marketDoneByPlayer[playerId] = true;
      const allMarketDone = s.merchantOrder.every((mi) => s.marketDoneByPlayer[s.players[mi].id]);
      if (allMarketDone) {
        s.phase = 'parallel_bagging';
        s.merchantTurnPointer = 0;
      } else {
        let nextI = 0;
        for (let i = 0; i < s.merchantOrder.length; i += 1) {
          const mid = s.merchantOrder[i];
          if (!s.marketDoneByPlayer[s.players[mid].id]) {
            nextI = i;
            break;
          }
        }
        s.merchantTurnPointer = nextI;
        s.phase = 'merchant_market';
      }
      s.lastRoundSummary = `${activeMerchant.name} ผ่านขั้นตอนตลาด (ไม่ทิ้งการ์ด)`;
      pushPublicLog(s, `${activeMerchant.name} ผ่านขั้นตอนตลาด — ไม่ทิ้งการ์ด`);
      return s;
    }

    if (action.type === 'set_bribe') {
      if (s.phase !== 'sheriff_judging') return s;
      if (playerId === sheriff.id) return s;
      if (!(s.merchantIdsPendingSheriff ?? []).includes(playerId)) return s;
      if (!Number.isFinite(action.amount)) return s;
      const merchant = s.players.find((x) => x.id === playerId);
      if (!merchant) return s;
      const next = Math.max(0, Math.floor(action.amount));
      s.bribeByPlayer[playerId] = Math.min(next, merchant.coins);
      return s;
    }

    if (action.type === 'sheriff_decide') {
      if (s.phase !== 'sheriff_judging' || playerId !== sheriff.id) return s;
      const targetId = action.targetMerchantId;
      if (!(s.merchantIdsPendingSheriff ?? []).includes(targetId)) return s;
      const activeMerchant = s.players.find((p) => p.id === targetId);
      if (!activeMerchant) return s;
      const bag = s.bagByPlayer[activeMerchant.id] ?? [];
      const declared = s.declaredGoodByPlayer[activeMerchant.id];
      if (!bag.length || !declared) return s;

      let sheriffDelta = 0;
      let merchantDelta = 0;
      const legalInBag: SheriffCard[] = [];
      const confiscated: SheriffCard[] = [];
      const bribeOffered = s.bribeByPlayer[activeMerchant.id] ?? 0;
      const declaredGood = declared;
      const declaredBagCount = s.declaredBagCountByPlayer[activeMerchant.id] ?? -1;
      const countMatch = declaredBagCount === bag.length;

      if (!action.inspect) {
        const bribePaid = transferCoins(activeMerchant, sheriff, bribeOffered);
        sheriffDelta += bribePaid;
        merchantDelta -= bribePaid;
        legalInBag.push(...bag);
      } else {
        for (const card of bag) {
          const truthful = countMatch && isTruthfulDeclaration(card, declaredGood);
          if (truthful) {
            const pay = GOODS_META[card.type].penalty;
            const paid = transferCoins(sheriff, activeMerchant, pay);
            sheriffDelta -= paid;
            merchantDelta += paid;
            legalInBag.push(card);
          } else {
            const pay = GOODS_META[card.type].penalty;
            const paid = transferCoins(activeMerchant, sheriff, pay);
            sheriffDelta += paid;
            merchantDelta -= paid;
            confiscated.push(card);
          }
        }
      }

      activeMerchant.stall.push(...legalInBag);
      s.discardPiles[0].push(...confiscated);
      s.bagByPlayer[activeMerchant.id] = [];
      s.bribeByPlayer[activeMerchant.id] = 0;
      s.bribeDoneByPlayer[activeMerchant.id] = false;
      s.lastInspection = {
        id: `inspect-${nextInspectionId++}`,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.name,
        sheriffId: sheriff.id,
        sheriffName: sheriff.name,
        inspected: action.inspect,
        confiscatedCount: confiscated.length,
        passedCount: legalInBag.length,
        sheriffDelta,
        merchantDelta,
        passedCards: legalInBag.map((x) => x.type),
        confiscatedCards: confiscated.map((x) => x.type),
        declaredGood,
        declaredBagCount,
        actualBagCount: bag.length,
        bribePaid: !action.inspect ? bribeOffered : 0,
      };
      if (action.inspect) {
        pushPublicLog(
          s,
          `${sheriff.name} ตรวจถุง ${activeMerchant.name}: ผ่าน ${legalInBag.length} / ยึด ${confiscated.length}`,
        );
      } else {
        pushPublicLog(s, `${sheriff.name} ปล่อยผ่านถุงของ ${activeMerchant.name}`);
      }

      drawToSix(s, activeMerchant);

      s.merchantIdsPendingSheriff = (s.merchantIdsPendingSheriff ?? []).filter(
        (id) => id !== targetId,
      );
      if (s.merchantIdsPendingSheriff.length === 0) {
        s.roundsCompleted += 1;
        if (maybeFinishGame(s)) {
          const scores = computeScores(s).sort((a, b) => b.total - a.total);
          const top = scores[0]?.total ?? 0;
          s.winnerIds = scores.filter((x) => x.total === top).map((x) => x.id);
          s.lastRoundSummary = 'จบเกมแล้ว กำลังสรุปคะแนน';
          return s;
        }
        /** rotateSheriff ล้าง lastInspection — เก็บ snapshot ให้ client โชว์โมดัลของในถุง (รวมกรณีปล่อยผ่านคนสุดท้าย) */
        const inspectionSnapshot = s.lastInspection;
        rotateSheriff(s);
        s.lastInspection = inspectionSnapshot;
      }
      return s;
    }

    return s;
  },

  getPlayerView(state: SheriffState, playerId: string): SheriffPlayerView {
    const me = state.players.find((p) => p.id === playerId);
    if (!me) throw new Error(`Player ${playerId} not found`);
    const sheriff = state.players[state.sheriffIndex];
    const marketMerchantIndex = state.merchantOrder[state.merchantTurnPointer];
    const marketMerchant =
      marketMerchantIndex !== undefined ? state.players[marketMerchantIndex] : undefined;
    let activeMerchantId: string | undefined;
    let activeMerchantName: string | undefined;
    if (state.phase === 'merchant_market') {
      activeMerchantId = marketMerchant?.id;
      activeMerchantName = marketMerchant?.name;
    }
    const isMerchantRole = state.merchantOrder.some((mi) => state.players[mi].id === playerId);
    const canDraftBag =
      (state.phase === 'merchant_market' || state.phase === 'parallel_bagging') &&
      playerId !== sheriff.id &&
      isMerchantRole &&
      !!state.marketDoneByPlayer[playerId] &&
      (state.bagByPlayer[playerId] ?? []).length === 0;
    const canSubmitBagNow =
      state.phase === 'parallel_bagging' &&
      playerId !== sheriff.id &&
      state.merchantOrder.some((mi) => state.players[mi].id === playerId) &&
      (state.bagByPlayer[playerId] ?? []).length === 0 &&
      !!state.draftBagByPlayer[playerId];
    const pendingSheriff = state.merchantIdsPendingSheriff ?? [];
    const canSetBribeFreely =
      state.phase === 'sheriff_judging' &&
      playerId !== sheriff.id &&
      pendingSheriff.includes(playerId);
    const merchantBribeOffers =
      state.phase === 'sheriff_judging'
        ? state.merchantOrder.map((mi) => {
            const pl = state.players[mi];
            return {
              playerId: pl.id,
              name: pl.name,
              amount: state.bribeByPlayer[pl.id] ?? 0,
            };
          })
        : undefined;
    const sheriffMerchantPanels =
      state.phase === 'sheriff_judging'
        ? state.merchantOrder.map((mi) => {
            const pl = state.players[mi];
            const pid = pl.id;
            const dg = state.declaredGoodByPlayer[pid];
            const dbc = state.declaredBagCountByPlayer[pid];
            const bagN = (state.bagByPlayer[pid] ?? []).length;
            return {
              playerId: pid,
              name: pl.name,
              declaredGood: (dg ?? 'apple') as SheriffLegalGood,
              declaredBagCount: dbc ?? bagN,
              bribe: state.bribeByPlayer[pid] ?? 0,
              pending: pendingSheriff.includes(pid),
            };
          })
        : undefined;
    const parallelBagMerchantTotal =
      state.phase === 'parallel_bagging' ? state.merchantOrder.length : undefined;
    const parallelBagSubmittedCount =
      state.phase === 'parallel_bagging'
        ? state.merchantOrder.filter(
            (mi) => (state.bagByPlayer[state.players[mi].id] ?? []).length > 0,
          ).length
        : undefined;
    const gameOverDerived = state.phase === 'game_over' ? getGameOverDerived(state) : undefined;
    return {
      phase: state.phase,
      me: { id: me.id, name: me.name, coins: me.coins },
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        handCount: p.hand.length,
        stallCount: p.stall.length,
        stallGroups: stallGroupsFromStall(p.stall),
      })),
      myHand: [...me.hand],
      myStall: [...me.stall],
      sheriffId: sheriff.id,
      sheriffName: sheriff.name,
      activeMerchantId,
      activeMerchantName,
      myBagCount: (state.bagByPlayer[playerId] ?? []).length,
      myBag: [...(state.bagByPlayer[playerId] ?? [])],
      myDeclaredGood:
        state.phase === 'sheriff_judging' &&
        playerId !== sheriff.id &&
        isMerchantRole &&
        !pendingSheriff.includes(playerId)
          ? undefined
          : state.declaredGoodByPlayer[playerId],
      myDeclaredBagCount:
        state.phase === 'sheriff_judging' &&
        playerId !== sheriff.id &&
        isMerchantRole &&
        !pendingSheriff.includes(playerId)
          ? undefined
          : state.declaredBagCountByPlayer[playerId],
      canMarketNow: state.phase === 'merchant_market' && marketMerchant?.id === playerId,
      canBagNow: canDraftBag || canSubmitBagNow || canSetBribeFreely,
      canDraftBag,
      canSubmitBagNow,
      parallelBagSubmittedCount,
      parallelBagMerchantTotal,
      myBagDraft: state.draftBagByPlayer[playerId],
      merchantBribeOffers,
      sheriffMerchantPanels,
      canSetBribeFreely,
      canBribeNow: canSetBribeFreely,
      canInspectNow:
        state.phase === 'sheriff_judging' && sheriff.id === playerId && pendingSheriff.length > 0,
      myCurrentBribe: state.bribeByPlayer[playerId] ?? 0,
      legalGoodsForDeclaration: LEGAL_GOODS,
      discardTopLeft: state.discardPiles[0][state.discardPiles[0].length - 1]?.type,
      discardTopRight: state.discardPiles[1][state.discardPiles[1].length - 1]?.type,
      discardLeftPreview: state.discardPiles[0]
        .slice(-5)
        .reverse()
        .map((c) => c.type),
      discardRightPreview: state.discardPiles[1]
        .slice(-5)
        .reverse()
        .map((c) => c.type),
      discardLeftCount: state.discardPiles[0].length,
      discardRightCount: state.discardPiles[1].length,
      drawPileCount: state.drawPile.length,
      lastRoundSummary: state.lastRoundSummary,
      lastInspection: state.lastInspection,
      publicLog: state.publicLog.slice(-12).reverse(),
      winners: gameOverDerived?.winners,
      scoreBreakdown: gameOverDerived?.scoreBreakdown,
      marketDrawReveal: (() => {
        const r = state.marketDrawReveal;
        if (!r) return undefined;
        if (r.fromPile === 'deck' && r.merchantId !== playerId) return undefined;
        return { ...r, cardTypes: [...r.cardTypes] };
      })(),
      marketStagingPublic: state.marketStagingPublic
        ? {
            ...state.marketStagingPublic,
            cardTypes: [...state.marketStagingPublic.cardTypes],
          }
        : undefined,
    };
  },

  isGameOver(state: SheriffState): GameResult | null {
    if (state.phase !== 'game_over' || !state.winnerIds?.length) return null;
    return {
      winners: state.winnerIds,
      reason: 'จบรอบ Sheriff ครบตามกติกาแล้ว — คะแนนรวมสูงสุดชนะ',
    };
  },
};
