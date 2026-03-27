import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  SheriffAction,
  SheriffCard,
  SheriffGoodType,
  SheriffLegalGood,
  SheriffPlayerState,
  SheriffPlayerView,
  SheriffState,
} from 'shared';

const LEGAL_GOODS: SheriffLegalGood[] = ['apple', 'cheese', 'bread', 'chicken'];

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
};

const KING_QUEEN_BONUS: Record<SheriffLegalGood, { king: number; queen: number }> = {
  apple: { king: 20, queen: 10 },
  cheese: { king: 15, queen: 10 },
  bread: { king: 15, queen: 10 },
  chicken: { king: 10, queen: 5 },
};

const BASE_DECK_COUNTS: Record<SheriffGoodType, number> = {
  apple: 48,
  cheese: 36,
  bread: 36,
  chicken: 24,
  pepper: 22,
  mead: 21,
  silk: 12,
  crossbow: 5,
  feast_plate: 2,
};

let nextCardId = 1;

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

function buildDeck(): SheriffCard[] {
  const cards: SheriffCard[] = [];
  for (const [type, count] of Object.entries(BASE_DECK_COUNTS) as [SheriffGoodType, number][]) {
    for (let i = 0; i < count; i += 1) cards.push(newCard(type));
  }
  return shuffle(cards);
}

function drawToSix(state: SheriffState, player: SheriffPlayerState): void {
  while (player.hand.length < 6 && state.drawPile.length > 0) {
    const card = state.drawPile.pop();
    if (!card) break;
    player.hand.push(card);
  }
}

function legalBagSelection(hand: SheriffCard[], cardIds: string[]): SheriffCard[] | null {
  if (cardIds.length < 1 || cardIds.length > 5) return null;
  const uniq = new Set(cardIds);
  if (uniq.size !== cardIds.length) return null;
  const bag = cardIds.map((id) => hand.find((c) => c.id === id)).filter(Boolean) as SheriffCard[];
  if (bag.length !== cardIds.length) return null;
  return bag;
}

function isTruthfulDeclaration(card: SheriffCard, declared: SheriffLegalGood): boolean {
  if (card.type === declared) return true;
  // Feast Plate can represent any basic legal good.
  return card.type === 'feast_plate' && LEGAL_GOODS.includes(declared);
}

