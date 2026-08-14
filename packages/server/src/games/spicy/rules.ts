import {
  SPICY_HAND_SIZE,
  SPICY_MAX_PLAYERS,
  SPICY_MIN_PLAYERS,
  SPICY_SPECIAL_IDS,
  SPICY_TROPHY_COUNT,
  SPICY_TROPHY_POINTS,
  buildSpicyDeck,
  parseSpicyLobbyOptions,
  worldsEndCardsAbove,
  type Player,
  type SpicyAction,
  type SpicyCard,
  type SpicyDeclaration,
  type SpicyPendingContinue,
  type SpicyRoundSummaryReason,
  type SpicyScoreBreakdown,
  type SpicySpecialId,
  type SpicySpice,
  type SpicyStackEntry,
  type SpicyState,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

function reject(message: string): never {
  throw new GameActionRejectedError(message);
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function cloneState(state: SpicyState): SpicyState {
  return structuredClone(state);
}

const ALL_SPICES: SpicySpice[] = ['chili', 'wasabi', 'pepper'];

function nextPlayerId(state: SpicyState, fromId: string): string {
  const order = state.playerOrder;
  const idx = order.indexOf(fromId);
  return order[(idx + 1) % order.length]!;
}

function seat(state: SpicyState, id: string) {
  const s = state.seats[id];
  if (!s) reject('ไม่พบผู้เล่น');
  return s;
}

/** Draw one card; ends game if World's End is on top. Returns null if ended. */
function drawOne(state: SpicyState): SpicyCard | null {
  if (state.worldsEndAt === 0) {
    endByWorldsEnd(state);
    return null;
  }
  if (state.drawPile.length === 0) {
    endByWorldsEnd(state);
    return null;
  }
  const card = state.drawPile.shift()!;
  if (state.worldsEndAt != null) {
    state.worldsEndAt -= 1;
  }
  return card;
}

function drawN(state: SpicyState, n: number, into: SpicyCard[]): boolean {
  for (let i = 0; i < n; i += 1) {
    const c = drawOne(state);
    if (!c) return false;
    into.push(c);
  }
  return true;
}

function computeScores(state: SpicyState): SpicyScoreBreakdown[] {
  return state.playerOrder.map((id) => {
    const s = state.seats[id]!;
    const wonCards = s.wonCount;
    const trophies = s.trophies;
    const handPenalty = s.hand.length;
    const total = wonCards + trophies * SPICY_TROPHY_POINTS - handPenalty;
    return {
      playerId: id,
      name: s.name,
      wonCards,
      trophies,
      handPenalty,
      total,
    };
  });
}

function finishWithScores(state: SpicyState, reason: string, winners?: string[]): void {
  const scores = computeScores(state);
  state.scores = scores;
  state.phase = 'game_over';
  state.activePlayerId = state.activePlayerId;
  state.copyWindowOpen = false;
  if (winners) {
    state.result = { winners, reason };
  } else {
    const max = Math.max(...scores.map((s) => s.total));
    const tied = scores.filter((s) => s.total === max).map((s) => s.playerId);
    state.result = {
      winners: tied,
      reason,
    };
  }
  state.lastEvent = reason;
}

function endByWorldsEnd(state: SpicyState): void {
  state.worldsEndAt = null;
  finishWithScores(state, 'World’s End — คิดคะแนน!');
}

function countStackCards(entries: SpicyStackEntry[]): number {
  let count = 0;
  for (const e of entries) {
    count += 1;
    count += e.tucked?.length ?? 0;
  }
  return count;
}

function takeStackAsPoints(state: SpicyState, winnerId: string, entries: SpicyStackEntry[]): void {
  seat(state, winnerId).wonCount += countStackCards(entries);
}

function clearStack(state: SpicyState): void {
  state.spicyStack = [];
  state.spiceRaiderIndex = null;
  state.spiceRaiderOwnerId = null;
}

function emptyRoundDeltas(
  state: SpicyState,
): Record<string, { wonCards: number; trophies: number }> {
  const d: Record<string, { wonCards: number; trophies: number }> = {};
  for (const id of state.playerOrder) {
    d[id] = { wonCards: 0, trophies: 0 };
  }
  return d;
}

/** Award trophy points now; draw-6 / game-over wait for `ack_round`. */
function applyTrophyAward(
  state: SpicyState,
  playerId: string,
): { gameOverReason: string | null; winners?: string[] } {
  if (state.trophiesLeft <= 0) return { gameOverReason: null };
  const s = seat(state, playerId);
  s.trophies += 1;
  state.trophiesLeft -= 1;
  state.lastEvent = `${s.name} ได้ถ้วยรางวัล! (${s.trophies})`;

  if (s.trophies >= 2) {
    return { gameOverReason: 'ได้ถ้วยครบ 2 ใบ!', winners: [playerId] };
  }
  if (state.trophiesLeft <= 0) {
    return { gameOverReason: 'ถ้วยรางวัลครบทั้ง 3 ใบ — คิดคะแนน!' };
  }
  return { gameOverReason: null };
}

function presentRoundSummary(
  state: SpicyState,
  reason: SpicyRoundSummaryReason,
  deltas: Record<string, { wonCards: number; trophies: number }>,
  pending: SpicyPendingContinue,
  revealed: SpicyCard | null = null,
): void {
  state.roundSummary = {
    reason,
    revealed: revealed ? { ...revealed } : null,
    rows: state.playerOrder.map((id) => {
      const d = deltas[id] ?? { wonCards: 0, trophies: 0 };
      return {
        playerId: id,
        name: seat(state, id).name,
        wonCards: d.wonCards,
        trophies: d.trophies,
        points: d.wonCards + d.trophies * SPICY_TROPHY_POINTS,
      };
    }),
  };
  state.pendingContinue = pending;
  state.phase = 'round_summary';
  state.challengeReveal = null;
  state.declineChallengeIds = [];
  state.copyWindowOpen = false;
}

function afterChallengeContinue(
  state: SpicyState,
  opts: {
    challengerWon: boolean;
    challengerId: string;
    challengedId: string;
    pendingTrophyId: string | null;
    revealed: SpicyCard;
  },
): void {
  const deltas = emptyRoundDeltas(state);

  if (opts.challengerWon) {
    const won = countStackCards(state.spicyStack);
    takeStackAsPoints(state, opts.challengerId, state.spicyStack);
    clearStack(state);
    state.lastPlay = null;
    state.copyWindowOpen = false;
    deltas[opts.challengerId]!.wonCards = won;
    presentRoundSummary(state, 'challenge_right', deltas, {
      drawTwoPlayerId: opts.challengedId,
      redrawSixPlayerId: null,
      nextActivePlayerId: opts.challengedId,
      gameOverReason: null,
      gameOverWinners: null,
    }, opts.revealed);
    state.lastEvent = `${seat(state, opts.challengerId).name} ท้าถูก — ได้กอง!`;
    return;
  }

  const won = countStackCards(state.spicyStack);
  takeStackAsPoints(state, opts.challengedId, state.spicyStack);
  clearStack(state);
  state.lastPlay = null;
  state.copyWindowOpen = false;
  deltas[opts.challengedId]!.wonCards = won;

  let gameOverReason: string | null = null;
  let gameOverWinners: string[] | null = null;
  let redrawSixPlayerId: string | null = null;

  if (opts.pendingTrophyId === opts.challengedId) {
    const trophy = applyTrophyAward(state, opts.challengedId);
    deltas[opts.challengedId]!.trophies = 1;
    if (trophy.gameOverReason) {
      gameOverReason = trophy.gameOverReason;
      gameOverWinners = trophy.winners ?? null;
    } else {
      redrawSixPlayerId = opts.challengedId;
    }
  }

  presentRoundSummary(state, 'challenge_wrong', deltas, {
    drawTwoPlayerId: opts.challengerId,
    redrawSixPlayerId,
    nextActivePlayerId: nextPlayerId(state, opts.challengedId),
    gameOverReason,
    gameOverWinners,
  }, opts.revealed);
  state.lastEvent = `${seat(state, opts.challengedId).name} รอดจากท้า — ได้กอง!`;
}

function cardMatchesNumber(card: SpicyCard, n: number): boolean {
  if (card.kind === 'wild_number') return true;
  if (card.kind === 'wild_spice') return false;
  return card.number === n;
}

function cardMatchesSpice(card: SpicyCard, spice: SpicySpice): boolean {
  if (card.kind === 'wild_spice') return true;
  if (card.kind === 'wild_number') return false;
  return card.spice === spice;
}

function turnItUpNumberOk(declared: number, actual: number | undefined): boolean {
  if (actual == null) return false;
  if (declared === actual) return true;
  // 6↔9 swap
  return (
    (declared === 6 && actual === 9) ||
    (declared === 9 && actual === 6)
  );
}

export function legalDeclarations(state: SpicyState): SpicyDeclaration[] {
  const special = state.specialCard;
  const stack = state.spicyStack;
  const out: SpicyDeclaration[] = [];

  const push = (number: number, spice: SpicySpice) => {
    if (!out.some((d) => d.number === number && d.spice === spice)) {
      out.push({ number, spice });
    }
  };

  if (stack.length === 0) {
    for (const spice of ALL_SPICES) {
      for (const n of [1, 2, 3]) push(n, spice);
    }
    if (special === 'we_love_chili') {
      // Already includes chili 1–3
    }
    return out;
  }

  const top = stack[stack.length - 1]!.declaration;
  const suit = top.spice;

  if (top.number >= 10) {
    for (const n of [1, 2, 3]) push(n, suit);
  } else {
    for (let n = top.number + 1; n <= 10; n += 1) push(n, suit);
  }

  // Start It Up: after 8/9/10 also allow 1–3 same spice
  if (special === 'start_it_up' && top.number >= 8) {
    for (const n of [1, 2, 3]) push(n, suit);
  }

  // We Love Chili: whenever 1–3 is legal in the required spice, chili is also legal
  if (special === 'we_love_chili') {
    for (const d of [...out]) {
      if (d.number <= 3) push(d.number, 'chili');
    }
  }

  // Turn It Up: allow declaring 6 as 9 and 9 as 6 when those numbers are in legal sequence
  if (special === 'turn_it_up') {
    const has6 = out.some((d) => d.number === 6);
    const has9 = out.some((d) => d.number === 9);
    if (has6) push(9, suit);
    if (has9) push(6, suit);
  }

  return out;
}

function resolveSpiceRaiderOnNewPlay(state: SpicyState): void {
  if (state.spiceRaiderIndex == null || !state.spiceRaiderOwnerId) return;
  const idx = state.spiceRaiderIndex;
  const ownerId = state.spiceRaiderOwnerId;
  // New card already on stack at end — award everything below the new top
  if (state.spicyStack.length < 2) {
    state.spiceRaiderIndex = null;
    state.spiceRaiderOwnerId = null;
    return;
  }
  const awarded = state.spicyStack.slice(0, state.spicyStack.length - 1);
  // Only if raider index is still within awarded portion
  if (idx >= awarded.length) {
    state.spiceRaiderIndex = null;
    state.spiceRaiderOwnerId = null;
    return;
  }
  takeStackAsPoints(state, ownerId, awarded);
  const top = state.spicyStack[state.spicyStack.length - 1]!;
  state.spicyStack = [top];
  state.spiceRaiderIndex = null;
  state.spiceRaiderOwnerId = null;
  state.lastEvent = `${seat(state, ownerId).name} (Spice Raider) เก็บกองใต้ paw!`;
}

export function createInitialState(
  players: Player[],
  lobbyOptionsRaw?: unknown,
): SpicyState {
  const n = players.length;
  if (n < SPICY_MIN_PLAYERS || n > SPICY_MAX_PLAYERS) {
    throw new Error(`Spicy ต้องมีผู้เล่น ${SPICY_MIN_PLAYERS}–${SPICY_MAX_PLAYERS} คน`);
  }

  const opts = parseSpicyLobbyOptions(lobbyOptionsRaw);
  const order = shuffleInPlace(players.map((p) => p.id));
  const deck = shuffleInPlace(buildSpicyDeck());

  const seats: Record<string, SpicyState['seats'][string]> = {};
  for (const id of order) {
    const p = players.find((x) => x.id === id)!;
    seats[id] = {
      id,
      name: p.name,
      hand: [],
      wonCount: 0,
      trophies: 0,
    };
  }

  for (const id of order) {
    seats[id]!.hand = deck.splice(0, SPICY_HAND_SIZE);
  }

  const drawPile = deck;
  const worldsEndAt = worldsEndCardsAbove(n, drawPile.length);

  let specialCard: SpicySpecialId | null = null;
  if (opts.useSpecialCards) {
    specialCard = SPICY_SPECIAL_IDS[Math.floor(Math.random() * SPICY_SPECIAL_IDS.length)]!;
  }

  const first = order[0]!;

  return {
    phase: 'turn',
    playerOrder: order,
    seats,
    activePlayerId: first,
    drawPile,
    worldsEndAt,
    spicyStack: [],
    trophiesLeft: SPICY_TROPHY_COUNT,
    specialCard,
    spiceRaiderIndex: null,
    spiceRaiderOwnerId: null,
    copyWindowOpen: false,
    lastPlay: null,
    declineChallengeIds: [],
    challengeReveal: null,
    roundSummary: null,
    pendingContinue: null,
    tuckPlayerId: null,
    lastEvent: specialCard
      ? `เริ่มเกม — SPICE IT UP: ${specialCard}`
      : 'เริ่มเกม — วางใบแรก (1–3)',
    passNoticeSeq: 0,
    passNotice: null,
    result: null,
    scores: null,
  };
}

export function applyPlayCard(
  state: SpicyState,
  playerId: string,
  cardId: string,
  number: number,
  spice: SpicySpice,
): SpicyState {
  const next = cloneState(state);
  if (next.phase !== 'turn') reject('ตอนนี้วางการ์ดไม่ได้');
  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');
  if (next.copyWindowOpen && next.specialCard === 'copy_cat') {
    // Copy window doesn't block the active player's normal turn — copy is extra.
  }

  const s = seat(next, playerId);
  const handIdx = s.hand.findIndex((c) => c.id === cardId);
  if (handIdx < 0) reject('ไม่พบการ์ดในมือ');

  const legal = legalDeclarations(next);
  if (!legal.some((d) => d.number === number && d.spice === spice)) {
    reject('ประกาศนี้ไม่ถูกต้อง');
  }

  const [card] = s.hand.splice(handIdx, 1);
  const declaration: SpicyDeclaration = { number, spice };

  // Spice Raider resolution from previous 4 before adding new card
  // Actually resolve when new card lands — after push
  const entry: SpicyStackEntry = {
    card: card!,
    ownerId: playerId,
    declaration,
  };
  next.spicyStack.push(entry);

  if (next.spiceRaiderIndex != null) {
    resolveSpiceRaiderOnNewPlay(next);
  }

  // New Spice Raider mark
  if (next.specialCard === 'spice_raider' && number === 4) {
    next.spiceRaiderIndex = next.spicyStack.length - 1;
    next.spiceRaiderOwnerId = playerId;
  }

  next.lastPlay = { playerId, declaration };
  next.copyWindowOpen = next.specialCard === 'copy_cat';
  next.declineChallengeIds = [];

  const emptied = s.hand.length === 0;
  next.lastEvent = `${s.name} ประกาศ ${number} ${spice}${emptied ? ' (ใบสุดท้าย!)' : ''}`;

  // Change Your Luck
  if (next.specialCard === 'change_your_luck' && number === 5 && s.hand.length > 0) {
    next.phase = 'tuck';
    next.tuckPlayerId = playerId;
    return next;
  }

  if (emptied) {
    next.phase = 'trophy_window';
    next.declineChallengeIds = [];
    return next;
  }

  next.activePlayerId = nextPlayerId(next, playerId);
  next.phase = 'turn';
  return next;
}

export function applyPass(state: SpicyState, playerId: string): SpicyState {
  const next = cloneState(state);
  if (next.phase !== 'turn') reject('ตอนนี้ผ่านไม่ได้');
  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');

  const s = seat(next, playerId);
  const card = drawOne(next);
  if (!card) return next;
  s.hand.push(card);
  next.copyWindowOpen = false;
  next.lastEvent = `${s.name} ผ่าน — จั่ว 1 ใบ`;
  next.passNoticeSeq += 1;
  next.passNotice = { playerId, playerName: s.name };
  next.activePlayerId = nextPlayerId(next, playerId);
  return next;
}

export function applyChallenge(
  state: SpicyState,
  playerId: string,
  trait: 'number' | 'spice',
): SpicyState {
  const next = cloneState(state);
  if (next.phase !== 'turn' && next.phase !== 'trophy_window') {
    reject('ตอนนี้ท้าทายไม่ได้');
  }
  if (next.phase === 'trophy_window' && next.declineChallengeIds.includes(playerId)) {
    reject('ไม่ท้าแล้ว ท้าอีกไม่ได้');
  }
  if (next.spicyStack.length === 0) reject('ไม่มีกองให้ท้า');

  const top = next.spicyStack[next.spicyStack.length - 1]!;
  if (top.isCopyCat) reject('ใช้ท้าแบบ Copy Cat');
  if (top.ownerId === playerId) reject('ท้าการ์ดตัวเองไม่ได้');

  const pendingTrophy =
    next.phase === 'trophy_window' && seat(next, top.ownerId).hand.length === 0
      ? top.ownerId
      : null;

  const declared = top.declaration;
  const card = top.card;
  let traitWrong = false;

  if (trait === 'number') {
    if (next.specialCard === 'turn_it_up' && card.kind === 'numbered') {
      traitWrong = !turnItUpNumberOk(declared.number, card.number);
    } else {
      traitWrong = !cardMatchesNumber(card, declared.number);
    }
  } else {
    traitWrong = !cardMatchesSpice(card, declared.spice);
  }

  const challengerWon = traitWrong;

  next.challengeReveal = {
    challengerId: playerId,
    challengedId: top.ownerId,
    trait,
    declaration: declared,
    revealed: { ...card },
    challengerWon,
    pendingTrophyId: challengerWon ? null : pendingTrophy,
  };
  next.phase = 'challenge_reveal';
  next.copyWindowOpen = false;
  next.lastEvent = `${seat(next, playerId).name} ท้า ${trait === 'number' ? 'เลข' : 'เครื่องเทศ'}!`;
  return next;
}

export function applyChallengeCopy(state: SpicyState, playerId: string): SpicyState {
  const next = cloneState(state);
  if (next.phase !== 'turn' && next.phase !== 'trophy_window') {
    reject('ตอนนี้ท้าทายไม่ได้');
  }
  if (next.phase === 'trophy_window' && next.declineChallengeIds.includes(playerId)) {
    reject('ไม่ท้าแล้ว ท้าอีกไม่ได้');
  }
  if (next.spicyStack.length === 0) reject('ไม่มีกองให้ท้า');
  const top = next.spicyStack[next.spicyStack.length - 1]!;
  if (!top.isCopyCat) reject('ไม่ใช่ใบ Copy Cat');
  if (top.ownerId === playerId) reject('ท้าการ์ดตัวเองไม่ได้');

  const declared = top.declaration;
  const card = top.card;
  const numberOk =
    next.specialCard === 'turn_it_up' && card.kind === 'numbered'
      ? turnItUpNumberOk(declared.number, card.number)
      : cardMatchesNumber(card, declared.number);
  const spiceOk = cardMatchesSpice(card, declared.spice);
  const copyWins = numberOk && spiceOk;
  const challengerWon = !copyWins;

  const pendingTrophy =
    next.phase === 'trophy_window' && seat(next, top.ownerId).hand.length === 0
      ? top.ownerId
      : null;

  next.challengeReveal = {
    challengerId: playerId,
    challengedId: top.ownerId,
    trait: 'both',
    declaration: declared,
    revealed: { ...card },
    challengerWon,
    pendingTrophyId: challengerWon ? null : pendingTrophy,
  };
  next.phase = 'challenge_reveal';
  next.copyWindowOpen = false;
  next.lastEvent = `${seat(next, playerId).name} ท้า Copy Cat!`;
  return next;
}

export function applyAckChallenge(state: SpicyState, playerId: string): SpicyState {
  const next = cloneState(state);
  if (next.phase !== 'challenge_reveal' || !next.challengeReveal) {
    reject('ไม่มีผลท้าทายให้ยืนยัน');
  }
  void playerId;
  const reveal = next.challengeReveal;
  next.challengeReveal = null;

  // Copy Cat: challenge only affects the challenged copy card, not earlier plays.
  if (reveal.trait === 'both') {
    const top = next.spicyStack.pop();
    if (!top) reject('ไม่มีกอง');

    if (reveal.challengerWon) {
      // Copy was wrong — challenger takes only that card; rest of stack stays
      const deltas = emptyRoundDeltas(next);
      const won = countStackCards([top]);
      takeStackAsPoints(next, reveal.challengerId, [top]);
      deltas[reveal.challengerId]!.wonCards = won;
      presentRoundSummary(next, 'challenge_right', deltas, {
        drawTwoPlayerId: reveal.challengedId,
        redrawSixPlayerId: null,
        nextActivePlayerId: nextPlayerId(next, reveal.challengedId),
        gameOverReason: null,
        gameOverWinners: null,
      }, reveal.revealed);
      next.lastEvent = `${seat(next, reveal.challengerId).name} ท้า Copy Cat ถูก`;
    } else {
      // Copy was fully correct — copy cat wins whole remaining stack + the copy card
      next.spicyStack.push(top);
      afterChallengeContinue(next, {
        challengerWon: false,
        challengerId: reveal.challengerId,
        challengedId: reveal.challengedId,
        pendingTrophyId: reveal.pendingTrophyId,
        revealed: reveal.revealed,
      });
    }
    return next;
  }

  afterChallengeContinue(next, {
    challengerWon: reveal.challengerWon,
    challengerId: reveal.challengerId,
    challengedId: reveal.challengedId,
    pendingTrophyId: reveal.pendingTrophyId,
    revealed: reveal.revealed,
  });
  return next;
}

export function applyDeclineChallenge(state: SpicyState, playerId: string): SpicyState {
  const next = cloneState(state);
  if (next.phase !== 'trophy_window') reject('ตอนนี้ไม่ต้องปฏิเสธท้า');
  if (next.declineChallengeIds.includes(playerId)) reject('คุณปฏิเสธแล้ว');

  const top = next.spicyStack[next.spicyStack.length - 1];
  if (!top) reject('ไม่มีกอง');
  if (top.ownerId === playerId) reject('ไม่ท้าการ์ดตัวเองไม่ได้');

  next.declineChallengeIds = [...next.declineChallengeIds, playerId];
  const emptierId = top.ownerId;
  const required = next.playerOrder.filter((id) => id !== emptierId).length;
  if (next.declineChallengeIds.length < required) {
    next.lastEvent = `${seat(next, playerId).name} ไม่ท้า`;
    return next;
  }

  // All other players declined — trophy on emptier, then round_summary before redraw/turn.
  const trophy = applyTrophyAward(next, emptierId);
  const deltas = emptyRoundDeltas(next);
  deltas[emptierId]!.trophies = 1;
  presentRoundSummary(next, 'trophy_uncontested', deltas, {
    drawTwoPlayerId: null,
    redrawSixPlayerId: trophy.gameOverReason ? null : emptierId,
    nextActivePlayerId: nextPlayerId(next, emptierId),
    gameOverReason: trophy.gameOverReason,
    gameOverWinners: trophy.winners ?? null,
  });
  return next;
}

export function applyAckRound(state: SpicyState, playerId: string): SpicyState {
  if (state.phase !== 'round_summary' || !state.pendingContinue) {
    return state;
  }
  const next = cloneState(state);
  void playerId;
  const pending = next.pendingContinue!;
  next.roundSummary = null;
  next.pendingContinue = null;

  if (pending.drawTwoPlayerId) {
    const loser = seat(next, pending.drawTwoPlayerId);
    if (!drawN(next, 2, loser.hand)) return next;
  }

  if (pending.gameOverReason) {
    finishWithScores(
      next,
      pending.gameOverReason,
      pending.gameOverWinners ?? undefined,
    );
    return next;
  }

  if (pending.redrawSixPlayerId) {
    const s = seat(next, pending.redrawSixPlayerId);
    s.hand = [];
    if (!drawN(next, SPICY_HAND_SIZE, s.hand)) return next;
  }

  next.phase = 'turn';
  next.activePlayerId = pending.nextActivePlayerId;
  next.declineChallengeIds = [];
  return next;
}

export function applyTuckCards(
  state: SpicyState,
  playerId: string,
  cardIds: string[],
): SpicyState {
  const next = cloneState(state);
  if (next.phase !== 'tuck' || next.tuckPlayerId !== playerId) {
    reject('ตอนนี้สอดการ์ดไม่ได้');
  }
  if (cardIds.length > 2) reject('สอดได้สูงสุด 2 ใบ');
  if (new Set(cardIds).size !== cardIds.length) reject('เลือกการ์ดซ้ำ');

  const s = seat(next, playerId);
  const tucked: SpicyCard[] = [];
  for (const id of cardIds) {
    const idx = s.hand.findIndex((c) => c.id === id);
    if (idx < 0) reject('ไม่พบการ์ดในมือ');
    tucked.push(s.hand.splice(idx, 1)[0]!);
  }

  const top = next.spicyStack[next.spicyStack.length - 1]!;
  top.tucked = tucked;

  if (tucked.length > 0) {
    if (!drawN(next, tucked.length, s.hand)) return next;
  }

  next.tuckPlayerId = null;
  next.lastEvent = `${s.name} สอด ${tucked.length} ใบใต้ 5`;

  if (s.hand.length === 0) {
    next.phase = 'trophy_window';
    next.declineChallengeIds = [];
    return next;
  }

  next.phase = 'turn';
  next.activePlayerId = nextPlayerId(next, playerId);
  return next;
}

export function applyCopyCat(
  state: SpicyState,
  playerId: string,
  cardId: string,
): SpicyState {
  const next = cloneState(state);
  if (next.specialCard !== 'copy_cat') reject('ไม่มี Copy Cat');
  if (!next.copyWindowOpen || !next.lastPlay) reject('ตอนนี้ก็อปไม่ได้');
  if (next.lastPlay.playerId === playerId) reject('ก็อปตาตัวเองไม่ได้');
  if (next.phase !== 'turn' && next.phase !== 'trophy_window') {
    reject('ตอนนี้ก็อปไม่ได้');
  }

  const s = seat(next, playerId);
  const handIdx = s.hand.findIndex((c) => c.id === cardId);
  if (handIdx < 0) reject('ไม่พบการ์ดในมือ');

  const declaration = { ...next.lastPlay.declaration };
  const [card] = s.hand.splice(handIdx, 1);

  if (next.spiceRaiderIndex != null) {
    // Copy lands as new card — may trigger raider
  }

  next.spicyStack.push({
    card: card!,
    ownerId: playerId,
    declaration,
    isCopyCat: true,
  });

  if (next.spiceRaiderIndex != null) {
    resolveSpiceRaiderOnNewPlay(next);
  }

  next.lastPlay = { playerId, declaration };
  next.copyWindowOpen = true; // another may copy the copy
  next.lastEvent = `${s.name} Copy Cat — ${declaration.number} ${declaration.spice}`;

  const emptied = s.hand.length === 0;
  // Game continues with player to the left of the copy cat
  next.activePlayerId = nextPlayerId(next, playerId);

  if (emptied) {
    next.phase = 'trophy_window';
    next.declineChallengeIds = [];
  } else {
    next.phase = 'turn';
  }
  return next;
}

export function applyAction(
  state: SpicyState,
  playerId: string,
  action: SpicyAction,
): SpicyState {
  switch (action.type) {
    case 'play_card':
      return applyPlayCard(state, playerId, action.cardId, action.number, action.spice);
    case 'pass':
      return applyPass(state, playerId);
    case 'challenge':
      return applyChallenge(state, playerId, action.trait);
    case 'challenge_copy':
      return applyChallengeCopy(state, playerId);
    case 'decline_challenge':
      return applyDeclineChallenge(state, playerId);
    case 'tuck_cards':
      return applyTuckCards(state, playerId, action.cardIds);
    case 'copy_cat':
      return applyCopyCat(state, playerId, action.cardId);
    case 'ack_challenge':
      return applyAckChallenge(state, playerId);
    case 'ack_round':
      return applyAckRound(state, playerId);
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
