import {
  buildClassicDeck,
  GAME_THUMBNAIL_BY_ID,
  loveLetterTokensToWin,
  parseLoveLetterLobbyOptions,
  type GameDefinition,
  type GameResult,
  type LoveLetterAction,
  type LoveLetterCard,
  type LoveLetterPendingAction,
  type LoveLetterPlayerState,
  type LoveLetterPlayerView,
  type LoveLetterRoundSummary,
  type LoveLetterState,
  type Player,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneCard(c: LoveLetterCard): LoveLetterCard {
  return { ...c };
}

function playerById(state: LoveLetterState, id: string): LoveLetterPlayerState | undefined {
  return state.players.find((p) => p.id === id);
}

function playersInRound(state: LoveLetterState): LoveLetterPlayerState[] {
  return state.players.filter((p) => p.inRound);
}

function countInRound(state: LoveLetterState): number {
  return playersInRound(state).length;
}

function knockOut(state: LoveLetterState, playerId: string, reason: string): void {
  const p = playerById(state, playerId);
  if (!p || !p.inRound) return;
  if (p.hand.length > 0) {
    const [card] = p.hand.splice(0, 1);
    if (card) p.discardPile.push(card);
  }
  p.inRound = false;
  p.handmaidProtected = false;
  state.lastEvent = reason;
}

function drawCard(state: LoveLetterState): LoveLetterCard | null {
  if (state.drawPile.length > 0) {
    return state.drawPile.shift() ?? null;
  }
  return state.burnedCard;
}

function mustDiscardCountess(hand: LoveLetterCard[]): boolean {
  const hasCountess = hand.some((c) => c.role === 'countess');
  if (!hasCountess) return false;
  return hand.some((c) => c.role === 'king' || c.role === 'prince');
}

function legalDiscardIds(hand: LoveLetterCard[]): string[] {
  if (mustDiscardCountess(hand)) {
    return hand.filter((c) => c.role === 'countess').map((c) => c.id);
  }
  return hand.map((c) => c.id);
}

function isProtected(state: LoveLetterState, playerId: string): boolean {
  const p = playerById(state, playerId);
  return p?.handmaidProtected === true;
}

function eligibleTargets(
  state: LoveLetterState,
  actorId: string,
  includeSelf: boolean,
): LoveLetterPlayerState[] {
  const inRound = playersInRound(state);
  const unprotected = inRound.filter((p) => !isProtected(state, p.id));
  if (includeSelf) {
    if (unprotected.length === 0) {
      const self = playerById(state, actorId);
      return self?.inRound ? [self] : [];
    }
    return unprotected;
  }
  return unprotected.filter((p) => p.id !== actorId);
}

function advanceToNextPlayer(state: LoveLetterState): void {
  const order = state.playerOrder;
  const n = order.length;
  if (n === 0) return;
  const startIdx = order.indexOf(state.currentPlayerId);
  for (let step = 1; step <= n; step += 1) {
    const idx = (startIdx + step) % n;
    const pid = order[idx];
    if (!pid) continue;
    const p = playerById(state, pid);
    if (p?.inRound) {
      state.currentPlayerId = pid;
      return;
    }
  }
}

function beginTurn(state: LoveLetterState): void {
  const p = playerById(state, state.currentPlayerId);
  if (!p?.inRound) {
    advanceToNextPlayer(state);
    return beginTurn(state);
  }

  p.handmaidProtected = false;

  const drawn = drawCard(state);
  if (drawn) {
    p.hand.push(drawn);
    state.lastEvent = `${p.name} จั่วการ์ด`;
  } else {
    state.lastEvent = `${p.name} จั่วการ์ด (กองหมด)`;
  }

  state.pendingAction = {
    mode: 'choose_discard',
    actorId: p.id,
    legalCardIds: legalDiscardIds(p.hand),
  };
}

function checkRoundEndAfterTurn(state: LoveLetterState): boolean {
  if (countInRound(state) <= 1) {
    endRound(state, 'last_standing');
    return true;
  }
  if (state.drawPile.length === 0) {
    endRound(state, 'deck_empty');
    return true;
  }
  return false;
}

function discardSum(p: LoveLetterPlayerState): number {
  return p.discardPile.reduce((sum, c) => sum + c.rank, 0);
}

function endRound(state: LoveLetterState, reason: LoveLetterRoundSummary['reason']): void {
  const remaining = playersInRound(state);
  let winnerIds: string[] = [];

  if (reason === 'last_standing' && remaining.length === 1) {
    winnerIds = [remaining[0]!.id];
  } else {
    let maxRank = -1;
    for (const p of remaining) {
      const rank = p.hand[0]?.rank ?? 0;
      if (rank > maxRank) maxRank = rank;
    }
    const tied = remaining.filter((p) => (p.hand[0]?.rank ?? 0) === maxRank);
    if (tied.length === 1) {
      winnerIds = [tied[0]!.id];
    } else {
      let maxDiscard = -1;
      for (const p of tied) {
        const sum = discardSum(p);
        if (sum > maxDiscard) maxDiscard = sum;
      }
      const tied2 = tied.filter((p) => discardSum(p) === maxDiscard);
      winnerIds = tied2.map((p) => p.id);
    }
  }

  for (const wid of winnerIds) {
    const wp = playerById(state, wid);
    if (wp) wp.affectionTokens += 1;
  }

  const summary: LoveLetterRoundSummary = {
    roundNo: state.roundNo,
    winnerIds,
    winnerNames: winnerIds.map((id) => playerById(state, id)?.name ?? id),
    reason,
    revealedHands: state.players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      card: p.hand[0] ? cloneCard(p.hand[0]) : null,
    })),
  };

  state.lastRoundSummary = summary;
  state.phase = 'round_end';
  state.pendingAction = null;
  state.lastEvent =
    winnerIds.length === 1
      ? `${summary.winnerNames[0]} ชนะรอบนี้`
      : `${summary.winnerNames.join(', ')} เสมอและชนะรอบนี้`;

  const gameOver = checkGameOver(state);
  if (gameOver) {
    state.phase = 'game_over';
    state.result = gameOver;
    return;
  }
}

