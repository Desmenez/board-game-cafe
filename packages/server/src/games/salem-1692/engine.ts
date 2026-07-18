import {
  buildPlayingDeck,
  buildTryalDeck,
  GAME_THUMBNAIL_BY_ID,
  isSalem1692BlackKind,
  isSalem1692BlueKind,
  isSalem1692RedKind,
  parseSalem1692LobbyOptions,
  salem1692AccusationValue,
  salem1692TryalComposition,
  SALEM_1692_TOWN_HALL_IDS,
  SALEM_1692_BLACK_CAT_SELECT_ID,
  type GameDefinition,
  type GameResult,
  type Player,
  type Salem1692Action,
  type Salem1692PlayerView,
  type Salem1692PlayingCard,
  type Salem1692SecretRole,
  type Salem1692State,
  type Salem1692TryalCard,
  type Salem1692NightSurviveReason,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

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
    frontCardsByPlayer: Object.fromEntries(
      Object.entries(state.frontCardsByPlayer).map(([k, v]) => [k, v.map(clonePlaying)]),
    ),
    matchmakerPartnerId: { ...state.matchmakerPartnerId },
    hasDrawnThisTurn: { ...state.hasDrawnThisTurn },
    cardsPlayedThisTurn: state.cardsPlayedThisTurn,
    witchKillVotes: { ...state.witchKillVotes },
    dawnBlackCatVotes: { ...state.dawnBlackCatVotes },
    confessedThisNight: { ...state.confessedThisNight },
    confessedTryalId: { ...state.confessedTryalId },
    pendingAccusation: state.pendingAccusation ? { ...state.pendingAccusation } : null,
    pendingConspiracy: state.pendingConspiracy
      ? {
          ...state.pendingConspiracy,
          passPicks: { ...state.pendingConspiracy.passPicks },
          peekAcknowledgedBy: [...state.pendingConspiracy.peekAcknowledgedBy],
        }
      : null,
    pendingNightResult: state.pendingNightResult
      ? {
          ...state.pendingNightResult,
          reasons: [...state.pendingNightResult.reasons],
          victimFrontCards: state.pendingNightResult.victimFrontCards.map(clonePlaying),
          victimTryals: state.pendingNightResult.victimTryals.map(cloneTryal),
        }
      : null,
    nightResultAcknowledgedBy: [...state.nightResultAcknowledgedBy],
    pendingStocksSkip: state.pendingStocksSkip ? { ...state.pendingStocksSkip } : null,
    pendingPlay: state.pendingPlay
      ? { actorId: state.pendingPlay.actorId, card: clonePlaying(state.pendingPlay.card) }
      : null,
    pendingDrawResume: state.pendingDrawResume ? { ...state.pendingDrawResume } : null,
    drawsLeftThisAction: state.drawsLeftThisAction,
    revealedWitchTryalIds: [...state.revealedWitchTryalIds],
    totalWitchTryalIds: [...state.totalWitchTryalIds],
    tryalComposition: { ...state.tryalComposition },
    compositionAcknowledgedBy: [...state.compositionAcknowledgedBy],
    roleAcknowledgedBy: [...state.roleAcknowledgedBy],
    result: state.result ? { ...state.result } : null,
  };
}

function livingPlayers(state: Salem1692State): string[] {
  return state.playerOrder.filter((id) => state.alive[id]);
}

function witchTeamIds(state: Salem1692State): string[] {
  return livingPlayers(state).filter((id) => state.everWitch[id]);
}

/** Face-down Witch tryals on `ownerId` — only when both viewer and owner are witches. */
function allyWitchTryalIdsFor(
  state: Salem1692State,
  viewerId: string,
  ownerId: string | null,
): string[] {
  if (!ownerId) return [];
  if (!state.everWitch[viewerId] || !state.everWitch[ownerId]) return [];
  return (state.tryalsByPlayer[ownerId] ?? [])
    .filter((t) => !t.revealed && t.kind === 'witch')
    .map((t) => t.id);
}

function syncRolesFromTryals(state: Salem1692State, playerId: string): void {
  const tryals = state.tryalsByPlayer[playerId] ?? [];
  if (tryals.some((t) => t.kind === 'witch')) state.everWitch[playerId] = true;
  state.isConstable[playerId] = tryals.some((t) => t.kind === 'constable');
}

function frontOf(state: Salem1692State, playerId: string): Salem1692PlayingCard[] {
  return state.frontCardsByPlayer[playerId] ?? [];
}

function stocksCountOf(state: Salem1692State, playerId: string): number {
  return frontOf(state, playerId).filter((c) => c.kind === 'stocks').length;
}

function consumeOneStocks(state: Salem1692State, playerId: string): boolean {
  const front = [...frontOf(state, playerId)];
  const idx = front.findIndex((c) => c.kind === 'stocks');
  if (idx < 0) return false;
  const [card] = front.splice(idx, 1);
  state.frontCardsByPlayer[playerId] = front;
  if (card) state.discardPile.push(clonePlaying(card));
  return true;
}

function hasFrontKind(
  state: Salem1692State,
  playerId: string,
  kind: Salem1692PlayingCard['kind'],
): boolean {
  return frontOf(state, playerId).some((c) => c.kind === kind);
}

function accusationPointsOf(state: Salem1692State, playerId: string): number {
  return frontOf(state, playerId)
    .filter((c) => isSalem1692RedKind(c.kind))
    .reduce((sum, c) => sum + salem1692AccusationValue(c.kind), 0);
}

function clearMatchmakerLink(state: Salem1692State, playerId: string): void {
  const partner = state.matchmakerPartnerId[playerId];
  const stripMm = (pid: string) => {
    const front = frontOf(state, pid);
    const mm = front.filter((c) => c.kind === 'matchmaker');
    if (mm.length > 0) state.discardPile.push(...mm.map(clonePlaying));
    state.frontCardsByPlayer[pid] = front.filter((c) => c.kind !== 'matchmaker');
    state.matchmakerPartnerId[pid] = null;
  };
  stripMm(playerId);
  if (partner) stripMm(partner);
}

function attachFront(state: Salem1692State, playerId: string, card: Salem1692PlayingCard): void {
  state.frontCardsByPlayer[playerId] = [...frontOf(state, playerId), clonePlaying(card)];
}

function dumpRedFrontToDiscard(state: Salem1692State, playerId: string): void {
  const front = frontOf(state, playerId);
  const reds = front.filter((c) => isSalem1692RedKind(c.kind));
  const rest = front.filter((c) => !isSalem1692RedKind(c.kind));
  state.discardPile.push(...reds.map(clonePlaying));
  state.frontCardsByPlayer[playerId] = rest;
}

function removeFrontCardsByIds(
  state: Salem1692State,
  playerId: string,
  cardIds: string[],
): Salem1692PlayingCard[] {
  const idSet = new Set(cardIds);
  const front = frontOf(state, playerId);
  const removed: Salem1692PlayingCard[] = [];
  const kept: Salem1692PlayingCard[] = [];
  for (const c of front) {
    if (idSet.has(c.id)) removed.push(c);
    else kept.push(c);
  }
  if (removed.length !== cardIds.length) {
    throw new GameActionRejectedError('เลือกการ์ดตรงหน้าไม่ถูกต้อง');
  }
  state.frontCardsByPlayer[playerId] = kept;
  if (removed.some((c) => c.kind === 'matchmaker')) {
    // Link cleanup without re-discarding cards already removed
    const partner = state.matchmakerPartnerId[playerId];
    state.matchmakerPartnerId[playerId] = null;
    if (partner) {
      state.matchmakerPartnerId[partner] = null;
      const pFront = frontOf(state, partner);
      const pMm = pFront.filter((c) => c.kind === 'matchmaker');
      if (pMm.length > 0) state.discardPile.push(...pMm.map(clonePlaying));
      state.frontCardsByPlayer[partner] = pFront.filter((c) => c.kind !== 'matchmaker');
    }
  }
  return removed;
}

