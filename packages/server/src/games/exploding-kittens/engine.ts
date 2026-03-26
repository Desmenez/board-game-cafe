import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  ExplodingKittensAction,
  ExplodingKittensCard,
  ExplodingKittensCardType,
  ExplodingKittensPlayerState,
  ExplodingKittensPlayerView,
  ExplodingKittensState,
  PendingAction,
} from 'shared';

const BASE_COUNTS: Record<ExplodingKittensCardType, number> = {
  exploding_kitten: 4,
  defuse: 6,
  attack: 4,
  skip: 4,
  shuffle: 4,
  see_future: 5,
  favor: 4,
  nope: 5,
  cat_taco: 4,
  cat_melon: 4,
  cat_beard: 4,
  cat_rainbow: 4,
  cat_potato: 4,
};

let nextCardId = 1;
let nextActionId = 1;
let nextStealEventId = 1;
let nextThreeClaimEventId = 1;

function newCard(type: ExplodingKittensCardType): ExplodingKittensCard {
  return { id: `ek-${nextCardId++}`, type };
}

function newPendingActionId(): string {
  return `pa-${nextActionId++}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function alivePlayers(state: ExplodingKittensState): ExplodingKittensPlayerState[] {
  return state.players.filter((p) => p.alive);
}

function indexOfPlayer(state: ExplodingKittensState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId);
}

function nextAliveIndex(state: ExplodingKittensState, from: number): number {
  const n = state.players.length;
  let idx = from;
  for (let i = 0; i < n; i += 1) {
    idx = (idx + 1) % n;
    if (state.players[idx].alive) return idx;
  }
  return from;
}

function clearPeekForPlayer(state: ExplodingKittensState, playerId: string): void {
  if (state.seenTopByPlayer[playerId]) delete state.seenTopByPlayer[playerId];
}

function consumeOneTurnOrAdvance(state: ExplodingKittensState): void {
  const current = state.players[state.currentPlayerIndex];
  current.pendingTurns = Math.max(0, current.pendingTurns - 1);
  if (current.pendingTurns > 0) return;
  const nextIdx = nextAliveIndex(state, state.currentPlayerIndex);
  state.currentPlayerIndex = nextIdx;
  if (state.players[nextIdx].pendingTurns <= 0) {
    state.players[nextIdx].pendingTurns = 1;
  }
}

function assertCurrentPlayer(state: ExplodingKittensState, playerId: string): boolean {
  return state.players[state.currentPlayerIndex]?.id === playerId;
}

function findCardIndex(hand: ExplodingKittensCard[], cardId: string): number {
  return hand.findIndex((c) => c.id === cardId);
}

function popCardById(hand: ExplodingKittensCard[], cardId: string): ExplodingKittensCard | null {
  const idx = findCardIndex(hand, cardId);
  if (idx < 0) return null;
  const [card] = hand.splice(idx, 1);
  return card;
}

function isCatCard(type: ExplodingKittensCardType): boolean {
  return type.startsWith('cat_');
}

function buildStartingDrawPile(playerCount: number): ExplodingKittensCard[] {
  const copies = Math.max(1, Math.ceil(playerCount / 5));
  const cards: ExplodingKittensCard[] = [];
  const scalable: ExplodingKittensCardType[] = [
    'attack',
    'skip',
    'shuffle',
    'see_future',
    'favor',
    'nope',
    'cat_taco',
    'cat_melon',
    'cat_beard',
    'cat_rainbow',
    'cat_potato',
  ];
  for (const t of scalable) {
    const count = BASE_COUNTS[t] * copies;
    for (let i = 0; i < count; i += 1) cards.push(newCard(t));
  }
  return shuffle(cards);
}

function startPendingAction(
  state: ExplodingKittensState,
  actorId: string,
  type: PendingAction['type'],
  lastEvent: string,
  targetId?: string,
  requestedType?: ExplodingKittensCardType,
): void {
  state.phase = 'reaction';
  state.pendingAction = {
    id: newPendingActionId(),
    actorId,
    type,
    targetId,
    requestedType,
    nopeCount: 0,
    // Player who initiated the action should not need to "pass" their own action.
    passedBy: [actorId],
  };
  state.lastEvent = lastEvent;
}

function resolvePendingAction(state: ExplodingKittensState): void {
  const pa = state.pendingAction;
  if (!pa) return;
  state.pendingAction = undefined;
  state.phase = 'turn';

  // odd nope count => canceled
  const canceled = pa.nopeCount % 2 === 1;
  if (canceled) {
    if (pa.type === 'favor') {
      state.favorFromId = undefined;
      state.favorTargetId = undefined;
    }
    state.lastEvent = 'การ์ดถูก Nope ยกเลิก';
    return;
  }

  const current = state.players[state.currentPlayerIndex];
  if (!current.alive || current.id !== pa.actorId) {
    state.lastEvent = 'แอ็กชันหมดผล (ผู้เล่นไม่อยู่ในเทิร์น)';
    return;
  }

  if (pa.type === 'shuffle') {
    state.drawPile = shuffle(state.drawPile);
    state.lastEvent = `${current.name} สับกองการ์ด`;
    return;
  }
  if (pa.type === 'see_future') {
    state.seenTopByPlayer[current.id] = state.drawPile.slice(0, 3).map((c) => c.type);
    state.lastEvent = `${current.name} ดูการ์ดบนกอง 3 ใบ`;
    return;
  }
  if (pa.type === 'favor') {
    const targetId = pa.targetId ?? state.favorTargetId;
    if (!targetId) {
      state.lastEvent = 'Favor ไม่มีเป้าหมาย';
      return;
    }
    const targetName = state.players.find((p) => p.id === targetId)?.name ?? '?';
    state.phase = 'favor_give';
    state.favorFromId = current.id;
    state.favorTargetId = targetId;
    state.lastEvent = `${current.name} ใช้ Favor กับ ${targetName}`;
    return;
  }
  if (pa.type === 'five_cats') {
    state.phase = 'five_cats_pick_discard';
    state.fiveCatsPickerId = current.id;
    state.lastEvent = `${current.name} ใช้คอมโบ 5 แมวต่างกัน — เลือกการ์ดจากกองทิ้ง`;
    return;
  }
  if (pa.type === 'pair_steal') {
    const targetId = pa.targetId;
    if (!targetId) {
      state.lastEvent = 'คอมโบคู่แมวไม่มีเป้าหมาย';
      return;
    }
    const targetIdx = indexOfPlayer(state, targetId);
    if (targetIdx < 0) {
      state.lastEvent = 'เป้าหมายไม่อยู่ในเกม';
      return;
    }
    const target = state.players[targetIdx];
    if (!target.alive || target.hand.length === 0) {
      state.lastEvent = `${target.name} ไม่มีการ์ดให้ขโมย`;
      return;
    }
    const rand = Math.floor(Math.random() * target.hand.length);
    const [stolen] = target.hand.splice(rand, 1);
    if (stolen) {
      current.hand.push(stolen);
      state.lastStealEvent = {
        id: nextStealEventId++,
        actorId: current.id,
        targetId: target.id,
        cardType: stolen.type,
      };
      state.lastEvent = `${current.name} ใช้คู่แมวและขโมยการ์ดจาก ${target.name}`;
    }
    return;
  }
  if (pa.type === 'three_claim') {
    const targetId = pa.targetId;
    const requestedType = pa.requestedType;
    if (!targetId || !requestedType) {
      state.lastEvent = 'คอมโบ 3 ใบไม่มีข้อมูลเป้าหมาย/การ์ดที่ขอ';
      return;
    }
    const targetIdx = indexOfPlayer(state, targetId);
    if (targetIdx < 0) {
      state.lastEvent = 'เป้าหมายไม่อยู่ในเกม';
      return;
    }
    const target = state.players[targetIdx];
    const wantedIdx = target.hand.findIndex((c) => c.type === requestedType);
    if (wantedIdx >= 0) {
      const [stolen] = target.hand.splice(wantedIdx, 1);
      if (stolen) {
        current.hand.push(stolen);
        state.lastStealEvent = {
          id: nextStealEventId++,
          actorId: current.id,
          targetId: target.id,
          cardType: stolen.type,
        };
      }
      state.lastThreeClaimEvent = {
        id: nextThreeClaimEventId++,
        actorId: current.id,
        targetId: target.id,
        requestedType,
        success: true,
      };
      state.lastEvent = `${current.name} ใช้ 3 ใบเรียก ${target.name} และได้การ์ดตามที่ขอ`;
    } else {
      state.lastThreeClaimEvent = {
        id: nextThreeClaimEventId++,
        actorId: current.id,
        targetId: target.id,
        requestedType,
        success: false,
      };
      state.lastEvent = `${current.name} ใช้ 3 ใบเรียกการ์ดจาก ${target.name} แต่เป้าหมายไม่มีการ์ดที่ขอ`;
    }
    return;
  }
  if (pa.type === 'skip') {
    clearPeekForPlayer(state, current.id);
    consumeOneTurnOrAdvance(state);
    state.lastEvent = `${current.name} ข้ามเทิร์น`;
    return;
  }
  if (pa.type === 'attack') {
    const turnsToPass = Math.max(1, current.pendingTurns) + 1;
    current.pendingTurns = 0;
    const nextIdx = nextAliveIndex(state, state.currentPlayerIndex);
    state.currentPlayerIndex = nextIdx;
    state.players[nextIdx].pendingTurns += turnsToPass;
    clearPeekForPlayer(state, current.id);
    state.lastEvent = `${current.name} ใช้ Attack — คนถัดไปต้องเล่น ${state.players[nextIdx].pendingTurns} เทิร์น`;
  }
}

function hasLivingWinner(state: ExplodingKittensState): string | null {
  const alive = alivePlayers(state);
  if (alive.length === 1) return alive[0].id;
  return null;
}

/**
 * Resolve explosion reveal phase after the 5s cinematic.
 * - If player has Defuse: move to explicit "use defuse" prompt.
 * - If no Defuse: player dies immediately.
 */
export function resolveExplosionReveal(state: ExplodingKittensState): ExplodingKittensState {
  if (state.phase !== 'explosion_reveal' || !state.explosionPlayerId || !state.defusingKitten) return state;
  const explosionPlayerId = state.explosionPlayerId;
  const kitten = state.defusingKitten;

  const s: ExplodingKittensState = {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    seenTopByPlayer: { ...state.seenTopByPlayer },
  };

  const victimIdx = indexOfPlayer(s, explosionPlayerId);
  if (victimIdx < 0) return s;
  const victim = s.players[victimIdx];

  if (s.explosionHasDefuse) {
    s.phase = 'defuse_prompt';
    s.defusingPlayerId = victim.id;
    s.lastEvent = `${victim.name} ต้องกดใช้ Defuse`;
    return s;
  }

  victim.alive = false;
  victim.pendingTurns = 0;
  s.discardPile.push(kitten);
  s.defusingKitten = undefined;
  s.defusingPlayerId = undefined;
  s.explosionPlayerId = undefined;
  s.explosionHasDefuse = undefined;
  s.lastEvent = `${victim.name} ระเบิดและออกจากเกม`;

  const winner = hasLivingWinner(s);
  if (winner) {
    s.phase = 'game_over';
    s.winnerId = winner;
    return s;
  }

  s.phase = 'turn';
  if (s.currentPlayerIndex === victimIdx) {
    const nextIdx = nextAliveIndex(s, victimIdx);
    s.currentPlayerIndex = nextIdx;
    if (s.players[nextIdx].pendingTurns <= 0) s.players[nextIdx].pendingTurns = 1;
  }
  return s;
}

// function canUseNope(state: ExplodingKittensState, playerId: string): boolean {
//   const me = state.players.find((p) => p.id === playerId);
//   if (!me?.alive) return false;
//   return me.hand.some((c) => c.type === 'nope');
// }

export const explodingKittensGame: GameDefinition<ExplodingKittensState, ExplodingKittensAction> = {
  id: 'exploding-kittens',
  name: 'Exploding Kittens',
  description:
    'เกมสายปั่นสไตล์ Russian Roulette: เล่นการ์ดเพื่อเอาตัวรอดจาก Exploding Kitten และอยู่เป็นคนสุดท้ายให้ได้',
  minPlayers: 2,
  maxPlayers: 50,
  thumbnail: '/games/exploding-kittens/thumbnail.png',

  setup(players: Player[]): ExplodingKittensState {
    const playerCount = players.length;
    const drawPile = buildStartingDrawPile(playerCount);

    const gamePlayers: ExplodingKittensPlayerState[] = players.map((p, i) => ({
      id: p.id,
      name: p.name,
      alive: true,
      hand: [newCard('defuse')],
      pendingTurns: i === 0 ? 1 : 0,
    }));

    // Deal 4 random cards to each player (plus 1 defuse => 5 total)
    for (let round = 0; round < 4; round += 1) {
      for (const pl of gamePlayers) {
        const c = drawPile.shift();
        if (c) pl.hand.push(c);
      }
    }

    // Add extra defuse + exploding kittens into draw pile.
    const copies = Math.max(1, Math.ceil(playerCount / 5));
    const extraDefuse = 2 * copies;
    const kittens = Math.max(1, playerCount - 1);
    for (let i = 0; i < extraDefuse; i += 1) drawPile.push(newCard('defuse'));
    for (let i = 0; i < kittens; i += 1) drawPile.push(newCard('exploding_kitten'));

    const shuffled = shuffle(drawPile);
    return {
      mode: 'original',
      phase: 'turn',
      players: gamePlayers,
      drawPile: shuffled,
      discardPile: [],
      currentPlayerIndex: 0,
      seenTopByPlayer: {},
      lastEvent: `เริ่มเกมแล้ว (${playerCount} คน)`,
    };
  },

  onAction(
    state: ExplodingKittensState,
    playerId: string,
    action: ExplodingKittensAction,
  ): ExplodingKittensState {
    const s: ExplodingKittensState = {
      ...state,
      players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
      drawPile: [...state.drawPile],
      discardPile: [...state.discardPile],
      seenTopByPlayer: { ...state.seenTopByPlayer },
      pendingAction: state.pendingAction
        ? { ...state.pendingAction, passedBy: [...state.pendingAction.passedBy] }
        : undefined,
    };

    const meIdx = indexOfPlayer(s, playerId);
    if (meIdx < 0) return s;
    const me = s.players[meIdx];
    if (!me.alive) return s;
    if (s.phase === 'game_over') return s;

    if (action.type === 'react_nope') {
      if (s.phase !== 'reaction' || !s.pendingAction) return s;
      const played = popCardById(me.hand, action.cardId);
      if (!played || played.type !== 'nope') return s;
      s.discardPile.push(played);
      s.pendingAction.nopeCount += 1;
      s.pendingAction.passedBy = [playerId];
      s.lastEvent = `${me.name} เล่น Nope`;
      return s;
    }

    if (action.type === 'react_pass') {
      if (s.phase !== 'reaction' || !s.pendingAction) return s;
      if (!s.pendingAction.passedBy.includes(playerId)) {
        s.pendingAction.passedBy.push(playerId);
      }
      const aliveIds = alivePlayers(s).map((p) => p.id);
      const allPassed = aliveIds.every((id) => s.pendingAction?.passedBy.includes(id));
      if (allPassed) resolvePendingAction(s);
      return s;
    }

    // Other actions must be by current player, except target-side prompts.
    if (
      action.type !== 'favor_choose_give' &&
      action.type !== 'five_cats_pick_discard' &&
      !assertCurrentPlayer(s, playerId)
    ) {
      return s;
    }

    if (action.type === 'draw_card') {
      if (s.phase !== 'turn') return s;
      clearPeekForPlayer(s, playerId);
      const card = s.drawPile.shift();
      if (!card) return s;
      if (card.type !== 'exploding_kitten') {
        me.hand.push(card);
        consumeOneTurnOrAdvance(s);
        s.lastEvent = `${me.name} จั่วการ์ด`;
        return s;
      }
      const hasDefuse = me.hand.some((c) => c.type === 'defuse');
      s.phase = 'explosion_reveal';
      s.explosionPlayerId = me.id;
      s.explosionHasDefuse = hasDefuse;
      s.defusingKitten = card;
      s.defusingPlayerId = me.id;
      s.lastEvent = `${me.name} จั่ว Exploding Kitten!`;
      return s;
    }

    if (action.type === 'use_defuse') {
      if (s.phase !== 'defuse_prompt' || s.defusingPlayerId !== playerId || !s.defusingKitten) return s;
      const defuseIdx = me.hand.findIndex((c) => c.type === 'defuse');
      if (defuseIdx < 0) return s;
      const [defuseCard] = me.hand.splice(defuseIdx, 1);
      s.discardPile.push(defuseCard);
      s.phase = 'defuse_reinsert';
      s.explosionPlayerId = undefined;
      s.explosionHasDefuse = undefined;
      s.lastEvent = `${me.name} ใช้ Defuse สำเร็จ เลือกตำแหน่งวางระเบิด`;
      return s;
    }

    if (action.type === 'defuse_reinsert') {
      if (s.phase !== 'defuse_reinsert' || s.defusingPlayerId !== playerId || !s.defusingKitten)
        return s;
      const pos = Math.max(0, Math.min(action.index, s.drawPile.length));
      s.drawPile.splice(pos, 0, s.defusingKitten);
      s.defusingKitten = undefined;
      s.defusingPlayerId = undefined;
      s.explosionPlayerId = undefined;
      s.explosionHasDefuse = undefined;
      s.phase = 'turn';
      consumeOneTurnOrAdvance(s);
      s.lastEvent = `${me.name} ใช้ Defuse และใส่ระเบิดกลับกอง`;
      return s;
    }

    if (action.type === 'play_card') {
      if (s.phase !== 'turn') return s;
      const played = popCardById(me.hand, action.cardId);
      if (!played) return s;
      s.discardPile.push(played);
      clearPeekForPlayer(s, playerId);

      if (played.type === 'shuffle') {
        startPendingAction(s, playerId, 'shuffle', `${me.name} เล่น Shuffle`);
        return s;
      }
      if (played.type === 'see_future') {
        startPendingAction(s, playerId, 'see_future', `${me.name} เล่น See the Future`);
        return s;
      }
      if (played.type === 'skip') {
        startPendingAction(s, playerId, 'skip', `${me.name} เล่น Skip`);
        return s;
      }
      if (played.type === 'attack') {
        startPendingAction(s, playerId, 'attack', `${me.name} เล่น Attack`);
        return s;
      }
      if (played.type === 'favor') {
        s.phase = 'favor_target';
        s.favorFromId = me.id;
        s.favorTargetId = undefined;
        s.lastEvent = `${me.name} เล่น Favor — เลือกเป้าหมายก่อน`;
        return s;
      }
      // nope cannot be played from main-turn by this action path
      if (played.type === 'nope') {
        // invalid in main play; return card to hand for safety
        me.hand.push(played);
        s.discardPile.pop();
        return s;
      }
      // Cat cards cannot be single-played
      me.hand.push(played);
      s.discardPile.pop();
      return s;
    }

    if (action.type === 'play_pair') {
      if (s.phase !== 'turn') return s;
      const ca = popCardById(me.hand, action.cardIdA);
      const cb = popCardById(me.hand, action.cardIdB);
      if (!ca || !cb || ca.type !== cb.type || !ca.type.startsWith('cat_')) {
        if (ca) me.hand.push(ca);
        if (cb) me.hand.push(cb);
        return s;
      }
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0 || !s.players[targetIdx].alive || s.players[targetIdx].hand.length === 0) {
        me.hand.push(ca, cb);
        return s;
      }
      s.discardPile.push(ca, cb);
      startPendingAction(
        s,
        playerId,
        'pair_steal',
        `${me.name} ใช้คู่แมว เลือกขโมยจาก ${s.players[targetIdx].name}`,
        s.players[targetIdx].id,
      );
      return s;
    }

    if (action.type === 'play_three_claim') {
      if (s.phase !== 'turn') return s;
      const ca = popCardById(me.hand, action.cardIdA);
      const cb = popCardById(me.hand, action.cardIdB);
      const cc = popCardById(me.hand, action.cardIdC);
      if (
        !ca ||
        !cb ||
        !cc ||
        ca.type !== cb.type ||
        cb.type !== cc.type ||
        !ca.type.startsWith('cat_')
      ) {
        if (ca) me.hand.push(ca);
        if (cb) me.hand.push(cb);
        if (cc) me.hand.push(cc);
        return s;
      }
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0 || !s.players[targetIdx].alive) {
        me.hand.push(ca, cb, cc);
        return s;
      }
      s.discardPile.push(ca, cb, cc);
      startPendingAction(
        s,
        playerId,
        'three_claim',
        `${me.name} ใช้ 3 ใบเรียกการ์ดจาก ${s.players[targetIdx].name}`,
        s.players[targetIdx].id,
        action.requestedType,
      );
      return s;
    }

    if (action.type === 'play_five_cats') {
      if (s.phase !== 'turn') return s;
      const [a, b, c, d, e] = action.cardIds;
      const picked = [popCardById(me.hand, a), popCardById(me.hand, b), popCardById(me.hand, c), popCardById(me.hand, d), popCardById(me.hand, e)];
      if (picked.some((x) => x == null)) {
        for (const card of picked) if (card) me.hand.push(card);
        return s;
      }
      const cards = picked as ExplodingKittensCard[];
      const allCats = cards.every((card) => isCatCard(card.type));
      const distinctTypes = new Set(cards.map((card) => card.type)).size === 5;
      if (!allCats || !distinctTypes) {
        me.hand.push(...cards);
        return s;
      }
      s.discardPile.push(...cards);
      startPendingAction(s, playerId, 'five_cats', `${me.name} เล่นคอมโบ 5 แมวต่างกัน`);
      return s;
    }

    if (action.type === 'favor_choose_target') {
      if (s.phase !== 'favor_target' || s.favorFromId !== playerId) return s;
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) return s;
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId || target.hand.length === 0) return s;
      s.favorTargetId = target.id;
      startPendingAction(s, playerId, 'favor', `${me.name} เลือก Favor เป้าหมาย: ${target.name}`, target.id);
      return s;
    }

    if (action.type === 'favor_choose_give') {
      if (
        s.phase !== 'favor_give' ||
        !s.favorFromId ||
        !s.favorTargetId ||
        s.favorTargetId !== playerId
      )
        return s;
      const fromIdx = indexOfPlayer(s, s.favorFromId);
      if (fromIdx < 0) return s;
      const from = s.players[fromIdx];
      const given = popCardById(me.hand, action.cardId);
      if (!given) return s;
      from.hand.push(given);
      s.lastStealEvent = {
        id: nextStealEventId++,
        actorId: from.id,
        targetId: me.id,
        cardType: given.type,
      };
      s.phase = 'turn';
      s.favorFromId = undefined;
      s.favorTargetId = undefined;
      s.lastEvent = `${me.name} มอบการ์ดให้ ${from.name}`;
      return s;
    }

    if (action.type === 'five_cats_pick_discard') {
      if (s.phase !== 'five_cats_pick_discard' || s.fiveCatsPickerId !== playerId) return s;
      const discardIdx = s.discardPile.findIndex((card) => card.id === action.discardCardId);
      if (discardIdx < 0) return s;
      const [picked] = s.discardPile.splice(discardIdx, 1);
      me.hand.push(picked);
      s.phase = 'turn';
      s.fiveCatsPickerId = undefined;
      s.lastEvent = `${me.name} หยิบการ์ดจากกองทิ้งด้วยคอมโบ 5 แมวต่างกัน`;
      return s;
    }

    return s;
  },

  getPlayerView(state: ExplodingKittensState, playerId: string): ExplodingKittensPlayerView {
    const me = state.players.find((p) => p.id === playerId);
    if (!me) throw new Error(`Player ${playerId} not found`);
    const current = state.players[state.currentPlayerIndex];
    const winnerName = state.winnerId
      ? state.players.find((p) => p.id === state.winnerId)?.name
      : undefined;

    return {
      mode: state.mode,
      phase: state.phase,
      me: { id: me.id, name: me.name, alive: me.alive, pendingTurns: me.pendingTurns },
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        handCount: p.hand.length,
        pendingTurns: p.pendingTurns,
      })),
      myHand: [...me.hand],
      drawPileCount: state.drawPile.length,
      discardTop: state.discardPile[state.discardPile.length - 1]?.type,
      discardCount: state.discardPile.length,
      discardHistory: [...state.discardPile].reverse().map((c) => c.type),
      discardCards: [...state.discardPile].reverse(),
      currentPlayerId: current.id,
      currentPlayerName: current.name,
      pendingTurnsForCurrent: current.pendingTurns,
      pendingAction: state.pendingAction
        ? {
            actorId: state.pendingAction.actorId,
            actorName:
              state.players.find((p) => p.id === state.pendingAction?.actorId)?.name ?? '?',
            type: state.pendingAction.type,
            targetId: state.pendingAction.targetId,
            requestedType: state.pendingAction.requestedType,
            nopeCount: state.pendingAction.nopeCount,
            passedBy: [...state.pendingAction.passedBy],
          }
        : undefined,
      explosionReveal:
        state.phase === 'explosion_reveal' && state.explosionPlayerId
          ? {
              playerId: state.explosionPlayerId,
              playerName: state.players.find((p) => p.id === state.explosionPlayerId)?.name ?? '?',
              hasDefuse: Boolean(state.explosionHasDefuse),
            }
          : undefined,
      stealNotice: (() => {
        const ev = state.lastStealEvent;
        if (!ev) return undefined;
        const actorName = state.players.find((p) => p.id === ev.actorId)?.name ?? '?';
        const targetName = state.players.find((p) => p.id === ev.targetId)?.name ?? '?';
        const shouldRevealCard = playerId === ev.actorId || playerId === ev.targetId;
        return {
          id: ev.id,
          actorId: ev.actorId,
          actorName,
          targetId: ev.targetId,
          targetName,
          cardType: shouldRevealCard ? ev.cardType : undefined,
        };
      })(),
      threeClaimNotice: (() => {
        const ev = state.lastThreeClaimEvent;
        if (!ev) return undefined;
        const actorName = state.players.find((p) => p.id === ev.actorId)?.name ?? '?';
        const targetName = state.players.find((p) => p.id === ev.targetId)?.name ?? '?';
        return {
          id: ev.id,
          actorId: ev.actorId,
          actorName,
          targetId: ev.targetId,
          targetName,
          requestedType: ev.requestedType,
          success: ev.success,
        };
      })(),
      favorPrompt:
        state.phase === 'favor_target' || state.phase === 'favor_give'
          ? { fromId: state.favorFromId ?? '', targetId: state.favorTargetId }
          : undefined,
      fiveCatsPrompt:
        state.phase === 'five_cats_pick_discard' && state.fiveCatsPickerId
          ? { pickerId: state.fiveCatsPickerId }
          : undefined,
      defusePrompt:
        (state.phase === 'defuse_prompt' || state.phase === 'defuse_reinsert') &&
        state.defusingPlayerId === playerId
          ? { playerId, drawPileCount: state.drawPile.length }
          : undefined,
      seenTopCards: state.seenTopByPlayer[playerId],
      winnerId: state.winnerId,
      winnerName,
      lastEvent: state.lastEvent,
    };
  },

  isGameOver(state: ExplodingKittensState): GameResult | null {
    if (state.phase !== 'game_over' || !state.winnerId) return null;
    return { winners: [state.winnerId], reason: `${state.winnerId} ชนะเกม` };
  },
};
