import {
  buildPlayingDeck,
  buildTryalDeck,
  GAME_THUMBNAIL_BY_ID,
  isSalem1692BlackKind,
  parseSalem1692LobbyOptions,
  salem1692AccusationValue,
  SALEM_1692_TOWN_HALL_IDS,
  type GameDefinition,
  type GameResult,
  type Player,
  type Salem1692Action,
  type Salem1692PlayerView,
  type Salem1692PlayingCard,
  type Salem1692State,
  type Salem1692TownHallId,
  type Salem1692TryalCard,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const NIGHT_STEP_MS = 30_000;
const ACCUSATION_REVEAL_THRESHOLD = 7;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneTryal(t: Salem1692TryalCard): Salem1692TryalCard {
  return { ...t };
}

function clonePlaying(c: Salem1692PlayingCard): Salem1692PlayingCard {
  return { ...c };
}

function cloneState(state: Salem1692State): Salem1692State {
  return {
    ...state,
    playerOrder: [...state.playerOrder],
    playerNames: { ...state.playerNames },
    alive: { ...state.alive },
    tryalsByPlayer: Object.fromEntries(
      Object.entries(state.tryalsByPlayer).map(([k, v]) => [k, v.map(cloneTryal)]),
    ),
    everWitch: { ...state.everWitch },
    isConstable: { ...state.isConstable },
    townHallByPlayer: { ...state.townHallByPlayer },
    hands: Object.fromEntries(
      Object.entries(state.hands).map(([k, v]) => [k, v.map(clonePlaying)]),
    ),
    drawPile: state.drawPile.map(clonePlaying),
    discardPile: state.discardPile.map(clonePlaying),
    blueCardsByPlayer: Object.fromEntries(
      Object.entries(state.blueCardsByPlayer).map(([k, v]) => [k, [...v]]),
    ),
    accusationPointsByPlayer: { ...state.accusationPointsByPlayer },
    hasDrawnThisTurn: { ...state.hasDrawnThisTurn },
    skippedNextTurn: { ...state.skippedNextTurn },
    witchKillVotes: { ...state.witchKillVotes },
    confessedThisNight: { ...state.confessedThisNight },
    confessedTryalId: { ...state.confessedTryalId },
    pendingAccusation: state.pendingAccusation ? { ...state.pendingAccusation } : null,
    pendingConspiracy: state.pendingConspiracy ? { ...state.pendingConspiracy } : null,
    revealedWitchTryalIds: [...state.revealedWitchTryalIds],
    totalWitchTryalIds: [...state.totalWitchTryalIds],
    result: state.result ? { ...state.result } : null,
  };
}

function livingPlayers(state: Salem1692State): string[] {
  return state.playerOrder.filter((id) => state.alive[id]);
}

function witchTeamIds(state: Salem1692State): string[] {
  return livingPlayers(state).filter((id) => state.everWitch[id]);
}

function syncRolesFromTryals(state: Salem1692State, playerId: string): void {
  const tryals = state.tryalsByPlayer[playerId] ?? [];
  if (tryals.some((t) => t.kind === 'witch')) state.everWitch[playerId] = true;
  state.isConstable[playerId] = tryals.some((t) => t.kind === 'constable');
}

function playerByTownHall(state: Salem1692State, townHallId: Salem1692TownHallId): string | null {
  for (const id of state.playerOrder) {
    if (state.townHallByPlayer[id] === townHallId && state.alive[id]) return id;
  }
  return null;
}

function hasBlue(
  state: Salem1692State,
  playerId: string,
  kind: Salem1692PlayingCard['kind'],
): boolean {
  return (state.blueCardsByPlayer[playerId] ?? []).includes(kind);
}

function advanceToNextPlayer(state: Salem1692State): void {
  const living = livingPlayers(state);
  if (living.length === 0) {
    state.currentPlayerId = null;
    return;
  }
  const start = state.currentPlayerId ?? living[0]!;
  const idx = state.playerOrder.indexOf(start);
  for (let step = 1; step <= state.playerOrder.length; step += 1) {
    const pid = state.playerOrder[(idx + step) % state.playerOrder.length]!;
    if (!state.alive[pid]) continue;
    if (state.skippedNextTurn[pid]) {
      state.skippedNextTurn[pid] = false;
      continue;
    }
    state.currentPlayerId = pid;
    state.hasDrawnThisTurn[pid] = false;
    return;
  }
  state.currentPlayerId = living[0] ?? null;
}

function removeFromHand(hand: Salem1692PlayingCard[], cardId: string): Salem1692PlayingCard | null {
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  const [card] = hand.splice(idx, 1);
  return card ?? null;
}

function revealTryal(
  state: Salem1692State,
  playerId: string,
  tryalId: string,
): Salem1692TryalCard | null {
  const tryals = state.tryalsByPlayer[playerId];
  if (!tryals) return null;
  const t = tryals.find((x) => x.id === tryalId && !x.revealed);
  if (!t) return null;
  t.revealed = true;
  if (t.kind === 'witch' && !state.revealedWitchTryalIds.includes(t.id)) {
    state.revealedWitchTryalIds.push(t.id);
  }
  return t;
}

function killPlayer(state: Salem1692State, playerId: string, reason: string): void {
  if (!state.alive[playerId]) return;
  state.alive[playerId] = false;
  const hand = state.hands[playerId] ?? [];
  state.discardPile.push(...hand.map(clonePlaying));
  state.hands[playerId] = [];
  for (const tryal of state.tryalsByPlayer[playerId] ?? []) {
    if (!tryal.revealed) {
      tryal.revealed = true;
      if (tryal.kind === 'witch' && !state.revealedWitchTryalIds.includes(tryal.id)) {
        state.revealedWitchTryalIds.push(tryal.id);
      }
    }
  }
  state.blueCardsByPlayer[playerId] = [];
  state.accusationPointsByPlayer[playerId] = 0;
  if (state.blackCatHolderId === playerId) state.blackCatHolderId = null;
  if (state.gavelHolderId === playerId) state.gavelHolderId = null;
  state.lastEvent = `${state.playerNames[playerId]} ตาย — ${reason}`;
}

function checkDeathAfterReveal(state: Salem1692State, playerId: string): void {
  const tryals = state.tryalsByPlayer[playerId] ?? [];
  const allRevealed = tryals.every((t) => t.revealed);
  const witchRevealed = tryals.some((t) => t.revealed && t.kind === 'witch');
  if (witchRevealed) killPlayer(state, playerId, 'เปิดเผย Witch');
  else if (allRevealed) killPlayer(state, playerId, 'Tryal เปิดครบ');
}

function checkWin(state: Salem1692State): GameResult | null {
  const allWitchRevealed =
    state.totalWitchTryalIds.length > 0 &&
    state.revealedWitchTryalIds.length >= state.totalWitchTryalIds.length;
  if (allWitchRevealed) {
    const winners = livingPlayers(state).filter((id) => !state.everWitch[id]);
    return {
      winners: winners.length > 0 ? winners : livingPlayers(state),
      reason: 'เปิดเผย Witch Tryal ครบ — Townspeople ชนะ',
    };
  }
  const living = livingPlayers(state);
  if (living.length > 0 && living.every((id) => state.everWitch[id])) {
    return { winners: living, reason: 'ผู้มีชีวิตทุกคนเคยเป็น Witch — Witches ชนะ' };
  }
  return null;
}

function applyWinIfAny(state: Salem1692State): boolean {
  const res = checkWin(state);
  if (!res) return false;
  state.result = res;
  state.phase = 'game_over';
  state.lastEvent = res.reason;
  return true;
}

function reshuffleDeck(state: Salem1692State): void {
  const night = state.drawPile.find((c) => c.kind === 'night') ??
    state.discardPile.find((c) => c.kind === 'night') ?? {
      id: 'night-fixed',
      kind: 'night' as const,
      color: 'black' as const,
    };
  const pile = [
    ...state.discardPile.filter((c) => c.kind !== 'night'),
    ...state.drawPile.filter((c) => c.kind !== 'night'),
  ];
  state.drawPile = shuffle(pile);
  state.discardPile = [];
  state.drawPile.push(clonePlaying(night));
}

function beginNight(state: Salem1692State): void {
  state.phase = 'night_witch';
  state.nightKillTownHallId = null;
  state.witchKillVotes = {};
  state.gavelHolderId = null;
  state.confessedThisNight = {};
  state.confessedTryalId = {};
  state.nightStepEndsAtMs = Date.now() + NIGHT_STEP_MS;
  state.lastEvent = 'Night — Witches เลือกเป้าหมาย';
}

function beginConspiracy(state: Salem1692State, revealerId: string): void {
  state.phase = 'conspiracy';
  const needsReveal = state.blackCatHolderId != null;
  state.pendingConspiracy = {
    revealerId,
    blackCatTryalRevealed: !needsReveal,
    awaitingView: false,
  };
  state.lastEvent = 'Conspiracy — ส่ง Tryal ซ้าย';
}

function passTryalsLeft(state: Salem1692State): void {
  const order = state.playerOrder;
  const n = order.length;
  const snapshots: Salem1692TryalCard[][] = order.map((id) =>
    (state.tryalsByPlayer[id] ?? []).map(cloneTryal),
  );
  for (let i = 0; i < n; i += 1) {
    const receiver = order[i]!;
    const giver = order[(i - 1 + n) % n]!;
    state.tryalsByPlayer[receiver] = snapshots[(i - 1 + n) % n]!.map(cloneTryal);
    syncRolesFromTryals(state, receiver);
    void giver;
  }
}

function resolveConspiracyView(state: Salem1692State): void {
  state.pendingConspiracy = null;
  state.phase = 'playing';
  if (state.currentPlayerId) state.hasDrawnThisTurn[state.currentPlayerId] = true;
  advanceToNextPlayer(state);
  state.lastEvent = 'Conspiracy จบ — เล่นต่อ';
}

function resolveNight(state: Salem1692State): void {
  const killTh = state.nightKillTownHallId;
  const victimId = killTh ? playerByTownHall(state, killTh) : null;
  let killed = false;
  if (victimId && state.alive[victimId]) {
    const savedByGavel = state.gavelHolderId === victimId;
    const confessed = state.confessedThisNight[victimId] === true;
    const asylum = hasBlue(state, victimId, 'asylum');
    if (!savedByGavel && !confessed && !asylum) {
      killPlayer(state, victimId, 'ถูกฆ่ากลางคืน');
      killed = true;
    } else {
      state.lastEvent = `${state.playerNames[victimId]} รอดจาก Night`;
    }
  }
  state.gavelHolderId = null;
  state.nightKillTownHallId = null;
  state.nightStepEndsAtMs = null;
  reshuffleDeck(state);
  if (applyWinIfAny(state)) return;
  state.phase = 'playing';
  if (!killed) advanceToNextPlayer(state);
  else if (state.currentPlayerId && !state.alive[state.currentPlayerId]) advanceToNextPlayer(state);
}

function resolveBlackCard(
  state: Salem1692State,
  card: Salem1692PlayingCard,
  actorId: string,
): void {
  state.discardPile.push(clonePlaying(card));
  if (card.kind === 'conspiracy') {
    beginConspiracy(state, actorId);
    return;
  }
  if (card.kind === 'night') {
    beginNight(state);
  }
}

function drawCards(state: Salem1692State, actorId: string, count: number): void {
  const hand = state.hands[actorId] ?? [];
  for (let i = 0; i < count; i += 1) {
    if (state.drawPile.length === 0) break;
    const card = state.drawPile.shift()!;
    if (isSalem1692BlackKind(card.kind)) {
      resolveBlackCard(state, card, actorId);
      if (state.phase !== 'playing') return;
      continue;
    }
    hand.push(card);
  }
  state.hands[actorId] = hand;
}

function applyCardPlay(
  state: Salem1692State,
  actorId: string,
  card: Salem1692PlayingCard,
  targetId?: string,
  secondTargetId?: string,
): void {
  if (targetId === actorId || secondTargetId === actorId) {
    throw new GameActionRejectedError('ห้ามเล่นกับตัวเอง');
  }
  const living = livingPlayers(state);
  if (targetId && !living.includes(targetId)) {
    throw new GameActionRejectedError('ไม่มีผู้เล่นเป้าหมาย');
  }

  switch (card.kind) {
    case 'accusation':
    case 'evidence': {
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      const pts = salem1692AccusationValue(card.kind);
      state.accusationPointsByPlayer[targetId] =
        (state.accusationPointsByPlayer[targetId] ?? 0) + pts;
      state.discardPile.push(clonePlaying(card));
      if ((state.accusationPointsByPlayer[targetId] ?? 0) >= ACCUSATION_REVEAL_THRESHOLD) {
        state.pendingAccusation = { actorId, targetId };
        state.lastEvent = `${state.playerNames[targetId]} ครบ ${ACCUSATION_REVEAL_THRESHOLD} accusations`;
      } else {
        state.lastEvent = `${state.playerNames[actorId]} ใส่ accusation ให้ ${state.playerNames[targetId]}`;
      }
      break;
    }
    case 'piety':
    case 'asylum':
    case 'alibi':
    case 'stocks':
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      state.blueCardsByPlayer[targetId] = [...(state.blueCardsByPlayer[targetId] ?? []), card.kind];
      state.discardPile.push(clonePlaying(card));
      if (card.kind === 'stocks') state.skippedNextTurn[targetId] = true;
      state.lastEvent = `${state.playerNames[actorId]} เล่น ${card.kind} ให้ ${state.playerNames[targetId]}`;
      break;
    case 'scapegoat': {
      if (!targetId || !secondTargetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น 2 คน');
      const fromBlues = [...(state.blueCardsByPlayer[targetId] ?? [])];
      const toBlues = [...(state.blueCardsByPlayer[secondTargetId] ?? [])];
      state.blueCardsByPlayer[secondTargetId] = fromBlues;
      state.blueCardsByPlayer[targetId] = toBlues;
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = 'Scapegoat — สลับ blue cards';
      break;
    }
    case 'curse':
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      state.blueCardsByPlayer[targetId] = [];
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = `Curse — ทิ้ง blue cards ของ ${state.playerNames[targetId]}`;
      break;
    case 'robbery': {
      if (!targetId || !secondTargetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น 2 คน');
      const fromHand = state.hands[targetId] ?? [];
      if (fromHand.length === 0) throw new GameActionRejectedError('เป้าหมายไม่มีการ์ดในมือ');
      const stolen = fromHand.pop()!;
      state.hands[secondTargetId] = [...(state.hands[secondTargetId] ?? []), stolen];
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = 'Robbery';
      break;
    }
    case 'witness':
    case 'alibi_green':
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = `${card.kind} เล่นแล้ว`;
      break;
    default:
      state.discardPile.push(clonePlaying(card));
      break;
  }
}

function drawNonBlack(state: Salem1692State): Salem1692PlayingCard | null {
  const n = state.drawPile.length;
  for (let i = 0; i < n; i += 1) {
    const card = state.drawPile.shift();
    if (!card) return null;
    if (!isSalem1692BlackKind(card.kind)) return card;
    state.drawPile.push(card);
  }
  return null;
}

function dealInitialHands(state: Salem1692State): void {
  for (const pid of state.playerOrder) {
    const hand: Salem1692PlayingCard[] = [];
    for (let i = 0; i < 3; i += 1) {
      const c = drawNonBlack(state);
      if (c) hand.push(c);
    }
    state.hands[pid] = hand;
  }
}

function assignTownHalls(state: Salem1692State): void {
  const halls = shuffle([...SALEM_1692_TOWN_HALL_IDS]).slice(0, state.playerOrder.length);
  state.playerOrder.forEach((id, i) => {
    state.townHallByPlayer[id] = halls[i]!;
  });
}

function dealTryalsToPlayers(state: Salem1692State, deck: Salem1692TryalCard[]): void {
  const n = state.playerOrder.length;
  const perPlayer = deck.length / n;
  let idx = 0;
  for (const pid of state.playerOrder) {
    const slice = deck.slice(idx, idx + perPlayer).map(cloneTryal);
    idx += perPlayer;
    state.tryalsByPlayer[pid] = slice;
    syncRolesFromTryals(state, pid);
  }
  state.totalWitchTryalIds = deck.filter((t) => t.kind === 'witch').map((t) => t.id);
  state.revealedWitchTryalIds = [];
}

function toPlayerView(state: Salem1692State, viewerId: string): Salem1692PlayerView {
  const isWitch = state.everWitch[viewerId] === true;
  const isConstable = state.isConstable[viewerId] === true;
  const phase = state.phase;

  return {
    phase,
    playerOrder: [...state.playerOrder],
    currentPlayerId: state.currentPlayerId,
    blackCatHolderId: state.blackCatHolderId,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    revealedWitchTryalCount: state.revealedWitchTryalIds.length,
    totalWitchTryalCount: state.totalWitchTryalIds.length,
    nightStepEndsAtMs:
      phase === 'night_witch' || phase === 'night_constable' || phase === 'night_confess'
        ? state.nightStepEndsAtMs
        : null,
    players: state.playerOrder.map((id) => ({
      id,
      name: state.playerNames[id] ?? id,
      alive: state.alive[id] === true,
      townHallId: state.townHallByPlayer[id]!,
      accusationPoints: state.accusationPointsByPlayer[id] ?? 0,
      blueCards: [...(state.blueCardsByPlayer[id] ?? [])],
      revealedTryals: (state.tryalsByPlayer[id] ?? []).filter((t) => t.revealed).map((t) => t.kind),
      hasBlackCat: state.blackCatHolderId === id,
      hasGavel: state.gavelHolderId === id,
      confessedThisNight: state.confessedThisNight[id] === true,
    })),
    you: {
      id: viewerId,
      name: state.playerNames[viewerId] ?? viewerId,
      alive: state.alive[viewerId] === true,
      tryals: (state.tryalsByPlayer[viewerId] ?? []).map(cloneTryal),
      isWitchTeam: isWitch,
      isConstable,
      townHallId: state.townHallByPlayer[viewerId]!,
      hand: (state.hands[viewerId] ?? []).map(clonePlaying),
      hasDrawnThisTurn: state.hasDrawnThisTurn[viewerId] === true,
    },
    witchTeamIds:
      phase === 'night_witch' || phase === 'dawn' ? (isWitch ? witchTeamIds(state) : null) : null,
    pendingAccusation: state.pendingAccusation
      ? {
          actorId: state.pendingAccusation.actorId,
          targetId: state.pendingAccusation.targetId,
          targetName: state.playerNames[state.pendingAccusation.targetId] ?? '',
          unrevealedTryalIds:
            viewerId === state.pendingAccusation.actorId
              ? (state.tryalsByPlayer[state.pendingAccusation.targetId] ?? [])
                  .filter((t) => !t.revealed)
                  .map((t) => t.id)
              : [],
        }
      : null,
    pendingConspiracy: state.pendingConspiracy
      ? {
          revealerId: state.pendingConspiracy.revealerId,
          revealerName: state.playerNames[state.pendingConspiracy.revealerId] ?? '',
          blackCatHolderId: state.blackCatHolderId,
          needsReveal: !state.pendingConspiracy.blackCatTryalRevealed,
          awaitingView: state.pendingConspiracy.awaitingView,
        }
      : null,
    nightKillTownHallId: state.nightKillTownHallId,
    canDawnBlackCat: phase === 'dawn' && isWitch && state.alive[viewerId] === true,
    canNightWitchKill: phase === 'night_witch' && isWitch && state.alive[viewerId] === true,
    canNightConstableSave:
      phase === 'night_constable' && isConstable && state.alive[viewerId] === true,
    canNightConfess:
      phase === 'night_confess' &&
      state.alive[viewerId] === true &&
      !state.confessedThisNight[viewerId],
    gameResult: state.result,
    lastEvent: state.lastEvent,
  };
}

/** Timer expiry for night phases */
export function applySalem1692NightExpiry(state: Salem1692State): Salem1692State {
  if (state.result) return state;
  if (state.nightStepEndsAtMs == null || Date.now() < state.nightStepEndsAtMs) return state;

  const next = cloneState(state);
  if (next.phase === 'night_witch') {
    const votes = Object.values(next.witchKillVotes);
    next.nightKillTownHallId = votes[votes.length - 1] ?? null;
    next.phase = 'night_constable';
    next.nightStepEndsAtMs = Date.now() + NIGHT_STEP_MS;
    next.lastEvent = 'Constable เลือก Gavel';
    return next;
  }
  if (next.phase === 'night_constable') {
    next.phase = 'night_confess';
    next.nightStepEndsAtMs = Date.now() + NIGHT_STEP_MS;
    next.lastEvent = 'Confess หรือข้าม';
    return next;
  }
  if (next.phase === 'night_confess') {
    resolveNight(next);
    return next;
  }
  return state;
}

export const salem1692Game: GameDefinition<Salem1692State, Salem1692Action> = {
  id: 'salem-1692',
  name: 'Salem 1692',
  description: 'หาตัว Witch ใน Salem — accusation, Conspiracy, Night 4–12 คน',
  minPlayers: 4,
  maxPlayers: 12,
  thumbnail: GAME_THUMBNAIL_BY_ID['salem-1692'] || '/games/salem-1692/cover.png',

  setup(players: Player[], options?: unknown): Salem1692State {
    const opts = parseSalem1692LobbyOptions(options);
    const order = players.map((p) => p.id);
    const tryalDeck = buildTryalDeck(order.length);
    const playingDeck = buildPlayingDeck();

    const state: Salem1692State = {
      phase: 'dawn',
      twoTownHallChoice: opts.twoTownHallChoice,
      playerOrder: order,
      playerNames: Object.fromEntries(players.map((p) => [p.id, p.name])),
      alive: Object.fromEntries(order.map((id) => [id, true])),
      tryalsByPlayer: {},
      everWitch: Object.fromEntries(order.map((id) => [id, false])),
      isConstable: Object.fromEntries(order.map((id) => [id, false])),
      townHallByPlayer: {},
      hands: Object.fromEntries(order.map((id) => [id, [] as Salem1692PlayingCard[]])),
      drawPile: playingDeck,
      discardPile: [],
      blueCardsByPlayer: Object.fromEntries(order.map((id) => [id, []])),
      accusationPointsByPlayer: Object.fromEntries(order.map((id) => [id, 0])),
      blackCatHolderId: null,
      gavelHolderId: null,
      currentPlayerId: null,
      hasDrawnThisTurn: Object.fromEntries(order.map((id) => [id, false])),
      skippedNextTurn: Object.fromEntries(order.map((id) => [id, false])),
      nightKillTownHallId: null,
      witchKillVotes: {},
      confessedThisNight: {},
      confessedTryalId: {},
      pendingAccusation: null,
      pendingConspiracy: null,
      revealedWitchTryalIds: [],
      totalWitchTryalIds: [],
      nightStepEndsAtMs: null,
      lastEvent: 'Dawn — Witches เลือก Black Cat',
      result: null,
    };

    dealTryalsToPlayers(state, tryalDeck);
    assignTownHalls(state);
    dealInitialHands(state);

    return state;
  },

  onAction(state: Salem1692State, playerId: string, action: Salem1692Action): Salem1692State {
    if (state.result && state.phase === 'game_over') {
      throw new GameActionRejectedError('เกมจบแล้ว');
    }
    if (!state.alive[playerId] && action.type !== 'ack_night_result') {
      throw new GameActionRejectedError('คุณตายแล้ว');
    }

    const next = cloneState(state);

    switch (action.type) {
      case 'dawn_place_black_cat': {
        if (next.phase !== 'dawn') throw new GameActionRejectedError('ไม่ใช่ Dawn');
        if (!next.everWitch[playerId]) throw new GameActionRejectedError('เฉพาะ Witch');
        if (!next.alive[action.targetId]) throw new GameActionRejectedError('ไม่มีผู้เล่น');
        next.blackCatHolderId = action.targetId;
        next.blueCardsByPlayer[action.targetId] = [
          ...(next.blueCardsByPlayer[action.targetId] ?? []),
          'alibi',
        ];
        next.phase = 'playing';
        next.currentPlayerId = action.targetId;
        next.hasDrawnThisTurn[action.targetId] = false;
        next.lastEvent = `Black Cat → ${next.playerNames[action.targetId]}`;
        break;
      }

      case 'draw_two': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (next.currentPlayerId !== playerId) throw new GameActionRejectedError('ยังไม่ถึงเทิร์น');
        if (next.hasDrawnThisTurn[playerId]) throw new GameActionRejectedError('จั่วแล้ว');
        if (next.pendingAccusation) throw new GameActionRejectedError('ต้องเปิด Tryal ก่อน');
        drawCards(next, playerId, 2);
        if (next.phase === 'playing') {
          next.hasDrawnThisTurn[playerId] = true;
          advanceToNextPlayer(next);
        }
        break;
      }

      case 'play_card': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (next.currentPlayerId !== playerId) throw new GameActionRejectedError('ยังไม่ถึงเทิร์น');
        if (next.pendingAccusation) throw new GameActionRejectedError('ต้องเปิด Tryal ก่อน');
        const hand = next.hands[playerId] ?? [];
        const card = removeFromHand(hand, action.cardId);
        if (!card) throw new GameActionRejectedError('ไม่มีการ์ดในมือ');
        next.hands[playerId] = hand;
        applyCardPlay(next, playerId, card, action.targetId, action.secondTargetId);
        if (next.phase === 'playing' && !next.pendingAccusation) {
          advanceToNextPlayer(next);
        }
        break;
      }

      case 'reveal_tryal_on_accusation': {
        const pending = next.pendingAccusation;
        if (!pending || pending.actorId !== playerId) {
          throw new GameActionRejectedError('ไม่ใช่ช่วงเปิด Tryal');
        }
        if (pending.targetId !== action.targetId) {
          throw new GameActionRejectedError('เป้าหมายไม่ตรง');
        }
        const revealed = revealTryal(next, action.targetId, action.tryalId);
        if (!revealed) throw new GameActionRejectedError('Tryal ไม่ถูกต้อง');
        next.accusationPointsByPlayer[action.targetId] = 0;
        next.pendingAccusation = null;
        checkDeathAfterReveal(next, action.targetId);
        if (!applyWinIfAny(next)) advanceToNextPlayer(next);
        break;
      }

      case 'conspiracy_reveal_tryal': {
        const pc = next.pendingConspiracy;
        if (!pc || next.phase !== 'conspiracy')
          throw new GameActionRejectedError('ไม่ใช่ Conspiracy');
        if (
          next.blackCatHolderId &&
          next.blackCatHolderId === playerId &&
          !pc.blackCatTryalRevealed
        ) {
          revealTryal(next, playerId, action.tryalId);
          pc.blackCatTryalRevealed = true;
        }
        break;
      }

      case 'conspiracy_ack_view': {
        if (!next.pendingConspiracy || next.phase !== 'conspiracy') {
          throw new GameActionRejectedError('ไม่ใช่ Conspiracy');
        }
        if (!next.pendingConspiracy.blackCatTryalRevealed && next.blackCatHolderId) {
          next.pendingConspiracy.awaitingView = true;
          break;
        }
        passTryalsLeft(next);
        resolveConspiracyView(next);
        break;
      }

      case 'night_witch_kill': {
        if (next.phase !== 'night_witch') throw new GameActionRejectedError('ไม่ใช่ Night');
        if (!next.everWitch[playerId]) throw new GameActionRejectedError('เฉพาะ Witch');
        next.witchKillVotes[playerId] = action.townHallId;
        const witches = witchTeamIds(next);
        const voted = witches.filter((id) => next.witchKillVotes[id] != null);
        if (voted.length < witches.length) break;
        const votes = voted.map((id) => next.witchKillVotes[id]!);
        next.nightKillTownHallId = votes[votes.length - 1]!;
        next.phase = 'night_constable';
        next.nightStepEndsAtMs = Date.now() + NIGHT_STEP_MS;
        next.lastEvent = 'Constable เลือก Gavel';
        break;
      }

      case 'night_constable_save': {
        if (next.phase !== 'night_constable') throw new GameActionRejectedError('ไม่ใช่ Night');
        if (!next.isConstable[playerId]) throw new GameActionRejectedError('เฉพาะ Constable');
        if (action.targetId === playerId) throw new GameActionRejectedError('ห้ามเลือกตัวเอง');
        next.gavelHolderId = action.targetId;
        next.phase = 'night_confess';
        next.nightStepEndsAtMs = Date.now() + NIGHT_STEP_MS;
        next.lastEvent = 'Confess หรือข้าม';
        break;
      }

      case 'night_confess': {
        if (next.phase !== 'night_confess') throw new GameActionRejectedError('ไม่ใช่ Night');
        revealTryal(next, playerId, action.tryalId);
        next.confessedThisNight[playerId] = true;
        next.confessedTryalId[playerId] = action.tryalId;
        break;
      }

      case 'night_skip_confess': {
        if (next.phase !== 'night_confess') throw new GameActionRejectedError('ไม่ใช่ Night');
        next.confessedThisNight[playerId] = true;
        break;
      }

      case 'ack_night_result': {
        if (
          next.phase !== 'night_confess' &&
          next.phase !== 'playing' &&
          next.phase !== 'night_witch' &&
          next.phase !== 'night_constable'
        ) {
          throw new GameActionRejectedError('ไม่มีผล Night');
        }
        const living = livingPlayers(next);
        const allConfessed = living.every((id) => next.confessedThisNight[id]);
        if (next.phase === 'night_confess' && !allConfessed) break;
        resolveNight(next);
        break;
      }

      default:
        throw new GameActionRejectedError('action ไม่รู้จัก');
    }

    applyWinIfAny(next);
    return next;
  },

  getPlayerView(state: Salem1692State, playerId: string): Salem1692PlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: Salem1692State): GameResult | null {
    return state.result;
  },
};
