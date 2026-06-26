import {
  buildSushiGoDeck,
  cardsFromKinds,
  countMakiIcons,
  GAME_THUMBNAIL_BY_ID,
  parseSushiGoLobbyOptions,
  scoreMaki,
  scorePlayerRound,
  scorePudding,
  sushiGoCardsPerPlayer,
  type GameDefinition,
  type GameResult,
  type Player,
  type SushiGoAction,
  type SushiGoCard,
  type SushiGoPassDirection,
  type SushiGoPlayedCards,
  type SushiGoPlayerView,
  type SushiGoPublicPlayed,
  type SushiGoRoundSummary,
  type SushiGoState,
  type SushiGoWasabiSlot,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const TOTAL_ROUNDS = 3;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneCard(c: SushiGoCard): SushiGoCard {
  return { ...c };
}

function emptyPlayed(): SushiGoPlayedCards {
  return {
    tempura: [],
    sashimi: [],
    dumpling: [],
    maki: [],
    nigiri: [],
    pudding: [],
    chopsticks: [],
  };
}

function cloneState(state: SushiGoState): SushiGoState {
  return {
    ...state,
    playerOrder: [...state.playerOrder],
    playerNames: { ...state.playerNames },
    hands: Object.fromEntries(
      Object.entries(state.hands).map(([k, v]) => [k, v.map(cloneCard)]),
    ),
    picks: { ...state.picks },
    playedByPlayer: Object.fromEntries(
      Object.entries(state.playedByPlayer).map(([k, v]) => [
        k,
        {
          tempura: [...v.tempura],
          sashimi: [...v.sashimi],
          dumpling: [...v.dumpling],
          maki: [...v.maki],
          nigiri: [...v.nigiri],
          pudding: [...v.pudding],
          chopsticks: [...v.chopsticks],
        },
      ]),
    ),
    wasabiSlots: Object.fromEntries(
      Object.entries(state.wasabiSlots).map(([k, v]) => [
        k,
        v.map((s) => ({ ...s, nigiriId: s.nigiriId })),
      ]),
    ),
    roundPlaced: Object.fromEntries(
      Object.entries(state.roundPlaced).map(([k, v]) => [k, v.map(cloneCard)]),
    ),
    drawPile: state.drawPile.map(cloneCard),
    discardPile: state.discardPile.map(cloneCard),
    scores: { ...state.scores },
    lastRevealedPicks: state.lastRevealedPicks.map((p) => ({
      ...p,
      cards: p.cards.map(cloneCard),
    })),
    lastRoundSummary: state.lastRoundSummary
      ? {
          ...state.lastRoundSummary,
          roundPoints: { ...state.lastRoundSummary.roundPoints },
          breakdownByPlayer: Object.fromEntries(
            Object.entries(state.lastRoundSummary.breakdownByPlayer).map(([k, v]) => [k, { ...v }]),
          ),
        }
      : null,
    puddingSummary: state.puddingSummary
      ? {
          points: { ...state.puddingSummary.points },
          puddingCounts: { ...state.puddingSummary.puddingCounts },
        }
      : null,
    result: state.result ? { ...state.result } : null,
  };
}

function passDirectionForRound(roundNo: number, passBothWays: boolean): SushiGoPassDirection {
  if (!passBothWays) return 'left';
  return roundNo === 2 ? 'right' : 'left';
}

function openWasabiSlot(slots: SushiGoWasabiSlot[]): SushiGoWasabiSlot | undefined {
  return slots.find((s) => !s.nigiriId);
}

function hasChopsticksAvailable(played: SushiGoPlayedCards): boolean {
  return played.chopsticks.length > 0;
}

function removeCardsFromHand(hand: SushiGoCard[], cardIds: string[]): SushiGoCard[] {
  const idSet = new Set(cardIds);
  return hand.filter((c) => !idSet.has(c.id));
}

function placeCard(
  state: SushiGoState,
  playerId: string,
  card: SushiGoCard,
): void {
  if (!state.roundPlaced[playerId]) state.roundPlaced[playerId] = [];
  state.roundPlaced[playerId]!.push(cloneCard(card));

  const played = state.playedByPlayer[playerId]!;
  const slots = state.wasabiSlots[playerId]!;

  switch (card.kind) {
    case 'tempura':
      played.tempura.push(card.id);
      break;
    case 'sashimi':
      played.sashimi.push(card.id);
      break;
    case 'dumpling':
      played.dumpling.push(card.id);
      break;
    case 'maki_1':
    case 'maki_2':
    case 'maki_3':
      played.maki.push(card.id);
      break;
    case 'pudding':
      played.pudding.push(card.id);
      break;
    case 'wasabi':
      slots.push({ wasabiId: card.id });
      break;
    case 'chopsticks':
      played.chopsticks.push(card.id);
      break;
    case 'nigiri_squid':
    case 'nigiri_salmon':
    case 'nigiri_egg': {
      const open = openWasabiSlot(slots);
      if (open) {
        open.nigiriId = card.id;
      } else {
        played.nigiri.push(card.id);
      }
      break;
    }
    default:
      break;
  }
}

function returnChopsticksToHand(state: SushiGoState, playerId: string): void {
  const played = state.playedByPlayer[playerId]!;
  const chopId = played.chopsticks.shift();
  if (!chopId) return;
  const hand = state.hands[playerId]!;
  hand.push({ id: chopId, kind: 'chopsticks' });
}

function passHands(state: SushiGoState): void {
  const order = state.playerOrder;
  const n = order.length;
  const oldHands = { ...state.hands };

  if (state.passDirection === 'left') {
    for (let i = 0; i < n; i += 1) {
      const receiver = order[i]!;
      const giver = order[(i - 1 + n) % n]!;
      state.hands[receiver] = oldHands[giver]!.map(cloneCard);
    }
  } else {
    for (let i = 0; i < n; i += 1) {
      const receiver = order[i]!;
      const giver = order[(i + 1) % n]!;
      state.hands[receiver] = oldHands[giver]!.map(cloneCard);
    }
  }
}

function autoPlaceFinalCards(state: SushiGoState): void {
  for (const pid of state.playerOrder) {
    const hand = state.hands[pid]!;
    if (hand.length === 1) {
      const [card] = hand.splice(0, 1);
      if (card) placeCard(state, pid, card);
    }
  }
}

function allPicked(state: SushiGoState): boolean {
  return state.playerOrder.every((id) => state.picks[id] != null);
}

function clearPicks(state: SushiGoState): void {
  for (const id of state.playerOrder) state.picks[id] = null;
}

function discardRoundCards(state: SushiGoState): void {
  for (const pid of state.playerOrder) {
    const played = state.playedByPlayer[pid]!;
    const roundCards = state.roundPlaced[pid] ?? [];
    for (const card of roundCards) {
      if (card.kind !== 'pudding') {
        state.discardPile.push(cloneCard(card));
      }
    }
    played.tempura = [];
    played.sashimi = [];
    played.dumpling = [];
    played.maki = [];
    played.nigiri = [];
    played.chopsticks = [];
    state.wasabiSlots[pid] = [];
    state.roundPlaced[pid] = [];
  }
}

function scoreCurrentRound(state: SushiGoState): SushiGoRoundSummary {
  const makiIconsByPlayer: Record<string, number> = {};
  const breakdownByPlayer: SushiGoRoundSummary['breakdownByPlayer'] = {};
  const roundPoints: Record<string, number> = {};

  for (const pid of state.playerOrder) {
    const roundCards = state.roundPlaced[pid] ?? [];
    const slots = state.wasabiSlots[pid] ?? [];
    const counts = cardsFromKinds(roundCards);
    makiIconsByPlayer[pid] = countMakiIcons(counts.makiKinds);

    const nigiriCards = roundCards.filter((c) =>
      c.kind === 'nigiri_squid' || c.kind === 'nigiri_salmon' || c.kind === 'nigiri_egg',
    );

    breakdownByPlayer[pid] = scorePlayerRound({
      tempuraCount: counts.tempura,
      sashimiCount: counts.sashimi,
      dumplingCount: counts.dumpling,
      makiIcons: makiIconsByPlayer[pid] ?? 0,
      nigiriCards,
      wasabiSlots: slots,
      makiPoints: 0,
    });
  }

  const makiResult = scoreMaki(makiIconsByPlayer, state.playerOrder);
  for (const pid of state.playerOrder) {
    const makiPts = makiResult.points[pid] ?? 0;
    breakdownByPlayer[pid]!.maki = makiPts;
    breakdownByPlayer[pid]!.total += makiPts;
    roundPoints[pid] = breakdownByPlayer[pid]!.total;
    state.scores[pid] = (state.scores[pid] ?? 0) + roundPoints[pid]!;
  }

  return {
    roundNo: state.roundNo,
    roundPoints,
    breakdownByPlayer,
    reason: `สรุปคะแนนรอบ ${state.roundNo}`,
  };
}

function toPublicPlayed(
  played: SushiGoPlayedCards,
  slots: SushiGoWasabiSlot[],
  makiKinds: string[],
): SushiGoPublicPlayed {
  const openWasabi = slots.filter((s) => !s.nigiriId).length;
  const pairedWasabi = slots.filter((s) => s.nigiriId).length;
  return {
    tempura: played.tempura.length,
    sashimi: played.sashimi.length,
    dumpling: played.dumpling.length,
    makiIcons: countMakiIcons(makiKinds as SushiGoCard['kind'][]),
    nigiri: played.nigiri.length + pairedWasabi,
    pudding: played.pudding.length,
    chopsticksAvailable: played.chopsticks.length,
    wasabiPaired: pairedWasabi,
    wasabiOpen: openWasabi,
  };
}

function dealRound(state: SushiGoState): void {
  const n = state.playerOrder.length;
  const perPlayer = sushiGoCardsPerPlayer(n);
  state.picksPerRound = perPlayer - 1;
  state.pickNo = 1;
  state.passDirection = passDirectionForRound(state.roundNo, state.passBothWays);
  clearPicks(state);
  state.lastRevealedPicks = [];

  for (const pid of state.playerOrder) {
    state.roundPlaced[pid] = [];
    const hand: SushiGoCard[] = [];
    for (let i = 0; i < perPlayer; i += 1) {
      const card = state.drawPile.shift();
      if (card) hand.push(card);
    }
    state.hands[pid] = hand;
    if (!state.playedByPlayer[pid]) state.playedByPlayer[pid] = emptyPlayed();
    if (!state.wasabiSlots[pid]) state.wasabiSlots[pid] = [];
  }

  state.phase = 'picking';
  state.lastEvent = `รอบ ${state.roundNo} — เลือกการ์ด`;
}

function finishGame(state: SushiGoState): void {
  const puddingCounts: Record<string, number> = {};
  for (const pid of state.playerOrder) {
    puddingCounts[pid] = state.playedByPlayer[pid]?.pudding.length ?? 0;
  }
  const puddingResult = scorePudding(
    puddingCounts,
    state.playerOrder,
    state.playerOrder.length,
  );
  state.puddingSummary = { points: puddingResult.points, puddingCounts };

  for (const [pid, pts] of Object.entries(puddingResult.points)) {
    state.scores[pid] = (state.scores[pid] ?? 0) + pts;
  }

  const maxScore = Math.max(...state.playerOrder.map((id) => state.scores[id] ?? 0));
  let winners = state.playerOrder.filter((id) => (state.scores[id] ?? 0) === maxScore);

  if (winners.length > 1) {
    const maxPudding = Math.max(...winners.map((id) => puddingCounts[id] ?? 0));
    winners = winners.filter((id) => (puddingCounts[id] ?? 0) === maxPudding);
  }

  state.phase = 'game_over';
  state.result = {
    winners,
    reason:
      winners.length === 1
        ? `จบ 3 รอบ — คะแนนสูงสุด ${maxScore}`
        : `จบ 3 รอบ — เสมอ ${maxScore} คะแนน`,
  };
}

function resolvePicks(state: SushiGoState): void {
  const revealed: SushiGoState['lastRevealedPicks'] = [];
  const usedChopsticks = new Set<string>();

  for (const pid of state.playerOrder) {
    const pickIds = state.picks[pid]!;
    const hand = state.hands[pid]!;
    const pickedCards: SushiGoCard[] = [];
    for (const id of pickIds) {
      const card = hand.find((c) => c.id === id);
      if (card) pickedCards.push(card);
    }
    state.hands[pid] = removeCardsFromHand(hand, pickIds);
    for (const card of pickedCards) placeCard(state, pid, card);
    if (pickIds.length === 2) usedChopsticks.add(pid);
    revealed.push({
      playerId: pid,
      playerName: state.playerNames[pid] ?? pid,
      cards: pickedCards.map(cloneCard),
    });
  }

  state.lastRevealedPicks = revealed;

  for (const pid of usedChopsticks) returnChopsticksToHand(state, pid);

  if (state.pickNo >= state.picksPerRound) {
    passHands(state);
    autoPlaceFinalCards(state);
    const summary = scoreCurrentRound(state);
    state.lastRoundSummary = summary;
    discardRoundCards(state);

    if (state.roundNo >= state.totalRounds) {
      finishGame(state);
      state.lastEvent = summary.reason;
      return;
    }

    state.phase = 'round_end';
    state.lastEvent = summary.reason;
    return;
  }

  passHands(state);
  state.pickNo += 1;
  clearPicks(state);
  state.phase = 'picking';
  state.lastEvent = `เทิร์น ${state.pickNo}/${state.picksPerRound}`;
}

function toPlayerView(state: SushiGoState, viewerId: string): SushiGoPlayerView {
  const played = state.playedByPlayer[viewerId] ?? emptyPlayed();
  const slots = state.wasabiSlots[viewerId] ?? [];
  const makiKinds = played.maki.map(() => 'maki_1' as const);

  const pickDone = state.playerOrder.filter((id) => state.picks[id] != null).length;
  const hasPicked = state.picks[viewerId] != null;
  const canUseChopsticks = hasChopsticksAvailable(played);
  const openWasabi = openWasabiSlot(slots);

  return {
    phase: state.phase,
    roundNo: state.roundNo,
    totalRounds: state.totalRounds,
    pickNo: state.pickNo,
    picksPerRound: state.picksPerRound,
    passDirection: state.passDirection,
    passBothWays: state.passBothWays,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    scores: { ...state.scores },
    players: state.playerOrder.map((id) => {
      const p = state.playedByPlayer[id] ?? emptyPlayed();
      const s = state.wasabiSlots[id] ?? [];
      return {
        id,
        name: state.playerNames[id] ?? id,
        score: state.scores[id] ?? 0,
        hasPicked: state.picks[id] != null,
        played: toPublicPlayed(p, s, p.maki.map(() => 'maki_1')),
      };
    }),
    myHand: (state.hands[viewerId] ?? []).map(cloneCard),
    myPlayed: toPublicPlayed(played, slots, makiKinds),
    myWasabiSlots: slots.map((s) => ({ ...s })),
    pickProgress: { done: pickDone, total: state.playerOrder.length },
    hasPicked,
    canPick: state.phase === 'picking' && !hasPicked,
    canUseChopsticks,
    mustPairNigiriWithWasabi: openWasabi != null,
    chopsticksPickCount: canUseChopsticks ? 2 : 1,
    lastRevealedPicks: state.lastRevealedPicks.map((p) => ({
      ...p,
      cards: p.cards.map(cloneCard),
    })),
    lastRoundSummary: state.lastRoundSummary,
    puddingSummary: state.puddingSummary,
    gameResult: state.result,
    lastEvent: state.lastEvent,
  };
}

export const sushiGoGame: GameDefinition<SushiGoState, SushiGoAction> = {
  id: 'sushi-go',
  name: 'Sushi Go!',
  description: 'เลือกซูชิแล้วส่งมือ — draft 3 รอบ 2–5 คน',
  minPlayers: 2,
  maxPlayers: 5,
  thumbnail: GAME_THUMBNAIL_BY_ID['sushi-go'] || '/games/sushi-go/cover.png',

  setup(players: Player[], options?: unknown): SushiGoState {
    const opts = parseSushiGoLobbyOptions(options);
    const order = players.map((p) => p.id);
    const playerNames = Object.fromEntries(players.map((p) => [p.id, p.name])) as Record<
      string,
      string
    >;
    const scores = Object.fromEntries(order.map((id) => [id, 0])) as Record<string, number>;

    const state: SushiGoState = {
      phase: 'picking',
      roundNo: 1,
      totalRounds: TOTAL_ROUNDS,
      pickNo: 1,
      picksPerRound: sushiGoCardsPerPlayer(order.length) - 1,
      passBothWays: opts.passBothWays,
      passDirection: passDirectionForRound(1, opts.passBothWays),
      playerOrder: order,
      playerNames,
      hands: {},
      picks: Object.fromEntries(order.map((id) => [id, null])),
      playedByPlayer: Object.fromEntries(order.map((id) => [id, emptyPlayed()])),
      wasabiSlots: Object.fromEntries(order.map((id) => [id, []])),
      roundPlaced: Object.fromEntries(order.map((id) => [id, []])),
      drawPile: shuffle(buildSushiGoDeck()),
      discardPile: [],
      scores,
      lastRevealedPicks: [],
      lastRoundSummary: null,
      puddingSummary: null,
      lastEvent: 'เริ่มเกม',
      result: null,
    };

    dealRound(state);
    return state;
  },

  onAction(state: SushiGoState, playerId: string, action: SushiGoAction): SushiGoState {
    if (state.result && state.phase === 'game_over') {
      throw new GameActionRejectedError('เกมจบแล้ว');
    }

    const next = cloneState(state);

    switch (action.type) {
      case 'pick_cards': {
        if (next.phase !== 'picking') {
          throw new GameActionRejectedError('ยังไม่ใช่ช่วงเลือกการ์ด');
        }
        if (next.picks[playerId] != null) {
          throw new GameActionRejectedError('เลือกการ์ดแล้ว');
        }
        const hand = next.hands[playerId] ?? [];
        const played = next.playedByPlayer[playerId]!;
        const canChop = hasChopsticksAvailable(played);
        const { cardIds } = action;

        if (cardIds.length !== 1 && cardIds.length !== 2) {
          throw new GameActionRejectedError('เลือกได้ 1 หรือ 2 ใบ');
        }
        if (cardIds.length === 2 && !canChop) {
          throw new GameActionRejectedError('ไม่มี Chopsticks ให้ใช้');
        }
        if (cardIds.length === 1 && canChop) {
          // optional chopsticks — allowed to pick 1 only
        }
        const unique = new Set(cardIds);
        if (unique.size !== cardIds.length) {
          throw new GameActionRejectedError('เลือกการ์ดซ้ำไม่ได้');
        }
        for (const id of cardIds) {
          if (!hand.some((c) => c.id === id)) {
            throw new GameActionRejectedError('ไม่มีการ์ดนี้ในมือ');
          }
        }

        next.picks[playerId] = cardIds;
        if (!allPicked(next)) break;

        resolvePicks(next);
        break;
      }

      case 'ack_round_summary': {
        if (next.phase !== 'round_end') {
          throw new GameActionRejectedError('ไม่มีสรุปรอบที่รอ');
        }
        next.roundNo += 1;
        dealRound(next);
        break;
      }

      default:
        throw new GameActionRejectedError('action ไม่รู้จัก');
    }

    return next;
  },

  getPlayerView(state: SushiGoState, playerId: string): SushiGoPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: SushiGoState): GameResult | null {
    return state.result;
  },
};