function advanceToNextPlayer(state: Salem1692State): void {
  const living = livingPlayers(state);
  if (living.length === 0) {
    state.currentPlayerId = null;
    state.pendingStocksSkip = null;
    return;
  }
  const start = state.currentPlayerId ?? living[0]!;
  const idx = state.playerOrder.indexOf(start);
  for (let step = 1; step <= state.playerOrder.length; step += 1) {
    const pid = state.playerOrder[(idx + step) % state.playerOrder.length]!;
    if (!state.alive[pid]) continue;
    if (stocksCountOf(state, pid) > 0) {
      state.currentPlayerId = pid;
      state.drawsLeftThisAction = null;
      state.cardsPlayedThisTurn = 0;
      state.pendingStocksSkip = { playerId: pid };
      state.lastEvent = `${state.playerNames[pid]} โดน Stocks — ข้ามเทิร์น`;
      return;
    }
    state.pendingStocksSkip = null;
    state.currentPlayerId = pid;
    state.hasDrawnThisTurn[pid] = false;
    state.drawsLeftThisAction = null;
    state.cardsPlayedThisTurn = 0;
    return;
  }
  state.pendingStocksSkip = null;
  state.currentPlayerId = living[0] ?? null;
  state.drawsLeftThisAction = null;
  state.cardsPlayedThisTurn = 0;
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
  const partner = state.matchmakerPartnerId[playerId] ?? null;
  state.alive[playerId] = false;
  const hand = state.hands[playerId] ?? [];
  state.discardPile.push(...hand.map(clonePlaying));
  state.hands[playerId] = [];
  const front = frontOf(state, playerId);
  state.discardPile.push(...front.map(clonePlaying));
  state.frontCardsByPlayer[playerId] = [];
  clearMatchmakerLink(state, playerId);
  for (const tryal of state.tryalsByPlayer[playerId] ?? []) {
    if (!tryal.revealed) {
      tryal.revealed = true;
      if (tryal.kind === 'witch' && !state.revealedWitchTryalIds.includes(tryal.id)) {
        state.revealedWitchTryalIds.push(tryal.id);
      }
    }
  }
  if (state.blackCatHolderId === playerId) state.blackCatHolderId = null;
  if (state.gavelHolderId === playerId) state.gavelHolderId = null;
  state.lastEvent = `${state.playerNames[playerId]} ตาย — ${reason}`;
  if (partner && state.alive[partner]) {
    killPlayer(state, partner, 'Matchmaker');
  }
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

function livingConstableIds(state: Salem1692State): string[] {
  return livingPlayers(state).filter((id) => state.isConstable[id]);
}

function nightWitchKillConsensus(state: Salem1692State): string | null {
  const witches = witchTeamIds(state);
  if (witches.length === 0) return null;
  const votes = witches.map((id) => state.witchKillVotes[id]);
  if (votes.some((v) => v == null || v === '')) return null;
  const first = votes[0]!;
  return votes.every((v) => v === first) ? first : null;
}

function beginNight(state: Salem1692State): void {
  state.phase = 'night_witch';
  state.nightKillPlayerId = null;
  state.witchKillVotes = {};
  state.gavelHolderId = null;
  state.confessedThisNight = {};
  state.confessedTryalId = {};
  state.pendingNightResult = null;
  state.nightResultAcknowledgedBy = [];
  state.nightStepEndsAtMs = null;
  state.lastEvent = 'Night — Witches เลือกผู้เล่นที่จะฆ่า';
}

function enterNightConstableOrConfess(state: Salem1692State): void {
  if (livingConstableIds(state).length === 0) {
    enterNightConfess(state);
    return;
  }
  state.phase = 'night_constable';
  state.lastEvent = 'Night — Constable มอบ Gavel';
}

function enterNightConfess(state: Salem1692State): void {
  state.phase = 'night_confess';
  // Gavel holders skip confess step automatically.
  if (state.gavelHolderId && state.alive[state.gavelHolderId]) {
    state.confessedThisNight[state.gavelHolderId] = true;
  }
  maybeFinishNightConfess(state);
  if (state.phase === 'night_confess') {
    state.lastEvent = 'Night — Confess (เปิด Tryal) หรือข้าม';
  }
}

function maybeFinishNightConfess(state: Salem1692State): void {
  if (state.phase !== 'night_confess') return;
  const living = livingPlayers(state);
  if (!living.every((id) => state.confessedThisNight[id] === true)) return;
  enterNightResult(state);
}

function enterNightResult(state: Salem1692State): void {
  const victimId = state.nightKillPlayerId;
  const reasons: Salem1692NightSurviveReason[] = [];
  let survived = true;
  let killed = false;
  const frontBeforeKill = victimId ? frontOf(state, victimId).map(clonePlaying) : [];
  const hadBlackCat = victimId != null && state.blackCatHolderId === victimId;

  if (victimId && state.alive[victimId]) {
    const savedByGavel = state.gavelHolderId === victimId;
    const confessed = Boolean(state.confessedTryalId[victimId]);
    const asylum = hasFrontKind(state, victimId, 'asylum');
    if (savedByGavel) reasons.push('gavel');
    if (confessed) reasons.push('confess');
    if (asylum) reasons.push('asylum');
    survived = reasons.length > 0;
    if (!survived) {
      killPlayer(state, victimId, 'ถูกฆ่ากลางคืน');
      killed = true;
    } else {
      state.lastEvent = `${state.playerNames[victimId]} รอดจาก Night`;
    }
  } else {
    survived = true;
  }

  const victimTryals =
    killed && victimId ? (state.tryalsByPlayer[victimId] ?? []).map(cloneTryal) : [];

  state.pendingNightResult = {
    victimId,
    victimName: victimId ? (state.playerNames[victimId] ?? victimId) : null,
    survived,
    reasons,
    killed,
    victimFrontCards: killed ? frontBeforeKill : [],
    victimHadBlackCat: killed ? hadBlackCat : false,
    victimTryals,
  };
  state.nightResultAcknowledgedBy = [];
  state.phase = 'night_result';
  state.gavelHolderId = null;
  state.nightStepEndsAtMs = null;
  if (applyWinIfAny(state)) {
    state.pendingNightResult = null;
    return;
  }
  state.lastEvent = victimId
    ? killed
      ? `Night — ${state.playerNames[victimId]} ตาย`
      : `Night — ${state.playerNames[victimId]} รอด`
    : 'Night — ไม่มีเป้าหมาย';
}

function finishNightAfterResultAcks(state: Salem1692State): void {
  const killedSomeone = state.pendingNightResult?.killed === true;
  state.pendingNightResult = null;
  state.nightResultAcknowledgedBy = [];
  state.nightKillPlayerId = null;
  state.witchKillVotes = {};
  state.confessedThisNight = {};
  state.confessedTryalId = {};
  reshuffleDeck(state);
  if (applyWinIfAny(state)) return;
  state.phase = 'playing';
  resumePendingDrawOrAdvance(state, 'advance_if_current_dead', killedSomeone);
  if (state.drawsLeftThisAction != null) {
    state.lastEvent = `Night จบ — สับกองแล้ว · จั่วต่ออีก ${state.drawsLeftThisAction} ใบ`;
  } else {
    state.lastEvent = 'Night จบ — สับกองแล้วเล่นต่อ';
  }
}

function beginConspiracy(state: Salem1692State, revealerId: string): void {
  state.phase = 'conspiracy';
  const holderId = state.blackCatHolderId;
  const needsReveal = holderId != null;
  state.pendingConspiracy = {
    step: needsReveal ? 'reveal' : 'pass',
    revealerId,
    blackCatHolderId: holderId,
    blackCatTryalRevealed: !needsReveal,
    selectedTryalId: null,
    revealedTryalId: null,
    revealedKind: null,
    passPicks: {},
    peekAcknowledgedBy: [],
  };
  const holderName = holderId ? (state.playerNames[holderId] ?? holderId) : null;
  if (needsReveal) {
    state.lastEvent = `Conspiracy — ${state.playerNames[revealerId]} เลือกเปิด Tryal ของ ${holderName}`;
  } else {
    enterConspiracyPass(state);
    state.lastEvent = 'Conspiracy — ไม่มี Black Cat · เลือก Tryal จากคนทางซ้าย';
  }
}

/** Next living seat in playerOrder = “คนทางซ้าย”. */
function leftNeighborId(state: Salem1692State, playerId: string): string | null {
  const order = state.playerOrder;
  const idx = order.indexOf(playerId);
  if (idx < 0) return null;
  for (let step = 1; step < order.length; step += 1) {
    const nid = order[(idx + step) % order.length]!;
    if (state.alive[nid]) return nid;
  }
  return null;
}

function unrevealedTryalIdsOf(state: Salem1692State, playerId: string): string[] {
  return (state.tryalsByPlayer[playerId] ?? []).filter((t) => !t.revealed).map((t) => t.id);
}

function enterConspiracyPass(state: Salem1692State): void {
  const pc = state.pendingConspiracy;
  if (!pc) return;
  pc.step = 'pass';
  pc.passPicks = {};
  pc.peekAcknowledgedBy = [];
  for (const pid of livingPlayers(state)) {
    const left = leftNeighborId(state, pid);
    if (!left || unrevealedTryalIdsOf(state, left).length === 0) {
      pc.passPicks[pid] = null;
    }
  }
  maybeApplyConspiracyPass(state);
}

/**
 * Each living player takes one face-down Tryal from the living neighbor on their left.
 * Revealed Tryals never move. Applied only when every living player has a pick entry.
 */
function maybeApplyConspiracyPass(state: Salem1692State): void {
  const pc = state.pendingConspiracy;
  if (!pc || pc.step !== 'pass') return;
  const living = livingPlayers(state);
  if (living.length === 0) {
    enterConspiracyPeek(state);
    return;
  }
  if (!living.every((id) => Object.prototype.hasOwnProperty.call(pc.passPicks, id))) {
    state.lastEvent = `Conspiracy — รอเลือก Tryal จากคนทางซ้าย (${Object.keys(pc.passPicks).length}/${living.length})`;
    return;
  }

  type Move = { from: string; to: string; tryalId: string };
  const moves: Move[] = [];
  for (const to of living) {
    const tryalId = pc.passPicks[to];
    if (tryalId == null) continue;
    const from = leftNeighborId(state, to);
    if (!from) continue;
    moves.push({ from, to, tryalId });
  }

  const bags: Record<string, Salem1692TryalCard[]> = {};
  for (const id of state.playerOrder) {
    bags[id] = (state.tryalsByPlayer[id] ?? []).map(cloneTryal);
  }

  for (const move of moves) {
    const fromBag = bags[move.from] ?? [];
    const idx = fromBag.findIndex((t) => t.id === move.tryalId && !t.revealed);
    if (idx < 0) continue;
    const [card] = fromBag.splice(idx, 1);
    bags[move.from] = fromBag;
    if (card) bags[move.to] = [...(bags[move.to] ?? []), cloneTryal(card)];
  }

  for (const id of state.playerOrder) {
    state.tryalsByPlayer[id] = bags[id] ?? [];
    if (state.alive[id]) syncRolesFromTryals(state, id);
  }

  enterConspiracyPeek(state);
  state.lastEvent = 'Conspiracy — ดู Tryal ชุดใหม่ของตัวเอง';
}

function enterConspiracyPeek(state: Salem1692State): void {
  const pc = state.pendingConspiracy;
  if (!pc) return;
  pc.step = 'peek';
  pc.peekAcknowledgedBy = [];
}

/**
 * After Night/Conspiracy: restore interrupted draw quota for the actor (they must
 * draw remaining cards manually), or advance the turn if there is nothing left.
 */
function resumePendingDrawOrAdvance(
  state: Salem1692State,
  fallback: 'advance' | 'advance_if_current_dead',
  killed = false,
): void {
  const pending = state.pendingDrawResume;
  if (pending) {
    state.pendingDrawResume = null;
    if (!state.alive[pending.playerId]) {
      advanceToNextPlayer(state);
      return;
    }
    state.currentPlayerId = pending.playerId;
    if (pending.remaining <= 0) {
      state.hasDrawnThisTurn[pending.playerId] = true;
      state.drawsLeftThisAction = null;
      advanceToNextPlayer(state);
      return;
    }
    // Do not auto-draw — wait for the player to draw (may hit Conspiracy/Night again).
    state.drawsLeftThisAction = pending.remaining;
    state.lastEvent = `${state.playerNames[pending.playerId]} จั่วต่อได้อีก ${pending.remaining} ใบ`;
    return;
  }

  if (fallback === 'advance') {
    advanceToNextPlayer(state);
    return;
  }
  if (!killed) advanceToNextPlayer(state);
  else if (state.currentPlayerId && !state.alive[state.currentPlayerId]) {
    advanceToNextPlayer(state);
  }
}

function resolveConspiracyView(state: Salem1692State): void {
  state.pendingConspiracy = null;
  state.phase = 'playing';
  // Conspiracy counts as one of the two draws — remaining quota waits for manual draw.
  resumePendingDrawOrAdvance(state, 'advance');
  if (state.drawsLeftThisAction != null) {
    state.lastEvent = `Conspiracy จบ — จั่วต่ออีก ${state.drawsLeftThisAction} ใบ`;
  } else {
    state.lastEvent = 'Conspiracy จบ — เล่นต่อ';
  }
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

/** Draw one card from the top. Returns false if phase left `playing` (Night/Conspiracy). */
function drawOneCard(state: Salem1692State, actorId: string): boolean {
  if (state.drawPile.length === 0) return true;
  const card = state.drawPile.shift()!;
  if (isSalem1692BlackKind(card.kind)) {
    resolveBlackCard(state, card, actorId);
    return state.phase === 'playing';
  }
  const hand = state.hands[actorId] ?? [];
  hand.push(card);
  state.hands[actorId] = hand;
  return true;
}

/**
 * Consume `drawsLeftThisAction` one-by-one. On Night/Conspiracy interrupt, stash
 * remaining draws in `pendingDrawResume` (excluding the black card already resolved).
 */
function finishDrawQuota(state: Salem1692State, actorId: string): void {
  while ((state.drawsLeftThisAction ?? 0) > 0 && state.phase === 'playing') {
    if (state.drawPile.length === 0) break;
    const leftBefore = state.drawsLeftThisAction!;
    const stillPlaying = drawOneCard(state, actorId);
    state.drawsLeftThisAction = leftBefore - 1;
    if (!stillPlaying) {
      state.pendingDrawResume = {
        playerId: actorId,
        remaining: Math.max(0, state.drawsLeftThisAction),
      };
      state.drawsLeftThisAction = null;
      return;
    }
  }
  if (state.phase === 'playing') {
    state.drawsLeftThisAction = null;
    state.hasDrawnThisTurn[actorId] = true;
    advanceToNextPlayer(state);
  }
}

/** Pull one card toward the turn's two-card draw quota. */
function drawOneTowardQuota(state: Salem1692State, actorId: string): void {
  if (state.drawsLeftThisAction == null) state.drawsLeftThisAction = 2;
  if (state.drawPile.length === 0) {
    state.drawsLeftThisAction = null;
    state.hasDrawnThisTurn[actorId] = true;
    advanceToNextPlayer(state);
    return;
  }
  const leftBefore = state.drawsLeftThisAction;
  const stillPlaying = drawOneCard(state, actorId);
  state.drawsLeftThisAction = leftBefore - 1;
  if (!stillPlaying) {
    state.pendingDrawResume = {
      playerId: actorId,
      remaining: Math.max(0, state.drawsLeftThisAction),
    };
    state.drawsLeftThisAction = null;
    return;
  }
  if (state.drawsLeftThisAction <= 0) {
    state.drawsLeftThisAction = null;
    state.hasDrawnThisTurn[actorId] = true;
    advanceToNextPlayer(state);
    return;
  }
  state.lastEvent = `${state.playerNames[actorId]} จั่วแล้ว — เหลือจั่วอีก ${state.drawsLeftThisAction} ใบ`;
}

function applyCardPlay(
  state: Salem1692State,
  actorId: string,
  card: Salem1692PlayingCard,
  targetId?: string,
  secondTargetId?: string,
  selectedCardIds?: string[],
): void {
  if (targetId === actorId || secondTargetId === actorId) {
    throw new GameActionRejectedError('ห้ามเล่นกับตัวเอง');
  }
  const living = livingPlayers(state);
  if (targetId && !living.includes(targetId)) {
    throw new GameActionRejectedError('ไม่มีผู้เล่นเป้าหมาย');
  }
  if (secondTargetId && !living.includes(secondTargetId)) {
    throw new GameActionRejectedError('ไม่มีผู้เล่นเป้าหมาย');
  }

  switch (card.kind) {
    case 'accusation':
    case 'evidence':
    case 'witness': {
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      if (hasFrontKind(state, targetId, 'piety')) {
        throw new GameActionRejectedError('ผู้เล่นมี Piety — เล่นการ์ดแดงไม่ได้');
      }
      attachFront(state, targetId, card);
      const pts = accusationPointsOf(state, targetId);
      if (pts >= ACCUSATION_REVEAL_THRESHOLD) {
        dumpRedFrontToDiscard(state, targetId);
        state.pendingAccusation = {
          actorId,
          targetId,
          selectedTryalId: null,
          revealedTryalId: null,
          revealedKind: null,
        };
        state.lastEvent = `${state.playerNames[targetId]} ครบ ${ACCUSATION_REVEAL_THRESHOLD} accusations`;
      } else {
        state.lastEvent = `${state.playerNames[actorId]} ใส่ ${card.kind} ให้ ${state.playerNames[targetId]} (${pts} แต้ม)`;
      }
      break;
    }
    case 'piety':
    case 'asylum': {
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      attachFront(state, targetId, card);
      state.lastEvent = `${state.playerNames[actorId]} เล่น ${card.kind} ให้ ${state.playerNames[targetId]}`;
      break;
    }
    case 'matchmaker': {
      if (!targetId || !secondTargetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น 2 คน');
      if (state.matchmakerPartnerId[targetId] || state.matchmakerPartnerId[secondTargetId]) {
        throw new GameActionRejectedError('ผู้เล่นมี Matchmaker อยู่แล้ว');
      }
      // One physical card sits on first target; second gets a cloned marker
      attachFront(state, targetId, card);
      attachFront(state, secondTargetId, {
        id: `${card.id}-link`,
        kind: 'matchmaker',
        color: 'blue',
      });
      state.matchmakerPartnerId[targetId] = secondTargetId;
      state.matchmakerPartnerId[secondTargetId] = targetId;
      state.lastEvent = `Matchmaker — ${state.playerNames[targetId]} ↔ ${state.playerNames[secondTargetId]}`;
      break;
    }
    case 'stocks': {
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      attachFront(state, targetId, card);
      const n = stocksCountOf(state, targetId);
      state.lastEvent = `${state.playerNames[actorId]} วาง Stocks ให้ ${state.playerNames[targetId]} (${n} ใบ)`;
      break;
    }
    case 'curse': {
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      const ids = selectedCardIds ?? [];
      if (ids.length !== 1) throw new GameActionRejectedError('ต้องเลือกการ์ดน้ำเงิน 1 ใบ');
      const pickId = ids[0]!;
      if (pickId === SALEM_1692_BLACK_CAT_SELECT_ID) {
        if (state.blackCatHolderId !== targetId) {
          throw new GameActionRejectedError('เป้าหมายไม่มี Black Cat');
        }
        state.blackCatHolderId = null;
        state.discardPile.push(clonePlaying(card));
        state.lastEvent = `Curse — ทิ้ง Black Cat ของ ${state.playerNames[targetId]}`;
        break;
      }
      const removed = removeFrontCardsByIds(state, targetId, ids);
      if (!removed.every((c) => isSalem1692BlueKind(c.kind))) {
        throw new GameActionRejectedError('Curse เลือกได้เฉพาะการ์ดน้ำเงินหรือ Black Cat');
      }
      state.discardPile.push(...removed.map(clonePlaying));
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = `Curse — ทิ้งการ์ดน้ำเงินของ ${state.playerNames[targetId]}`;
      break;
    }
    case 'alibi': {
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      const ids = selectedCardIds ?? [];
      if (ids.length < 1 || ids.length > 3) {
        throw new GameActionRejectedError('เลือก accusation 1–3 ใบ');
      }
      const removed = removeFrontCardsByIds(state, targetId, ids);
      if (!removed.every((c) => isSalem1692RedKind(c.kind))) {
        throw new GameActionRejectedError('Alibi เลือกได้เฉพาะการ์ดแดง');
      }
      state.discardPile.push(...removed.map(clonePlaying));
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = `Alibi — ทิ้ง ${removed.length} accusation ของ ${state.playerNames[targetId]}`;
      break;
    }
    case 'arson': {
      if (!targetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น');
      const hand = state.hands[targetId] ?? [];
      state.discardPile.push(...hand.map(clonePlaying));
      state.hands[targetId] = [];
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = `Arson — ทิ้งมือของ ${state.playerNames[targetId]}`;
      break;
    }
    case 'robbery': {
      if (!targetId || !secondTargetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น 2 คน');
      const stolen = [...(state.hands[targetId] ?? [])];
      if (stolen.length === 0) throw new GameActionRejectedError('เป้าหมายไม่มีการ์ดในมือ');
      state.hands[targetId] = [];
      state.hands[secondTargetId] = [...(state.hands[secondTargetId] ?? []), ...stolen];
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = `Robbery — ย้ายมือ ${state.playerNames[targetId]} → ${state.playerNames[secondTargetId]}`;
      break;
    }
    case 'scapegoat': {
      if (!targetId || !secondTargetId) throw new GameActionRejectedError('ต้องเลือกผู้เล่น 2 คน');
      const moving = frontOf(state, targetId).map(clonePlaying);
      state.frontCardsByPlayer[targetId] = [];
      // Transfer matchmaker link with the cards
      const partnerOfTarget = state.matchmakerPartnerId[targetId];
      if (partnerOfTarget) {
        state.matchmakerPartnerId[targetId] = null;
        if (partnerOfTarget === secondTargetId) {
          // Moving matchmaker onto the linked partner — clear both
          state.matchmakerPartnerId[secondTargetId] = null;
          state.frontCardsByPlayer[secondTargetId] = frontOf(state, secondTargetId).filter(
            (c) => c.kind !== 'matchmaker',
          );
          const mm = moving.filter((c) => c.kind === 'matchmaker');
          const rest = moving.filter((c) => c.kind !== 'matchmaker');
          state.discardPile.push(...mm);
          state.frontCardsByPlayer[secondTargetId] = [...frontOf(state, secondTargetId), ...rest];
        } else if (state.matchmakerPartnerId[secondTargetId]) {
          throw new GameActionRejectedError('เป้าหมายที่ 2 มี Matchmaker อยู่แล้ว');
        } else {
          state.matchmakerPartnerId[secondTargetId] = partnerOfTarget;
          state.matchmakerPartnerId[partnerOfTarget] = secondTargetId;
          state.frontCardsByPlayer[secondTargetId] = [...frontOf(state, secondTargetId), ...moving];
        }
      } else {
        state.frontCardsByPlayer[secondTargetId] = [...frontOf(state, secondTargetId), ...moving];
      }
      if (state.blackCatHolderId === targetId) {
        state.blackCatHolderId = secondTargetId;
      }
      state.discardPile.push(clonePlaying(card));
      state.lastEvent = `Scapegoat — ย้ายการ์ดตรงหน้า ${state.playerNames[targetId]} → ${state.playerNames[secondTargetId]}`;
      break;
    }
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

function secretRoleFor(state: Salem1692State, playerId: string): Salem1692SecretRole {
  if (state.everWitch[playerId]) return 'witch';
  if (state.isConstable[playerId]) return 'constable';
  return 'townsfolk';
}

function dawnBlackCatConsensus(state: Salem1692State): string | null {
  const witches = witchTeamIds(state);
  if (witches.length === 0) return null;
  const votes = witches.map((id) => state.dawnBlackCatVotes[id]);
  if (votes.some((v) => v == null || v === '')) return null;
  const first = votes[0]!;
  return votes.every((v) => v === first) ? first : null;
}

function placeBlackCatAndStart(state: Salem1692State, targetId: string): void {
  state.blackCatHolderId = targetId;
  state.phase = 'playing';
  state.currentPlayerId = targetId;
  state.hasDrawnThisTurn[targetId] = false;
  state.drawsLeftThisAction = null;
  state.cardsPlayedThisTurn = 0;
  state.pendingPlay = null;
  state.pendingDrawResume = null;
  state.dawnBlackCatVotes = {};
  state.lastEvent = `Black Cat → ${state.playerNames[targetId]}`;
}

/** Mark a resolved play-path card; turn continues until `end_turn`. */
function noteCardPlayed(state: Salem1692State): void {
  state.cardsPlayedThisTurn += 1;
}

function publicPlayerView(state: Salem1692State, id: string) {
  const partnerId = state.matchmakerPartnerId[id] ?? null;
  const isGameOver = state.phase === 'game_over';
  return {
    id,
    name: state.playerNames[id] ?? id,
    alive: state.alive[id] === true,
    townHallId: state.townHallByPlayer[id]!,
    accusationPoints: accusationPointsOf(state, id),
    frontCards: frontOf(state, id).map(clonePlaying),
    matchmakerPartnerId: partnerId,
    matchmakerPartnerName: partnerId ? (state.playerNames[partnerId] ?? partnerId) : null,
    revealedTryals: (state.tryalsByPlayer[id] ?? []).filter((t) => t.revealed).map((t) => t.kind),
    tryals: (state.tryalsByPlayer[id] ?? []).map((t) => ({
      id: t.id,
      revealed: isGameOver ? true : t.revealed,
      kind: isGameOver || t.revealed ? t.kind : null,
    })),
    hasBlackCat: state.blackCatHolderId === id,
    hasGavel: state.gavelHolderId === id,
    confessedThisNight: state.confessedThisNight[id] === true,
    handCount: (state.hands[id] ?? []).length,
    stocksCount: stocksCountOf(state, id),
    skippedNextTurn: stocksCountOf(state, id) > 0,
    endReveal: isGameOver
      ? {
          isWitchTeam: state.everWitch[id] === true,
          isConstable: state.isConstable[id] === true,
          secretRole: secretRoleFor(state, id),
        }
      : null,
  };
}

function toPlayerView(state: Salem1692State, viewerId: string): Salem1692PlayerView {
  const isWitch = state.everWitch[viewerId] === true;
  const isConstable = state.isConstable[viewerId] === true;
  const phase = state.phase;
  const playerCount = state.playerOrder.length;
  const isIntro = phase === 'composition' || phase === 'role_reveal';

  return {
    phase,
    playerOrder: [...state.playerOrder],
    currentPlayerId: state.currentPlayerId,
    blackCatHolderId: state.blackCatHolderId,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    discardTop:
      state.discardPile.length > 0
        ? clonePlaying(state.discardPile[state.discardPile.length - 1]!)
        : null,
    drawsLeftThisAction: state.drawsLeftThisAction,
    cardsPlayedThisTurn: state.cardsPlayedThisTurn,
    revealedWitchTryalCount: state.revealedWitchTryalIds.length,
    totalWitchTryalCount: state.totalWitchTryalIds.length,
    nightStepEndsAtMs: null,
    players: state.playerOrder.map((id) => publicPlayerView(state, id)),
    you: {
      id: viewerId,
      name: state.playerNames[viewerId] ?? viewerId,
      alive: state.alive[viewerId] === true,
      tryals: (state.tryalsByPlayer[viewerId] ?? []).map(cloneTryal),
      isWitchTeam: isWitch,
      isConstable,
      secretRole: secretRoleFor(state, viewerId),
      townHallId: state.townHallByPlayer[viewerId]!,
      hand: isIntro ? [] : (state.hands[viewerId] ?? []).map(clonePlaying),
      frontCards: isIntro ? [] : frontOf(state, viewerId).map(clonePlaying),
      accusationPoints: accusationPointsOf(state, viewerId),
      matchmakerPartnerId: state.matchmakerPartnerId[viewerId] ?? null,
      matchmakerPartnerName: state.matchmakerPartnerId[viewerId]
        ? (state.playerNames[state.matchmakerPartnerId[viewerId]!] ?? null)
        : null,
      hasBlackCat: state.blackCatHolderId === viewerId,
      hasDrawnThisTurn: state.hasDrawnThisTurn[viewerId] === true,
    },
    tryalComposition: isIntro ? { ...state.tryalComposition } : null,
    hasAcknowledgedComposition: state.compositionAcknowledgedBy.includes(viewerId),
    compositionAcknowledgeProgress:
      phase === 'composition'
        ? { current: state.compositionAcknowledgedBy.length, total: playerCount }
        : null,
    hasAcknowledgedRole: state.roleAcknowledgedBy.includes(viewerId),
    roleAcknowledgeProgress:
      phase === 'role_reveal'
        ? { current: state.roleAcknowledgedBy.length, total: playerCount }
        : null,
    roleRevealWitchAllies:
      phase === 'role_reveal' && isWitch
        ? witchTeamIds(state)
            .filter((id) => id !== viewerId)
            .map((id) => ({ id, name: state.playerNames[id] ?? id }))
        : null,
    witchTeamIds: isWitch ? witchTeamIds(state) : null,
    dawnBlackCatVotes: phase === 'dawn' && isWitch ? { ...state.dawnBlackCatVotes } : null,
    dawnBlackCatConsensusTargetId:
      phase === 'dawn' && isWitch ? dawnBlackCatConsensus(state) : null,
    pendingAccusation: state.pendingAccusation
      ? {
          actorId: state.pendingAccusation.actorId,
          actorName: state.playerNames[state.pendingAccusation.actorId] ?? '',
          targetId: state.pendingAccusation.targetId,
          targetName: state.playerNames[state.pendingAccusation.targetId] ?? '',
          targetTryals: (state.tryalsByPlayer[state.pendingAccusation.targetId] ?? []).map((t) => ({
            id: t.id,
            revealed: t.revealed,
            kind: t.revealed || t.id === state.pendingAccusation!.revealedTryalId ? t.kind : null,
          })),
          unrevealedTryalIds: (state.tryalsByPlayer[state.pendingAccusation.targetId] ?? [])
            .filter((t) => !t.revealed || t.id === state.pendingAccusation!.revealedTryalId)
            .map((t) => t.id),
          selectedTryalId: state.pendingAccusation.selectedTryalId,
          revealedTryalId: state.pendingAccusation.revealedTryalId,
          revealedKind: state.pendingAccusation.revealedKind,
          allyWitchTryalIds: allyWitchTryalIdsFor(
            state,
            viewerId,
            state.pendingAccusation.targetId,
          ),
        }
      : null,
    pendingConspiracy: state.pendingConspiracy
      ? (() => {
          const pc = state.pendingConspiracy!;
          const living = livingPlayers(state);
          const leftId = pc.step === 'pass' ? leftNeighborId(state, viewerId) : null;
          const hasPassPicked = Object.prototype.hasOwnProperty.call(pc.passPicks, viewerId);
          const allyOwnerId = pc.step === 'pass' ? leftId : pc.blackCatHolderId;
          return {
            step: pc.step,
            revealerId: pc.revealerId,
            revealerName: state.playerNames[pc.revealerId] ?? '',
            blackCatHolderId: pc.blackCatHolderId,
            blackCatHolderName: pc.blackCatHolderId
              ? (state.playerNames[pc.blackCatHolderId] ?? pc.blackCatHolderId)
              : null,
            blackCatUnrevealedTryalIds: pc.blackCatHolderId
              ? (state.tryalsByPlayer[pc.blackCatHolderId] ?? [])
                  .filter((t) => !t.revealed || t.id === pc.revealedTryalId)
                  .map((t) => t.id)
              : [],
            selectedTryalId: pc.selectedTryalId,
            revealedTryalId: pc.revealedTryalId,
            revealedKind: pc.revealedKind,
            needsReveal: pc.step === 'reveal' && !pc.blackCatTryalRevealed,
            allyWitchTryalIds: allyWitchTryalIdsFor(state, viewerId, allyOwnerId),
            leftNeighborId: leftId,
            leftNeighborName: leftId ? (state.playerNames[leftId] ?? leftId) : null,
            leftTryals: leftId
              ? (state.tryalsByPlayer[leftId] ?? []).map((t) => ({
                  id: t.id,
                  revealed: t.revealed,
                  kind: t.revealed ? t.kind : null,
                }))
              : [],
            leftUnrevealedTryalIds: leftId ? unrevealedTryalIdsOf(state, leftId) : [],
            hasPassPicked,
            myPassPickId: hasPassPicked ? (pc.passPicks[viewerId] ?? null) : null,
            passProgress: {
              current: living.filter((id) => Object.prototype.hasOwnProperty.call(pc.passPicks, id))
                .length,
              total: living.length,
            },
            hasPeekAcknowledged: pc.peekAcknowledgedBy.includes(viewerId),
            peekProgress: {
              current: pc.peekAcknowledgedBy.filter((id) => state.alive[id]).length,
              total: living.length,
            },
          };
        })()
      : null,
    pendingStocksSkip: state.pendingStocksSkip
      ? {
          playerId: state.pendingStocksSkip.playerId,
          playerName: state.playerNames[state.pendingStocksSkip.playerId] ?? '',
          stocksRemainingAfter: Math.max(
            0,
            stocksCountOf(state, state.pendingStocksSkip.playerId) - 1,
          ),
        }
      : null,
    pendingPlay: state.pendingPlay
      ? {
          actorId: state.pendingPlay.actorId,
          actorName: state.playerNames[state.pendingPlay.actorId] ?? '',
          card: clonePlaying(state.pendingPlay.card),
        }
      : null,
    nightWitchKillVotes: phase === 'night_witch' && isWitch ? { ...state.witchKillVotes } : null,
    nightWitchKillConsensusTargetId:
      phase === 'night_witch' && isWitch ? nightWitchKillConsensus(state) : null,
    nightKillPlayerId: state.nightKillPlayerId,
    nightKillPlayerName: state.nightKillPlayerId
      ? (state.playerNames[state.nightKillPlayerId] ?? state.nightKillPlayerId)
      : null,
    gavelHolderId: state.gavelHolderId,
    gavelHolderName: state.gavelHolderId
      ? (state.playerNames[state.gavelHolderId] ?? state.gavelHolderId)
      : null,
    pendingNightResult: state.pendingNightResult
      ? {
          ...state.pendingNightResult,
          reasons: [...state.pendingNightResult.reasons],
          victimFrontCards: state.pendingNightResult.victimFrontCards.map(clonePlaying),
          victimTryals: state.pendingNightResult.victimTryals.map(cloneTryal),
          ackProgress: {
            current: state.nightResultAcknowledgedBy.filter((id) => state.alive[id]).length,
            total: livingPlayers(state).length,
          },
          hasAcknowledged: state.nightResultAcknowledgedBy.includes(viewerId),
        }
      : null,
    canDawnBlackCat: phase === 'dawn' && isWitch && state.alive[viewerId] === true,
    canNightWitchKill: phase === 'night_witch' && isWitch && state.alive[viewerId] === true,
    canNightConstableSave:
      phase === 'night_constable' && isConstable && state.alive[viewerId] === true,
    canNightConfess:
      phase === 'night_confess' &&
      state.alive[viewerId] === true &&
      !state.confessedThisNight[viewerId],
    mustConfess:
      phase === 'night_confess' &&
      state.alive[viewerId] === true &&
      !state.confessedThisNight[viewerId],
    hasConfessed: state.confessedThisNight[viewerId] === true,
    winningSide: (() => {
      if (phase !== 'game_over' || !state.result || state.result.winners.length === 0) return null;
      const allWitches = state.result.winners.every((id) => state.everWitch[id] === true);
      return allWitches ? 'witch' : 'town';
    })(),
    gameResult: state.result,
    lastEvent: state.lastEvent,
  };
}

/** Night is no longer timed — kept for socket-handler compatibility. */
export function applySalem1692NightExpiry(state: Salem1692State): Salem1692State {
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
    const order = shuffle(players.map((p) => p.id));
    const tryalDeck = buildTryalDeck(order.length);
    const playingDeck = buildPlayingDeck();
    const tryalComposition = salem1692TryalComposition(order.length);

    const state: Salem1692State = {
      phase: 'composition',
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
      frontCardsByPlayer: Object.fromEntries(order.map((id) => [id, [] as Salem1692PlayingCard[]])),
      matchmakerPartnerId: Object.fromEntries(order.map((id) => [id, null as string | null])),
      blackCatHolderId: null,
      gavelHolderId: null,
      currentPlayerId: null,
      hasDrawnThisTurn: Object.fromEntries(order.map((id) => [id, false])),
      cardsPlayedThisTurn: 0,
      nightKillPlayerId: null,
      witchKillVotes: {},
      dawnBlackCatVotes: {},
      confessedThisNight: {},
      confessedTryalId: {},
      pendingAccusation: null,
      pendingConspiracy: null,
      pendingNightResult: null,
      nightResultAcknowledgedBy: [],
      pendingStocksSkip: null,
      pendingPlay: null,
      pendingDrawResume: null,
      drawsLeftThisAction: null,
      revealedWitchTryalIds: [],
      totalWitchTryalIds: [],
      tryalComposition,
      compositionAcknowledgedBy: [],
      roleAcknowledgedBy: [],
      nightStepEndsAtMs: null,
      lastEvent: 'เปิดเผย Tryal ในเกมนี้',
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
    const isAckIntro =
      action.type === 'acknowledge_composition' || action.type === 'acknowledge_role';
    if (!state.alive[playerId] && action.type !== 'night_result_ack' && !isAckIntro) {
      throw new GameActionRejectedError('คุณตายแล้ว');
    }

    const next = cloneState(state);

    switch (action.type) {
      case 'acknowledge_composition': {
        if (next.phase !== 'composition') throw new GameActionRejectedError('ไม่ใช่ช่วงนี้');
        if (next.compositionAcknowledgedBy.includes(playerId)) break;
        next.compositionAcknowledgedBy = [...next.compositionAcknowledgedBy, playerId];
        if (next.compositionAcknowledgedBy.length === next.playerOrder.length) {
          next.phase = 'role_reveal';
          next.roleAcknowledgedBy = [];
          next.lastEvent = 'รับบทของตัวเอง';
        }
        break;
      }

      case 'acknowledge_role': {
        if (next.phase !== 'role_reveal') throw new GameActionRejectedError('ไม่ใช่ช่วงนี้');
        if (next.roleAcknowledgedBy.includes(playerId)) break;
        next.roleAcknowledgedBy = [...next.roleAcknowledgedBy, playerId];
        if (next.roleAcknowledgedBy.length === next.playerOrder.length) {
          next.phase = 'dawn';
          next.dawnBlackCatVotes = {};
          next.lastEvent = 'Dawn — Witches เลือก Black Cat';
        }
        break;
      }

      case 'dawn_select_black_cat': {
        if (next.phase !== 'dawn') throw new GameActionRejectedError('ไม่ใช่ Dawn');
        if (!next.everWitch[playerId]) throw new GameActionRejectedError('เฉพาะ Witch');
        if (!next.alive[action.targetId]) throw new GameActionRejectedError('ไม่มีผู้เล่น');
        next.dawnBlackCatVotes = { ...next.dawnBlackCatVotes, [playerId]: action.targetId };
        const consensus = dawnBlackCatConsensus(next);
        next.lastEvent = consensus
          ? `Witch ตกลงเป้า: ${next.playerNames[consensus]}`
          : 'Witch กำลังเลือก Black Cat…';
        break;
      }

      case 'dawn_confirm_black_cat': {
        if (next.phase !== 'dawn') throw new GameActionRejectedError('ไม่ใช่ Dawn');
        if (!next.everWitch[playerId]) throw new GameActionRejectedError('เฉพาะ Witch');
        const consensus = dawnBlackCatConsensus(next);
        if (!consensus) {
          throw new GameActionRejectedError('Witch ทุกคนต้องเลือกผู้เล่นคนเดียวกันก่อน');
        }
        placeBlackCatAndStart(next, consensus);
        break;
      }

      case 'draw_card': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (next.pendingStocksSkip) throw new GameActionRejectedError('ต้องยอมรับ Stocks ก่อน');
        if (next.currentPlayerId !== playerId) throw new GameActionRejectedError('ยังไม่ถึงเทิร์น');
        if (next.cardsPlayedThisTurn > 0) {
          throw new GameActionRejectedError('เล่นการ์ดไปแล้ว — จบเทิร์นด้วยปุ่มจบตา');
        }
        if (next.hasDrawnThisTurn[playerId]) throw new GameActionRejectedError('จั่วแล้ว');
        if (next.pendingPlay) throw new GameActionRejectedError('กำลังเล่นการ์ดอยู่');
        if (next.pendingAccusation) throw new GameActionRejectedError('ต้องเปิด Tryal ก่อน');
        drawOneTowardQuota(next, playerId);
        break;
      }

      case 'draw_two': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (next.pendingStocksSkip) throw new GameActionRejectedError('ต้องยอมรับ Stocks ก่อน');
        if (next.currentPlayerId !== playerId) throw new GameActionRejectedError('ยังไม่ถึงเทิร์น');
        if (next.cardsPlayedThisTurn > 0) {
          throw new GameActionRejectedError('เล่นการ์ดไปแล้ว — จบเทิร์นด้วยปุ่มจบตา');
        }
        if (next.hasDrawnThisTurn[playerId]) throw new GameActionRejectedError('จั่วแล้ว');
        if (next.pendingPlay) throw new GameActionRejectedError('กำลังเล่นการ์ดอยู่');
        if (next.pendingAccusation) throw new GameActionRejectedError('ต้องเปิด Tryal ก่อน');
        if (next.drawsLeftThisAction == null) next.drawsLeftThisAction = 2;
        finishDrawQuota(next, playerId);
        break;
      }

      case 'end_turn': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (next.pendingStocksSkip) throw new GameActionRejectedError('ต้องยอมรับ Stocks ก่อน');
        if (next.currentPlayerId !== playerId) throw new GameActionRejectedError('ยังไม่ถึงเทิร์น');
        if (next.cardsPlayedThisTurn < 1) {
          throw new GameActionRejectedError('ต้องเล่นการ์ดอย่างน้อย 1 ใบก่อนจบเทิร์น');
        }
        if (next.drawsLeftThisAction != null) {
          throw new GameActionRejectedError('กำลังจั่วอยู่');
        }
        if (next.pendingPlay) throw new GameActionRejectedError('กำลังเล่นการ์ดอยู่');
        if (next.pendingAccusation) throw new GameActionRejectedError('ต้องเปิด Tryal ก่อน');
        next.lastEvent = `${next.playerNames[playerId]} จบเทิร์น (เล่น ${next.cardsPlayedThisTurn} ใบ)`;
        advanceToNextPlayer(next);
        break;
      }

      case 'begin_play': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (next.pendingStocksSkip) throw new GameActionRejectedError('ต้องยอมรับ Stocks ก่อน');
        if (next.currentPlayerId !== playerId) throw new GameActionRejectedError('ยังไม่ถึงเทิร์น');
        if (next.drawsLeftThisAction != null) {
          throw new GameActionRejectedError('ต้องจั่วให้ครบก่อน');
        }
        if (next.hasDrawnThisTurn[playerId]) throw new GameActionRejectedError('จั่วจบเทิร์นแล้ว');
        if (next.pendingPlay) throw new GameActionRejectedError('กำลังเล่นการ์ดอยู่');
        if (next.pendingAccusation) throw new GameActionRejectedError('ต้องเปิด Tryal ก่อน');
        {
          const hand = next.hands[playerId] ?? [];
          const card = removeFromHand(hand, action.cardId);
          if (!card) throw new GameActionRejectedError('ไม่มีการ์ดในมือ');
          if (isSalem1692BlackKind(card.kind)) {
            throw new GameActionRejectedError('การ์ดดำเล่นจากมือไม่ได้');
          }
          next.hands[playerId] = hand;
          next.pendingPlay = { actorId: playerId, card: clonePlaying(card) };
          next.lastEvent = `${next.playerNames[playerId]} กำลังเล่น ${card.kind}`;
        }
        break;
      }

      case 'confirm_play': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (!next.pendingPlay || next.pendingPlay.actorId !== playerId) {
          throw new GameActionRejectedError('ไม่ได้กำลังเล่นการ์ด');
        }
        {
          const card = next.pendingPlay.card;
          next.pendingPlay = null;
          applyCardPlay(
            next,
            playerId,
            card,
            action.targetId,
            action.secondTargetId,
            action.selectedCardIds,
          );
          if (next.phase === 'playing') {
            noteCardPlayed(next);
            if (!next.pendingAccusation) {
              next.lastEvent = `${next.lastEvent} · เล่นแล้ว ${next.cardsPlayedThisTurn} ใบ — กดจบตาเมื่อพร้อม`;
            }
          }
        }
        break;
      }

      case 'cancel_play': {
        if (!next.pendingPlay || next.pendingPlay.actorId !== playerId) {
          throw new GameActionRejectedError('ไม่ได้กำลังเล่นการ์ด');
        }
        {
          const card = next.pendingPlay.card;
          next.pendingPlay = null;
          next.hands[playerId] = [...(next.hands[playerId] ?? []), clonePlaying(card)];
          next.lastEvent = `${next.playerNames[playerId]} ยกเลิกการเล่นการ์ด`;
        }
        break;
      }

      case 'play_card': {
        if (next.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ใช่ช่วงเล่น');
        if (next.pendingStocksSkip) throw new GameActionRejectedError('ต้องยอมรับ Stocks ก่อน');
        if (next.currentPlayerId !== playerId) throw new GameActionRejectedError('ยังไม่ถึงเทิร์น');
        if (next.drawsLeftThisAction != null) {
          throw new GameActionRejectedError('ต้องจั่วให้ครบก่อน');
        }
        if (next.hasDrawnThisTurn[playerId]) throw new GameActionRejectedError('จั่วจบเทิร์นแล้ว');
        if (next.pendingPlay) throw new GameActionRejectedError('กำลังเล่นการ์ดอยู่');
        if (next.pendingAccusation) throw new GameActionRejectedError('ต้องเปิด Tryal ก่อน');
        const hand = next.hands[playerId] ?? [];
        const card = removeFromHand(hand, action.cardId);
        if (!card) throw new GameActionRejectedError('ไม่มีการ์ดในมือ');
        next.hands[playerId] = hand;
        applyCardPlay(
          next,
          playerId,
          card,
          action.targetId,
          action.secondTargetId,
          action.selectedCardIds,
        );
        if (next.phase === 'playing') {
          noteCardPlayed(next);
          if (!next.pendingAccusation) {
            next.lastEvent = `${next.lastEvent} · เล่นแล้ว ${next.cardsPlayedThisTurn} ใบ — กดจบตาเมื่อพร้อม`;
          }
        }
        break;
      }

      case 'select_tryal_on_accusation': {
        const pending = next.pendingAccusation;
        if (!pending || pending.actorId !== playerId) {
          throw new GameActionRejectedError('ไม่ใช่ช่วงเปิด Tryal');
        }
        if (pending.revealedTryalId) {
          throw new GameActionRejectedError('เปิดแล้ว');
        }
        const tryal = (next.tryalsByPlayer[pending.targetId] ?? []).find(
          (t) => t.id === action.tryalId && !t.revealed,
        );
        if (!tryal) throw new GameActionRejectedError('Tryal ไม่ถูกต้อง');
        pending.selectedTryalId = action.tryalId;
        next.lastEvent = `${next.playerNames[playerId]} เลือก Tryal ที่จะเปิด…`;
        break;
      }

      case 'reveal_tryal_on_accusation': {
        const pending = next.pendingAccusation;
        if (!pending || pending.actorId !== playerId) {
          throw new GameActionRejectedError('ไม่ใช่ช่วงเปิด Tryal');
        }
        if (pending.revealedTryalId) {
          throw new GameActionRejectedError('เปิดแล้ว');
        }
        if (pending.targetId !== action.targetId) {
          throw new GameActionRejectedError('เป้าหมายไม่ตรง');
        }
        const tryalId = pending.selectedTryalId ?? action.tryalId;
        if (tryalId !== action.tryalId) {
          throw new GameActionRejectedError('ต้องเปิดใบที่เลือกไว้');
        }
        const revealed = revealTryal(next, action.targetId, tryalId);
        if (!revealed) throw new GameActionRejectedError('Tryal ไม่ถูกต้อง');
        pending.selectedTryalId = tryalId;
        pending.revealedTryalId = tryalId;
        pending.revealedKind = revealed.kind;
        next.lastEvent = `เปิด Tryal ของ ${next.playerNames[pending.targetId]} — ${revealed.kind}`;
        break;
      }

      case 'ack_accusation_reveal': {
        const pending = next.pendingAccusation;
        if (!pending || !pending.revealedTryalId) {
          throw new GameActionRejectedError('ยังไม่เปิด Tryal');
        }
        // Actor acks after flip; allow any living player so spectators can dismiss if actor AFK
        if (!next.alive[playerId] && playerId !== pending.actorId) {
          throw new GameActionRejectedError('คุณตายแล้ว');
        }
        const targetId = pending.targetId;
        next.pendingAccusation = null;
        checkDeathAfterReveal(next, targetId);
        if (!applyWinIfAny(next)) {
          // Stay on the actor's turn unless they died (e.g. Matchmaker chain).
          if (next.currentPlayerId && !next.alive[next.currentPlayerId]) {
            advanceToNextPlayer(next);
          } else if (next.phase === 'playing' && next.currentPlayerId) {
            next.lastEvent = `${next.lastEvent} · เล่นแล้ว ${next.cardsPlayedThisTurn} ใบ — กดจบตาเมื่อพร้อม`;
          }
        }
        break;
      }

      case 'conspiracy_select_tryal': {
        const pc = next.pendingConspiracy;
        if (!pc || next.phase !== 'conspiracy') {
          throw new GameActionRejectedError('ไม่ใช่ Conspiracy');
        }
        if (pc.step !== 'reveal') throw new GameActionRejectedError('ไม่ใช่ขั้นเปิด Black Cat');
        if (pc.revealerId !== playerId) {
          throw new GameActionRejectedError('เฉพาะผู้เปิด Conspiracy');
        }
        if (pc.blackCatTryalRevealed) {
          throw new GameActionRejectedError('เปิด Tryal แล้ว');
        }
        const holderId = pc.blackCatHolderId ?? next.blackCatHolderId;
        if (!holderId) throw new GameActionRejectedError('ไม่มี Black Cat');
        const tryal = (next.tryalsByPlayer[holderId] ?? []).find(
          (t) => t.id === action.tryalId && !t.revealed,
        );
        if (!tryal) throw new GameActionRejectedError('Tryal ไม่ถูกต้อง');
        pc.selectedTryalId = action.tryalId;
        next.lastEvent = `${next.playerNames[playerId]} เลือก Tryal ของ Black Cat…`;
        break;
      }

      case 'conspiracy_reveal_tryal': {
        const pc = next.pendingConspiracy;
        if (!pc || next.phase !== 'conspiracy')
          throw new GameActionRejectedError('ไม่ใช่ Conspiracy');
        if (pc.step !== 'reveal') throw new GameActionRejectedError('ไม่ใช่ขั้นเปิด Black Cat');
        if (pc.revealerId !== playerId) {
          throw new GameActionRejectedError('เฉพาะผู้เปิด Conspiracy');
        }
        if (pc.blackCatTryalRevealed) {
          throw new GameActionRejectedError('เปิด Tryal แล้ว');
        }
        const holderId = pc.blackCatHolderId ?? next.blackCatHolderId;
        if (!holderId) throw new GameActionRejectedError('ไม่มี Black Cat');
        const tryalId = pc.selectedTryalId ?? action.tryalId;
        if (tryalId !== action.tryalId) {
          throw new GameActionRejectedError('ต้องเปิดใบที่เลือกไว้');
        }
        const revealed = revealTryal(next, holderId, tryalId);
        if (!revealed) throw new GameActionRejectedError('Tryal ไม่ถูกต้อง');
        pc.selectedTryalId = tryalId;
        pc.revealedTryalId = tryalId;
        pc.revealedKind = revealed.kind;
        pc.blackCatTryalRevealed = true;
        next.lastEvent = `${next.playerNames[playerId]} เปิด Tryal ของ ${next.playerNames[holderId]} — ${revealed.kind}`;
        checkDeathAfterReveal(next, holderId);
        if (applyWinIfAny(next)) {
          next.pendingConspiracy = null;
        }
        break;
      }

      case 'conspiracy_ack_view': {
        const pc = next.pendingConspiracy;
        if (!pc || next.phase !== 'conspiracy') {
          throw new GameActionRejectedError('ไม่ใช่ Conspiracy');
        }
        if (pc.step !== 'reveal') {
          throw new GameActionRejectedError('ไม่ใช่ขั้นเปิด Black Cat');
        }
        if (!pc.blackCatTryalRevealed) {
          throw new GameActionRejectedError('ต้องเปิด Tryal ของ Black Cat ก่อน');
        }
        if (pc.revealerId !== playerId) {
          throw new GameActionRejectedError('เฉพาะผู้เปิด Conspiracy');
        }
        enterConspiracyPass(next);
        next.lastEvent = 'Conspiracy — เลือก Tryal จากคนทางซ้าย';
        break;
      }

      case 'conspiracy_pass_select': {
        const pc = next.pendingConspiracy;
        if (!pc || next.phase !== 'conspiracy') {
          throw new GameActionRejectedError('ไม่ใช่ Conspiracy');
        }
        if (pc.step !== 'pass') throw new GameActionRejectedError('ไม่ใช่ขั้นส่ง Tryal');
        if (!next.alive[playerId]) throw new GameActionRejectedError('คุณตายแล้ว');
        if (Object.prototype.hasOwnProperty.call(pc.passPicks, playerId)) {
          throw new GameActionRejectedError('เลือกไปแล้ว');
        }
        const left = leftNeighborId(next, playerId);
        if (!left) throw new GameActionRejectedError('ไม่มีผู้เล่นทางซ้าย');
        const options = unrevealedTryalIdsOf(next, left);
        if (options.length === 0) {
          pc.passPicks[playerId] = null;
        } else {
          if (!options.includes(action.tryalId)) {
            throw new GameActionRejectedError('ต้องเลือก Tryal คว่ำของคนทางซ้าย');
          }
          pc.passPicks[playerId] = action.tryalId;
        }
        maybeApplyConspiracyPass(next);
        break;
      }

      case 'conspiracy_peek_ack': {
        const pc = next.pendingConspiracy;
        if (!pc || next.phase !== 'conspiracy') {
          throw new GameActionRejectedError('ไม่ใช่ Conspiracy');
        }
        if (pc.step !== 'peek') throw new GameActionRejectedError('ไม่ใช่ขั้นแอบดู Tryal');
        if (!next.alive[playerId]) throw new GameActionRejectedError('คุณตายแล้ว');
        if (!pc.peekAcknowledgedBy.includes(playerId)) {
          pc.peekAcknowledgedBy = [...pc.peekAcknowledgedBy, playerId];
        }
        const living = livingPlayers(next);
        const done = living.every((id) => pc.peekAcknowledgedBy.includes(id));
        next.lastEvent = done
          ? 'Conspiracy — ทุกคนรับทราบแล้ว'
          : `Conspiracy — รอแอบดู Tryal (${pc.peekAcknowledgedBy.filter((id) => next.alive[id]).length}/${living.length})`;
        if (done) resolveConspiracyView(next);
        break;
      }

      case 'stocks_ack_skip': {
        const pending = next.pendingStocksSkip;
        if (!pending || next.phase !== 'playing') {
          throw new GameActionRejectedError('ไม่ใช่ช่วงข้าม Stocks');
        }
        if (pending.playerId !== playerId) {
          throw new GameActionRejectedError('เฉพาะผู้ถูก Stocks');
        }
        if (!consumeOneStocks(next, playerId)) {
          throw new GameActionRejectedError('ไม่มี Stocks');
        }
        const left = stocksCountOf(next, playerId);
        next.pendingStocksSkip = null;
        next.lastEvent =
          left > 0
            ? `${next.playerNames[playerId]} ข้ามเทิร์น (เหลือ Stocks ${left} ใบ)`
            : `${next.playerNames[playerId]} ข้ามเทิร์น — ทิ้ง Stocks`;
        advanceToNextPlayer(next);
        break;
      }

      case 'night_witch_select': {
        if (next.phase !== 'night_witch') throw new GameActionRejectedError('ไม่ใช่ Night');
        if (!next.everWitch[playerId]) throw new GameActionRejectedError('เฉพาะ Witch');
        if (!next.alive[playerId]) throw new GameActionRejectedError('คุณตายแล้ว');
        if (!next.alive[action.targetId]) throw new GameActionRejectedError('ไม่มีผู้เล่น');
        if (hasFrontKind(next, action.targetId, 'asylum')) {
          throw new GameActionRejectedError('ผู้เล่นมี Asylum — เลือกไม่ได้');
        }
        next.witchKillVotes = { ...next.witchKillVotes, [playerId]: action.targetId };
        const consensus = nightWitchKillConsensus(next);
        next.lastEvent = consensus
          ? `Witch ตกลงเป้า: ${next.playerNames[consensus]}`
          : 'Witch กำลังเลือกผู้เล่นที่จะฆ่า…';
        break;
      }

      case 'night_witch_confirm': {
        if (next.phase !== 'night_witch') throw new GameActionRejectedError('ไม่ใช่ Night');
        if (!next.everWitch[playerId]) throw new GameActionRejectedError('เฉพาะ Witch');
        const consensus = nightWitchKillConsensus(next);
        if (!consensus) {
          throw new GameActionRejectedError('Witch ทุกคนต้องเลือกผู้เล่นคนเดียวกันก่อน');
        }
        next.nightKillPlayerId = consensus;
        enterNightConstableOrConfess(next);
        break;
      }

      case 'night_constable_save': {
        if (next.phase !== 'night_constable') throw new GameActionRejectedError('ไม่ใช่ Night');
        if (!next.isConstable[playerId]) throw new GameActionRejectedError('เฉพาะ Constable');
        if (action.targetId === playerId) throw new GameActionRejectedError('ห้ามเลือกตัวเอง');
        if (!next.alive[action.targetId]) throw new GameActionRejectedError('ไม่มีผู้เล่น');
        next.gavelHolderId = action.targetId;
        enterNightConfess(next);
        break;
      }

      case 'night_confess': {
        if (next.phase !== 'night_confess') throw new GameActionRejectedError('ไม่ใช่ Night');
        if (!next.alive[playerId]) throw new GameActionRejectedError('คุณตายแล้ว');
        if (next.gavelHolderId === playerId) {
          throw new GameActionRejectedError('ผู้ถือ Gavel ไม่ต้อง Confess');
        }
        if (next.confessedThisNight[playerId]) {
          throw new GameActionRejectedError('Confess ไปแล้ว');
        }
        const revealed = revealTryal(next, playerId, action.tryalId);
        if (!revealed) throw new GameActionRejectedError('Tryal ไม่ถูกต้อง');
        next.confessedThisNight[playerId] = true;
        next.confessedTryalId[playerId] = action.tryalId;
        checkDeathAfterReveal(next, playerId);
        if (applyWinIfAny(next)) break;
        maybeFinishNightConfess(next);
        break;
      }

      case 'night_skip_confess': {
        if (next.phase !== 'night_confess') throw new GameActionRejectedError('ไม่ใช่ Night');
        if (!next.alive[playerId]) throw new GameActionRejectedError('คุณตายแล้ว');
        if (next.gavelHolderId === playerId) {
          throw new GameActionRejectedError('ผู้ถือ Gavel ไม่ต้อง Confess');
        }
        if (next.confessedThisNight[playerId]) {
          throw new GameActionRejectedError('Confess ไปแล้ว');
        }
        next.confessedThisNight[playerId] = true;
        maybeFinishNightConfess(next);
        break;
      }

      case 'night_result_ack': {
        if (next.phase !== 'night_result' || !next.pendingNightResult) {
          throw new GameActionRejectedError('ไม่ใช่ผล Night');
        }
        if (!next.alive[playerId]) throw new GameActionRejectedError('คุณตายแล้ว');
        if (!next.nightResultAcknowledgedBy.includes(playerId)) {
          next.nightResultAcknowledgedBy = [...next.nightResultAcknowledgedBy, playerId];
        }
        const living = livingPlayers(next);
        if (living.every((id) => next.nightResultAcknowledgedBy.includes(id))) {
          finishNightAfterResultAcks(next);
        }
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