function checkGameOver(state: LoveLetterState): GameResult | null {
  const winners = state.players
    .filter((p) => p.affectionTokens >= state.tokensToWin)
    .map((p) => p.id);
  if (winners.length === 0) return null;
  const names = winners.map((id) => playerById(state, id)?.name ?? id).join(', ');
  return {
    winners,
    reason: `${names} ได้รับโทเคนครบ ${state.tokensToWin} ใบ`,
  };
}

function startNewRound(state: LoveLetterState): void {
  state.roundNo += 1;
  const deck = shuffle(buildClassicDeck());

  state.burnedCard = deck.shift() ?? null;
  state.setAsideCards = [];

  if (state.playerOrder.length === 2) {
    state.setAsideCards = deck.splice(0, 3).map(cloneCard);
  }

  for (const p of state.players) {
    p.hand = [];
    p.discardPile = [];
    p.inRound = true;
    p.handmaidProtected = false;
    const card = deck.shift();
    if (card) p.hand.push(card);
  }

  state.drawPile = deck;
  state.currentPlayerId = state.roundStarterId;
  state.phase = 'playing';
  state.lastRoundSummary = null;
  state.pendingAction = null;

  beginTurn(state);
}

function setupRound(state: LoveLetterState, starterId: string): void {
  state.roundStarterId = starterId;
  state.roundNo = 1;
  startNewRound(state);
}