function rotateSheriff(state: SheriffState): void {
  const n = state.players.length;
  const currentSheriff = state.players[state.sheriffIndex];
  state.sheriffTurnsTaken[currentSheriff.id] = (state.sheriffTurnsTaken[currentSheriff.id] ?? 0) + 1;
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
    state.marketDoneByPlayer[p.id] = false;
  }
  state.phase = 'merchant_market';
  state.lastRoundSummary = `รอบใหม่เริ่มแล้ว — Sheriff คือ ${state.players[state.sheriffIndex].name}`;
  state.lastInspection = undefined;
  state.winnerIds = undefined;
  if (!state.sheriffTurnsTaken[sheriffId]) state.sheriffTurnsTaken[sheriffId] = 0;
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
    goodsValue: p.stall.reduce((sum, c) => sum + GOODS_META[c.type].value, 0),
    bonus: 0,
    total: 0,
  }));

  for (const good of LEGAL_GOODS) {
    const counts = state.players.map((p) => ({
      id: p.id,
      count: p.stall.filter((c) => c.type === good || c.type === 'feast_plate').length,
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

export const sheriffGame: GameDefinition<SheriffState, SheriffAction> = {
  id: 'sheriff-of-nottingham',
  name: 'Sheriff of Nottingham',
  description: 'เกมโกหก เจรจา และลักลอบค้าของเถื่อน เอาตัวรอดจาก Sheriff แล้วทำกำไรให้มากที่สุด',
  minPlayers: 3,
  maxPlayers: 5,
  thumbnail: '/games/sheriff-of-nottingham/thumbnail.png',

  setup(players: Player[]): SheriffState {
    const deck = buildDeck();
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
      marketDoneByPlayer: {},
      roundsCompleted: 0,
      sheriffTurnsTaken: Object.fromEntries(gamePlayers.map((p) => [p.id, 0])),
    };
    state.merchantOrder = state.players
      .map((_, idx) => idx)
      .filter((idx) => idx !== sheriffIndex);
    state.merchantTurnPointer = 0;
    state.phase = 'merchant_market';
    for (const p of state.players) {
      drawToSix(state, p);
      state.bagByPlayer[p.id] = [];
      state.declaredGoodByPlayer[p.id] = undefined;
      state.marketDoneByPlayer[p.id] = false;
    }
    state.lastRoundSummary = `เริ่มเกมแล้ว — Sheriff คนแรกคือ ${state.players[sheriffIndex].name}`;
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
      marketDoneByPlayer: { ...state.marketDoneByPlayer },
      sheriffTurnsTaken: { ...state.sheriffTurnsTaken },
    };
    if (s.phase === 'game_over') return s;

    const sheriff = s.players[s.sheriffIndex];
    const activeMerchantIndex = s.merchantOrder[s.merchantTurnPointer];
    const activeMerchant = activeMerchantIndex !== undefined ? s.players[activeMerchantIndex] : undefined;
    if (!activeMerchant) return s;

    if (action.type === 'merchant_market') {
      if (s.phase !== 'merchant_market' || playerId !== activeMerchant.id) return s;
      if (s.marketDoneByPlayer[playerId]) return s;
      const discardSet = new Set(action.discardCardIds);
      if (discardSet.size !== action.discardCardIds.length) return s;
      const discardCards = action.discardCardIds
        .map((id) => activeMerchant.hand.find((c) => c.id === id))
        .filter(Boolean) as SheriffCard[];
      if (discardCards.length !== action.discardCardIds.length) return s;
      if (action.drawFrom.length !== discardCards.length) return s;
      if (!action.drawFrom.every((x) => x === 'deck' || x === 'left' || x === 'right')) return s;

      const leftCount = s.discardPiles[0].length;
      const rightCount = s.discardPiles[1].length;
      const needLeft = action.drawFrom.filter((x) => x === 'left').length;
      const needRight = action.drawFrom.filter((x) => x === 'right').length;
      const needDeck = action.drawFrom.filter((x) => x === 'deck').length;
      if (needLeft > leftCount || needRight > rightCount || needDeck > s.drawPile.length) return s;

      activeMerchant.hand = activeMerchant.hand.filter((c) => !discardSet.has(c.id));
      s.discardPiles[action.discardPileIndex].push(...discardCards);
      for (const source of action.drawFrom) {
        let card: SheriffCard | undefined;
        if (source === 'left') card = s.discardPiles[0].pop();
        else if (source === 'right') card = s.discardPiles[1].pop();
        else card = s.drawPile.pop();
        if (!card) return s;
        activeMerchant.hand.push(card);
      }
      drawToSix(s, activeMerchant);
      s.marketDoneByPlayer[playerId] = true;
      s.phase = 'merchant_bagging';
      s.lastRoundSummary = `${activeMerchant.name} จัดตลาดและเตรียมถุงแล้ว`;
      return s;
    }

    if (action.type === 'set_bag') {
      if (s.phase !== 'merchant_bagging' || playerId !== activeMerchant.id) return s;
      if (!s.marketDoneByPlayer[playerId]) return s;
      const bag = legalBagSelection(activeMerchant.hand, action.cardIds);
      if (!bag) return s;
      const newHand = activeMerchant.hand.filter((c) => !action.cardIds.includes(c.id));
      activeMerchant.hand = newHand;
      s.bagByPlayer[playerId] = bag;
      s.declaredGoodByPlayer[playerId] = action.declaredGood;
      s.phase = 'sheriff_inspection';
      return s;
    }

    if (action.type === 'sheriff_decide') {
      if (s.phase !== 'sheriff_inspection' || playerId !== sheriff.id) return s;
      const bag = s.bagByPlayer[activeMerchant.id] ?? [];
      const declared = s.declaredGoodByPlayer[activeMerchant.id];
      if (!bag.length || !declared) return s;

      let sheriffDelta = 0;
      let merchantDelta = 0;
      const legalInBag: SheriffCard[] = [];
      const confiscated: SheriffCard[] = [];

      if (!action.inspect) {
        legalInBag.push(...bag);
      } else {
        for (const card of bag) {
          const truthful = isTruthfulDeclaration(card, declared);
          if (truthful) {
            const pay = GOODS_META[card.type].penalty;
            sheriffDelta -= pay;
            merchantDelta += pay;
            legalInBag.push(card);
          } else {
            const pay = GOODS_META[card.type].penalty;
            sheriffDelta += pay;
            merchantDelta -= pay;
            confiscated.push(card);
          }
        }
      }

      sheriff.coins += sheriffDelta;
      activeMerchant.coins += merchantDelta;
      activeMerchant.stall.push(...legalInBag);
      s.discardPiles[0].push(...confiscated);
      s.bagByPlayer[activeMerchant.id] = [];
      s.declaredGoodByPlayer[activeMerchant.id] = undefined;
      s.marketDoneByPlayer[activeMerchant.id] = false;
      s.lastInspection = {
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.name,
        sheriffId: sheriff.id,
        sheriffName: sheriff.name,
        inspected: action.inspect,
        confiscatedCount: confiscated.length,
        passedCount: legalInBag.length,
        sheriffDelta,
        merchantDelta,
      };

      drawToSix(s, activeMerchant);

      s.merchantTurnPointer += 1;
      if (s.merchantTurnPointer >= s.merchantOrder.length) {
        s.roundsCompleted += 1;
        if (maybeFinishGame(s)) {
          const scores = computeScores(s).sort((a, b) => b.total - a.total);
          const top = scores[0]?.total ?? 0;
          s.winnerIds = scores.filter((x) => x.total === top).map((x) => x.id);
          s.lastRoundSummary = 'จบเกมแล้ว กำลังสรุปคะแนน';
          return s;
        }
        rotateSheriff(s);
      } else {
        s.phase = 'merchant_market';
      }
      return s;
    }

    return s;
  },

  getPlayerView(state: SheriffState, playerId: string): SheriffPlayerView {
    const me = state.players.find((p) => p.id === playerId);
    if (!me) throw new Error(`Player ${playerId} not found`);
    const sheriff = state.players[state.sheriffIndex];
    const activeMerchantIndex = state.merchantOrder[state.merchantTurnPointer];
    const activeMerchant = activeMerchantIndex !== undefined ? state.players[activeMerchantIndex] : undefined;
    const scores = state.phase === 'game_over' ? computeScores(state).sort((a, b) => b.total - a.total) : [];
    return {
      phase: state.phase,
      me: { id: me.id, name: me.name, coins: me.coins },
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        handCount: p.hand.length,
        stallCount: p.stall.length,
      })),
      myHand: [...me.hand],
      myStall: [...me.stall],
      sheriffId: sheriff.id,
      sheriffName: sheriff.name,
      activeMerchantId: activeMerchant?.id,
      activeMerchantName: activeMerchant?.name,
      myBagCount: (state.bagByPlayer[playerId] ?? []).length,
      myDeclaredGood: state.declaredGoodByPlayer[playerId],
      canMarketNow: state.phase === 'merchant_market' && activeMerchant?.id === playerId,
      canBagNow: state.phase === 'merchant_bagging' && activeMerchant?.id === playerId,
      canInspectNow: state.phase === 'sheriff_inspection' && sheriff.id === playerId,
      legalGoodsForDeclaration: LEGAL_GOODS,
      discardTopLeft: state.discardPiles[0][state.discardPiles[0].length - 1]?.type,
      discardTopRight: state.discardPiles[1][state.discardPiles[1].length - 1]?.type,
      discardLeftCount: state.discardPiles[0].length,
      discardRightCount: state.discardPiles[1].length,
      drawPileCount: state.drawPile.length,
      lastRoundSummary: state.lastRoundSummary,
      lastInspection: state.lastInspection,
      winners:
        state.phase === 'game_over'
          ? scores.map((s) => ({
              id: s.id,
              name: state.players.find((p) => p.id === s.id)?.name ?? '?',
              score: s.total,
            }))
          : undefined,
      scoreBreakdown:
        state.phase === 'game_over'
          ? scores.map((s) => ({
              id: s.id,
              name: state.players.find((p) => p.id === s.id)?.name ?? '?',
              coins: s.coins,
              goodsValue: s.goodsValue,
              bonus: s.bonus,
              total: s.total,
            }))
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