function applyCardEffect(state: LoveLetterState, actorId: string, card: LoveLetterCard): void {
  const actor = playerById(state, actorId);
  if (!actor) return;

  switch (card.role) {
    case 'guard': {
      const targets = eligibleTargets(state, actorId, false);
      if (targets.length === 0) {
        state.lastEvent = `${actor.name} ทิ้ง Guard แต่ไม่มีเป้าหมาย`;
        return;
      }
      state.pendingAction = {
        mode: 'target_player',
        actorId,
        effectRole: 'guard',
        targets: targets.map((t) => ({ id: t.id, name: t.name })),
      };
      return;
    }
    case 'priest': {
      const targets = eligibleTargets(state, actorId, false);
      if (targets.length === 0) {
        state.lastEvent = `${actor.name} ทิ้ง Priest แต่ไม่มีเป้าหมาย`;
        return;
      }
      state.pendingAction = {
        mode: 'target_player',
        actorId,
        effectRole: 'priest',
        targets: targets.map((t) => ({ id: t.id, name: t.name })),
      };
      return;
    }
    case 'baron': {
      const targets = eligibleTargets(state, actorId, false);
      if (targets.length === 0) {
        state.lastEvent = `${actor.name} ทิ้ง Baron แต่ไม่มีเป้าหมาย`;
        return;
      }
      state.pendingAction = {
        mode: 'target_player',
        actorId,
        effectRole: 'baron',
        targets: targets.map((t) => ({ id: t.id, name: t.name })),
      };
      return;
    }
    case 'handmaid':
      actor.handmaidProtected = true;
      state.lastEvent = `${actor.name} ได้รับความคุ้มครองจาก Handmaid`;
      return;
    case 'prince': {
      const targets = eligibleTargets(state, actorId, true);
      if (targets.length === 0) {
        state.lastEvent = `${actor.name} ทิ้ง Prince แต่ไม่มีเป้าหมาย`;
        return;
      }
      state.pendingAction = {
        mode: 'target_player',
        actorId,
        effectRole: 'prince',
        targets: targets.map((t) => ({ id: t.id, name: t.name })),
      };
      return;
    }
    case 'king': {
      const targets = eligibleTargets(state, actorId, false);
      if (targets.length === 0) {
        state.lastEvent = `${actor.name} ทิ้ง King แต่ไม่มีเป้าหมาย`;
        return;
      }
      state.pendingAction = {
        mode: 'target_player',
        actorId,
        effectRole: 'king',
        targets: targets.map((t) => ({ id: t.id, name: t.name })),
      };
      return;
    }
    case 'countess':
      state.lastEvent = `${actor.name} ทิ้ง Countess`;
      return;
    case 'princess':
      knockOut(state, actorId, `${actor.name} ทิ้ง Princess และออกจากรอบ`);
      return;
    default:
      return;
  }
}

function resolveBaronCompare(state: LoveLetterState, actorId: string, targetId: string): void {
  const actor = playerById(state, actorId);
  const target = playerById(state, targetId);
  if (!actor || !target) return;

  const actorRank = actor.hand[0]?.rank ?? 0;
  const targetRank = target.hand[0]?.rank ?? 0;

  if (actorRank < targetRank) {
    knockOut(state, actorId, `${actor.name} แพ้ Baron compare กับ ${target.name}`);
  } else if (targetRank < actorRank) {
    knockOut(state, targetId, `${target.name} แพ้ Baron compare กับ ${actor.name}`);
  } else {
    state.lastEvent = `${actor.name} กับ ${target.name} เสมอใน Baron compare`;
  }
}

function resolvePrince(state: LoveLetterState, targetId: string): void {
  const target = playerById(state, targetId);
  if (!target?.inRound) return;

  if (target.hand.length > 0) {
    const [discarded] = target.hand.splice(0, 1);
    if (discarded) {
      target.discardPile.push(discarded);
      if (discarded.role === 'princess') {
        knockOut(state, targetId, `${target.name} ถูกบังคับทิ้ง Princess และออกจากรอบ`);
        return;
      }
    }
  }

  const drawn = drawCard(state);
  if (drawn) {
    target.hand.push(drawn);
    state.lastEvent = `${target.name} ถูก Prince บังคับทิ้งมือและจั่วใหม่`;
  } else {
    state.lastEvent = `${target.name} ถูก Prince บังคับทิ้งมือ (กองหมด)`;
  }
}

function resolveKingSwap(state: LoveLetterState, actorId: string, targetId: string): void {
  const actor = playerById(state, actorId);
  const target = playerById(state, targetId);
  if (!actor || !target) return;
  const tmp = actor.hand;
  actor.hand = target.hand;
  target.hand = tmp;
  state.lastEvent = `${actor.name} สลับมือกับ ${target.name}`;
}

function finishTurn(state: LoveLetterState): void {
  if (checkRoundEndAfterTurn(state)) return;
  advanceToNextPlayer(state);
  beginTurn(state);
}

function handleChooseDiscard(state: LoveLetterState, playerId: string, cardId: string): void {
  const pending = state.pendingAction;
  if (!pending || pending.mode !== 'choose_discard' || pending.actorId !== playerId) {
    throw new GameActionRejectedError('ยังไม่ถึงเทิร์นหรือไม่ต้องเลือกการ์ดทิ้ง');
  }
  if (!pending.legalCardIds.includes(cardId)) {
    throw new GameActionRejectedError('เลือกการ์ดทิ้งไม่ได้');
  }

  const p = playerById(state, playerId);
  if (!p?.inRound) throw new GameActionRejectedError('คุณออกจากรอบแล้ว');

  const idx = p.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new GameActionRejectedError('ไม่มีการ์ดนี้ในมือ');

  const [card] = p.hand.splice(idx, 1);
  if (!card) return;
  p.discardPile.push(card);
  state.pendingAction = null;

  applyCardEffect(state, playerId, card);

  if (state.pendingAction) return;

  if (countInRound(state) <= 1) {
    endRound(state, 'last_standing');
    return;
  }

  finishTurn(state);
}

function handleResolveTarget(
  state: LoveLetterState,
  playerId: string,
  targetPlayerId: string,
): void {
  const pending = state.pendingAction;
  if (!pending || pending.mode !== 'target_player' || pending.actorId !== playerId) {
    throw new GameActionRejectedError('ยังไม่ต้องเลือกเป้าหมาย');
  }
  if (!pending.targets.some((t) => t.id === targetPlayerId)) {
    throw new GameActionRejectedError('เลือกเป้าหมายไม่ได้');
  }

  const target = playerById(state, targetPlayerId);
  if (!target?.inRound) throw new GameActionRejectedError('เป้าหมายออกจากรอบแล้ว');

  state.pendingAction = null;

  switch (pending.effectRole) {
    case 'guard':
      state.pendingAction = {
        mode: 'guard_guess',
        actorId: playerId,
        targetPlayerId,
        targetName: target.name,
      };
      return;
    case 'priest': {
      const peeked = target.hand[0];
      if (!peeked) {
        state.lastEvent = `${target.name} ไม่มีการ์ดในมือ`;
        break;
      }
      state.pendingAction = {
        mode: 'priest_peek',
        actorId: playerId,
        targetPlayerId,
        targetName: target.name,
        card: cloneCard(peeked),
      };
      return;
    }
    case 'baron':
      resolveBaronCompare(state, playerId, targetPlayerId);
      break;
    case 'prince':
      resolvePrince(state, targetPlayerId);
      break;
    case 'king':
      resolveKingSwap(state, playerId, targetPlayerId);
      break;
    default:
      break;
  }

  if (state.pendingAction) return;

  if (countInRound(state) <= 1) {
    endRound(state, 'last_standing');
    return;
  }

  finishTurn(state);
}

function handleGuardGuess(state: LoveLetterState, playerId: string, rank: number): void {
  const pending = state.pendingAction;
  if (!pending || pending.mode !== 'guard_guess' || pending.actorId !== playerId) {
    throw new GameActionRejectedError('ยังไม่ต้องทายเลข Guard');
  }
  if (rank < 2 || rank > 8) {
    throw new GameActionRejectedError('Guard ทายได้เฉพาะเลข 2–8');
  }

  const target = playerById(state, pending.targetPlayerId);
  state.pendingAction = null;

  if (target?.inRound && target.hand[0]?.rank === rank) {
    knockOut(state, target.id, `${target.name} ถูก Guard ทายถูก (เลข ${rank})`);
  } else {
    const name = target?.name ?? pending.targetName;
    state.lastEvent = `${name} ไม่ถูก Guard ทาย (เลข ${rank})`;
  }

  if (countInRound(state) <= 1) {
    endRound(state, 'last_standing');
    return;
  }

  finishTurn(state);
}

function handleAckPeek(state: LoveLetterState, playerId: string): void {
  const pending = state.pendingAction;
  if (!pending || pending.mode !== 'priest_peek' || pending.actorId !== playerId) {
    throw new GameActionRejectedError('ไม่มีข้อมูล peek');
  }
  state.pendingAction = null;

  if (countInRound(state) <= 1) {
    endRound(state, 'last_standing');
    return;
  }

  finishTurn(state);
}

function handleAckRoundSummary(state: LoveLetterState): void {
  if (state.phase !== 'round_end') {
    throw new GameActionRejectedError('ไม่มีสรุปรอบที่รอ');
  }
  if (state.result) {
    state.phase = 'game_over';
    return;
  }

  const prevWinners = state.lastRoundSummary?.winnerIds ?? [];
  if (prevWinners.length === 1) {
    state.roundStarterId = prevWinners[0]!;
  }

  startNewRound(state);
}

function filterPendingForView(
  pending: LoveLetterPendingAction | null,
  viewerId: string,
): LoveLetterPendingAction | null {
  if (!pending) return null;
  if (pending.mode === 'priest_peek' && pending.actorId !== viewerId) {
    return null;
  }
  return pending;
}

export const loveLetterGame: GameDefinition<LoveLetterState, LoveLetterAction> = {
  id: 'love-letter',
  name: 'Love Letter',
  description: 'ส่งจดหมายรักถึงเจ้าหญิงผ่านบรรดาคนในวัง — เกมการ์ดลับ 2–8 คน',
  minPlayers: 2,
  maxPlayers: 8,
  thumbnail: GAME_THUMBNAIL_BY_ID['love-letter'] || '/games/love-letter/cover.png',

  setup(players: Player[], options?: unknown): LoveLetterState {
    const opts = parseLoveLetterLobbyOptions(options);
    const order = players.map((p) => p.id);
    const tokensToWin = loveLetterTokensToWin(players.length);

    const playerStates: LoveLetterPlayerState[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: [],
      discardPile: [],
      inRound: true,
      affectionTokens: 0,
      handmaidProtected: false,
    }));

    const state: LoveLetterState = {
      phase: 'playing',
      edition: opts.edition,
      roundNo: 0,
      currentPlayerId: order[0]!,
      playerOrder: order,
      drawPile: [],
      burnedCard: null,
      setAsideCards: [],
      players: playerStates,
      lastRoundSummary: null,
      pendingAction: null,
      roundStarterId: order[0]!,
      tokensToWin,
      lastEvent: 'เกมเริ่ม',
      result: null,
    };

    setupRound(state, order[0]!);
    return state;
  },

  onAction(state: LoveLetterState, playerId: string, action: LoveLetterAction): LoveLetterState {
    const next: LoveLetterState = {
      ...state,
      players: state.players.map((p) => ({
        ...p,
        hand: p.hand.map(cloneCard),
        discardPile: p.discardPile.map(cloneCard),
      })),
      drawPile: state.drawPile.map(cloneCard),
      burnedCard: state.burnedCard ? cloneCard(state.burnedCard) : null,
      setAsideCards: state.setAsideCards.map(cloneCard),
      lastRoundSummary: state.lastRoundSummary
        ? {
            ...state.lastRoundSummary,
            revealedHands: state.lastRoundSummary.revealedHands.map((r) => ({
              ...r,
              card: r.card ? cloneCard(r.card) : null,
            })),
          }
        : null,
      pendingAction: state.pendingAction ? { ...state.pendingAction } : null,
      result: state.result ? { ...state.result } : null,
    };

    if (next.phase === 'game_over') {
      throw new GameActionRejectedError('เกมจบแล้ว');
    }

    switch (action.type) {
      case 'choose_discard':
        handleChooseDiscard(next, playerId, action.cardId);
        break;
      case 'resolve_target':
        handleResolveTarget(next, playerId, action.targetPlayerId);
        break;
      case 'resolve_guard_guess':
        handleGuardGuess(next, playerId, action.rank);
        break;
      case 'ack_peek':
        handleAckPeek(next, playerId);
        break;
      case 'ack_round_summary':
        handleAckRoundSummary(next);
        break;
      default:
        throw new GameActionRejectedError('action ไม่รู้จัก');
    }

    return next;
  },

  getPlayerView(state: LoveLetterState, playerId: string): LoveLetterPlayerView {
    const me = playerById(state, playerId);
    const pending = filterPendingForView(state.pendingAction, playerId);

    if (pending?.mode === 'priest_peek' && pending.actorId !== playerId) {
      // Hide peek card from others — already masked in filterPendingForView
    }

    return {
      phase: state.phase,
      edition: state.edition,
      roundNo: state.roundNo,
      myHand: me ? me.hand.map(cloneCard) : [],
      currentPlayerId: state.currentPlayerId,
      drawPileCount: state.drawPile.length,
      setAsideCards: state.setAsideCards.map(cloneCard),
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        discardPile: p.discardPile.map(cloneCard),
        inRound: p.inRound,
        affectionTokens: p.affectionTokens,
        handmaidProtected: p.handmaidProtected,
        isCurrent: p.id === state.currentPlayerId,
      })),
      lastRoundSummary: state.lastRoundSummary,
      pendingAction: pending,
      tokensToWin: state.tokensToWin,
      lastEvent: state.lastEvent,
      gameResult: state.result,
    };
  },

  isGameOver(state: LoveLetterState): GameResult | null {
    return state.result ?? checkGameOver(state);
  },
};
