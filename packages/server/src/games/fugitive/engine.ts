import type {
  FugitiveAction,
  FugitiveDrawPile,
  FugitiveLobbyOptions,
  FugitivePhase,
  FugitivePlayerView,
  FugitiveState,
  GameDefinition,
  GameResult,
  Player,
} from 'shared';
import {
  FUGITIVE_MANHUNT_THRESHOLD,
  FUGITIVE_PILE1_RANGE,
  FUGITIVE_PILE2_RANGE,
  FUGITIVE_PILE3_RANGE,
  GAME_THUMBNAIL_BY_ID,
  hasUnrevealedHideouts,
  lastHideoutValue,
  maxRevealedHideoutValue,
  parseFugitiveLobbyOptions,
  rangeArray,
  sprintValue,
  validateHideoutPlacement,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const MAX_EVENT_LOG = 32;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function nextInstanceId(): string {
  return `h_${Math.random().toString(36).slice(2, 11)}`;
}

function pushLog(s: FugitiveState, message: string): void {
  s.lastEvent = message;
  s.eventLog = [...s.eventLog, message].slice(-MAX_EVENT_LOG);
}

function pickRandomPlayerId(players: Array<{ id: string }>): string {
  const ids = players.map((p) => p.id);
  if (ids.length === 0) throw new Error('Fugitive setup requires players');
  return ids[Math.floor(Math.random() * ids.length)]!;
}

function resolveFugitiveId(players: Array<{ id: string }>, opts: FugitiveLobbyOptions): string {
  if (opts.fugitiveMode === 'manual' && opts.fugitivePlayerId) {
    const found = players.find((p) => p.id === opts.fugitivePlayerId);
    if (found) return found.id;
  }
  return pickRandomPlayerId(players);
}

function drawFromPile(s: FugitiveState, pile: FugitiveDrawPile): number {
  const deck = s.decks[pile];
  if (deck.length === 0) {
    throw new GameActionRejectedError('กองการ์ดนี้หมดแล้ว');
  }
  return deck.pop()!;
}

function removeCardsFromHand(hand: number[], cards: number[]): void {
  for (const card of cards) {
    const idx = hand.indexOf(card);
    if (idx < 0) throw new GameActionRejectedError(`ไม่มีการ์ด ${card} ในมือ`);
    hand.splice(idx, 1);
  }
}

function revealHideout(slot: FugitiveState['hideouts'][number]): void {
  slot.revealed = true;
}

function allHideoutsRevealed(s: FugitiveState): boolean {
  return s.hideouts.every((h) => h.revealed);
}

function setGameOver(s: FugitiveState, result: GameResult): void {
  s.phase = 'game_over';
  s.subphase = null;
  s.drawsRequired = 0;
  s.result = result;
}

function fugitiveWins(s: FugitiveState, reason: string): void {
  setGameOver(s, { winners: [s.fugitiveId], reason });
  pushLog(s, reason);
}

function marshalWins(s: FugitiveState, reason: string): void {
  setGameOver(s, { winners: [s.marshalId], reason });
  pushLog(s, reason);
}

function shouldTriggerManhunt(s: FugitiveState): boolean {
  const maxRevealed = maxRevealedHideoutValue(s.hideouts, true);
  if (maxRevealed === null) return true;
  return maxRevealed < FUGITIVE_MANHUNT_THRESHOLD;
}

function afterFugitivePlays42(s: FugitiveState, fugitiveName: string): void {
  if (allHideoutsRevealed(s)) {
    marshalWins(s, 'Marshal เปิด hideout ครบก่อน Fugitive หนี — Marshal ชนะ');
    return;
  }
  if (shouldTriggerManhunt(s) && hasUnrevealedHideouts(s.hideouts)) {
    s.manhuntActive = true;
    s.phase = 'manhunt';
    s.subphase = 'action';
    s.activePlayerId = s.marshalId;
    s.drawsRequired = 0;
    pushLog(s, `${fugitiveName} เล่นการ์ด 42 — Manhunt! Marshal ทายทีละเลขจนกว่าจะผิดหรือจับได้`);
    return;
  }
  fugitiveWins(s, `${fugitiveName} หนีออกเมืองด้วยการ์ด 42 — Fugitive ชนะ`);
}

function beginMarshalTurn(s: FugitiveState, phase: FugitivePhase): void {
  s.phase = phase;
  s.activePlayerId = s.marshalId;
  s.drawsRequired = phase === 'marshal_first' ? 2 : 1;
  s.subphase = s.drawsRequired > 0 ? 'draw' : 'action';
  s.hideoutsRequiredThisStep = 0;
}

function beginFugitiveTurn(s: FugitiveState): void {
  s.phase = 'fugitive_turn';
  s.activePlayerId = s.fugitiveId;
  s.drawsRequired = 1;
  s.subphase = 'draw';
  s.hideoutsRequiredThisStep = 0;
}

function endFugitiveStep(s: FugitiveState): void {
  if (s.phase === 'fugitive_first') {
    beginMarshalTurn(s, 'marshal_first');
    return;
  }
  if (s.phase === 'fugitive_turn') {
    beginMarshalTurn(s, 'marshal_turn');
  }
}

function playerName(s: FugitiveState, id: string): string {
  return s.players.find((p) => p.id === id)?.name ?? 'ผู้เล่น';
}

function handleDraw(s: FugitiveState, playerId: string, pile: FugitiveDrawPile): void {
  if (playerId !== s.activePlayerId) {
    throw new GameActionRejectedError('ยังไม่ถึงเทิร์นของคุณ');
  }
  if (s.subphase !== 'draw' || s.drawsRequired <= 0) {
    throw new GameActionRejectedError('ไม่ใช่ขั้นจั่วการ์ด');
  }
  const card = drawFromPile(s, pile);
  const hand = playerId === s.fugitiveId ? s.fugitiveHand : s.marshalHand;
  hand.push(card);
  s.drawsRequired -= 1;
  const name = playerName(s, playerId);
  pushLog(
    s,
    `${name} จั่วจากกอง ${pile === 'pile1' ? '4–14' : pile === 'pile2' ? '15–28' : '29–41'}`,
  );
  if (s.drawsRequired === 0) {
    s.subphase = 'action';
  }
}

function handlePlaceHideout(
  s: FugitiveState,
  playerId: string,
  hideoutCard: number,
  sprintCards: number[],
): void {
  if (playerId !== s.fugitiveId) {
    throw new GameActionRejectedError('เฉพาะ Fugitive เท่านั้น');
  }
  if (s.phase !== 'fugitive_first' && s.phase !== 'fugitive_turn') {
    throw new GameActionRejectedError('ไม่ใช่เทิร์น Fugitive');
  }
  if (s.subphase !== 'action') {
    throw new GameActionRejectedError('ต้องจั่วการ์ดก่อน (ถ้ามี)');
  }

  const prev = lastHideoutValue(s.hideouts);
  const validation = validateHideoutPlacement(prev, hideoutCard, sprintCards);
  if (!validation.ok) {
    throw new GameActionRejectedError(validation.error ?? 'วาง hideout ไม่ได้');
  }

  const allCards = [hideoutCard, ...sprintCards];
  removeCardsFromHand(s.fugitiveHand, allCards);

  const slot = {
    instanceId: nextInstanceId(),
    value: hideoutCard,
    revealed: hideoutCard === 42,
    sprintValues: [...sprintCards],
  };
  s.hideouts.push(slot);

  const fugitiveName = playerName(s, s.fugitiveId);
  const sprintNote =
    sprintCards.length > 0 ? ` (Sprint +${validation.sprintProvided} ใต้การ์ด)` : '';
  pushLog(s, `${fugitiveName} วาง hideout${sprintNote}`);

  if (hideoutCard === 42) {
    afterFugitivePlays42(s, fugitiveName);
    return;
  }

  if (s.phase === 'fugitive_first') {
    s.hideoutsRequiredThisStep -= 1;
    if (s.hideoutsRequiredThisStep <= 0) {
      endFugitiveStep(s);
    }
    return;
  }

  endFugitiveStep(s);
}

function handleFugitivePass(s: FugitiveState, playerId: string): void {
  if (playerId !== s.fugitiveId) {
    throw new GameActionRejectedError('เฉพาะ Fugitive เท่านั้น');
  }
  if (s.phase !== 'fugitive_turn') {
    throw new GameActionRejectedError('Pass ได้เฉพาะเทิร์นปกติ');
  }
  if (s.subphase !== 'action') {
    throw new GameActionRejectedError('ต้องจั่วการ์ดก่อน');
  }
  pushLog(s, `${playerName(s, playerId)} Pass`);
  endFugitiveStep(s);
}

function revealMatchingHideouts(s: FugitiveState, numbers: number[]): boolean {
  const unrevealed = s.hideouts.filter((h) => !h.revealed);
  const targets = new Set(numbers);
  for (const n of numbers) {
    const match = unrevealed.find((h) => h.value === n);
    if (!match) return false;
    targets.delete(n);
  }
  if (targets.size > 0) return false;
  for (const n of numbers) {
    const slot = s.hideouts.find((h) => h.value === n && !h.revealed);
    if (slot) revealHideout(slot);
  }
  return true;
}

function handleGuess(s: FugitiveState, playerId: string, numbers: number[]): void {
  if (playerId !== s.marshalId) {
    throw new GameActionRejectedError('เฉพาะ Marshal เท่านั้น');
  }
  if (s.phase !== 'marshal_first' && s.phase !== 'marshal_turn') {
    throw new GameActionRejectedError('ไม่ใช่เทิร์น Marshal');
  }
  if (s.subphase !== 'action') {
    throw new GameActionRejectedError('ต้องจั่วการ์ดก่อน');
  }

  const marshalName = playerName(s, s.marshalId);

  if (numbers.length === 0) {
    pushLog(s, `${marshalName} ข้ามการทาย`);
    beginFugitiveTurn(s);
    return;
  }

  const unique = [...new Set(numbers)];
  if (unique.length !== numbers.length) {
    throw new GameActionRejectedError('ห้ามทายเลขซ้ำ');
  }
  for (const n of numbers) {
    if (n < 1 || n > 41) {
      throw new GameActionRejectedError('ทายได้เฉพาะเลข hideout 1–41');
    }
  }

  const success = revealMatchingHideouts(s, numbers);
  if (!success) {
    pushLog(s, `${marshalName} ทาย ${numbers.join(', ')} — ผิด`);
    beginFugitiveTurn(s);
    return;
  }

  const revealedLabels = numbers.join(', ');
  const sprintInfo = numbers
    .map((n) => {
      const slot = s.hideouts.find((h) => h.value === n);
      if (!slot || slot.sprintValues.length === 0) return null;
      const vals = slot.sprintValues.map((c) => `${c}(+${sprintValue(c)})`).join(', ');
      return `${n}: sprint ${vals}`;
    })
    .filter(Boolean)
    .join('; ');
  pushLog(s, `${marshalName} ทายถูก ${revealedLabels}${sprintInfo ? ` — ${sprintInfo}` : ''}`);

  if (allHideoutsRevealed(s)) {
    marshalWins(s, 'Marshal เปิด hideout ครบ — Marshal ชนะ');
    return;
  }

  beginFugitiveTurn(s);
}

function handleManhuntGuess(s: FugitiveState, playerId: string, number: number): void {
  if (playerId !== s.marshalId) {
    throw new GameActionRejectedError('เฉพาะ Marshal เท่านั้น');
  }
  if (s.phase !== 'manhunt') {
    throw new GameActionRejectedError('ไม่ใช่ช่วง Manhunt');
  }
  if (number < 1 || number > 41) {
    throw new GameActionRejectedError('ทายได้เฉพาะเลข hideout 1–41');
  }

  const marshalName = playerName(s, s.marshalId);
  const unrevealed = s.hideouts.filter((h) => !h.revealed);
  const match = unrevealed.find((h) => h.value === number);

  if (!match) {
    fugitiveWins(s, `${marshalName} ทายผิดใน Manhunt — Fugitive หนีสำเร็จ`);
    return;
  }

  revealHideout(match);
  pushLog(s, `${marshalName} Manhunt ทายถูก ${number}`);

  if (allHideoutsRevealed(s)) {
    marshalWins(s, 'Marshal จับ Fugitive ได้ใน Manhunt — Marshal ชนะ');
  }
}

function buildHideoutViews(s: FugitiveState, isFugitive: boolean): FugitivePlayerView['hideouts'] {
  return s.hideouts.map((h) => {
    if (h.revealed || isFugitive) {
      return {
        instanceId: h.instanceId,
        value: h.value,
        revealed: h.revealed,
        sprintCount: h.sprintValues.length,
        sprintValues: h.sprintValues.length > 0 ? [...h.sprintValues] : undefined,
      };
    }
    return {
      instanceId: h.instanceId,
      revealed: false,
      sprintCount: h.sprintValues.length,
    };
  });
}

function viewFor(s: FugitiveState, playerId: string): FugitivePlayerView {
  const isFugitive = playerId === s.fugitiveId;
  const isMarshal = playerId === s.marshalId;
  const opponentId = isFugitive ? s.marshalId : s.fugitiveId;
  const opponentHand = isFugitive ? s.marshalHand : s.fugitiveHand;

  const inDraw = s.subphase === 'draw' && s.drawsRequired > 0 && playerId === s.activePlayerId;
  const inAction = s.subphase === 'action' && playerId === s.activePlayerId;

  const canPlaceHideout =
    isFugitive && inAction && (s.phase === 'fugitive_first' || s.phase === 'fugitive_turn');

  const canPass = isFugitive && inAction && s.phase === 'fugitive_turn';

  const canGuess =
    isMarshal && inAction && (s.phase === 'marshal_first' || s.phase === 'marshal_turn');

  const canManhuntGuess = isMarshal && s.phase === 'manhunt';

  return {
    phase: s.phase,
    subphase: s.subphase,
    myId: playerId,
    myRole: isFugitive ? 'fugitive' : 'marshal',
    fugitiveId: s.fugitiveId,
    marshalId: s.marshalId,
    activePlayerId: s.activePlayerId,
    opponentName: playerName(s, opponentId),
    opponentHandCount: opponentHand.length,
    players: s.players.map((p) => ({ ...p })),
    hideouts: buildHideoutViews(s, isFugitive),
    deckCounts: {
      pile1: s.decks.pile1.length,
      pile2: s.decks.pile2.length,
      pile3: s.decks.pile3.length,
    },
    myHand:
      isFugitive || isMarshal ? [...(isFugitive ? s.fugitiveHand : s.marshalHand)] : undefined,
    drawsRequired: s.drawsRequired,
    hideoutsRequiredThisStep: s.hideoutsRequiredThisStep,
    manhuntActive: s.manhuntActive,
    canAct: inDraw || canPlaceHideout || canPass || canGuess || canManhuntGuess,
    canDraw: inDraw,
    canPlaceHideout,
    canPass,
    canGuess,
    canManhuntGuess,
    lastHideoutValue: lastHideoutValue(s.hideouts),
    eventLog: [...s.eventLog],
    lastEvent: s.lastEvent,
    gameResult: s.result ?? undefined,
  };
}

export const fugitiveGame: GameDefinition<FugitiveState, FugitiveAction> = {
  id: 'fugitive',
  name: 'Fugitive',
  description: 'เกม 2 คน — Fugitive วาง hideout หนีไปการ์ด 42 ส่วน Marshal ทายเลขจับให้ทัน',
  minPlayers: 2,
  maxPlayers: 2,
  thumbnail:
    GAME_THUMBNAIL_BY_ID.fugitive ??
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1782402508/cover_vsaue7.webp',

  setup(players: Player[], options?: unknown): FugitiveState {
    if (players.length !== 2) {
      throw new Error('Fugitive requires exactly 2 players');
    }

    const seated = players.map((p) => ({ id: p.id, name: p.name }));
    const opts = parseFugitiveLobbyOptions(options);
    const fugitiveId = resolveFugitiveId(seated, opts);
    const marshalId = seated.find((p) => p.id !== fugitiveId)!.id;

    const pile1 = shuffle(rangeArray(FUGITIVE_PILE1_RANGE.min, FUGITIVE_PILE1_RANGE.max));
    const pile2 = shuffle(rangeArray(FUGITIVE_PILE2_RANGE.min, FUGITIVE_PILE2_RANGE.max));
    const pile3 = shuffle(rangeArray(FUGITIVE_PILE3_RANGE.min, FUGITIVE_PILE3_RANGE.max));

    const drawFrom = (pile: FugitiveDrawPile, count: number): number[] => {
      const cards: number[] = [];
      for (let i = 0; i < count; i += 1) {
        const deck = pile === 'pile1' ? pile1 : pile === 'pile2' ? pile2 : pile3;
        cards.push(deck.pop()!);
      }
      return cards;
    };

    const fugitiveHand = [1, 2, 3, 42, ...drawFrom('pile1', 3), ...drawFrom('pile2', 2)];

    const fugitiveName = seated.find((p) => p.id === fugitiveId)!.name;
    const marshalName = seated.find((p) => p.id === marshalId)!.name;

    const state: FugitiveState = {
      phase: 'fugitive_first',
      subphase: 'action',
      fugitiveId,
      marshalId,
      activePlayerId: fugitiveId,
      players: [
        { id: fugitiveId, name: fugitiveName, role: 'fugitive' },
        { id: marshalId, name: marshalName, role: 'marshal' },
      ],
      hideouts: [
        {
          instanceId: nextInstanceId(),
          value: 0,
          revealed: true,
          sprintValues: [],
        },
      ],
      decks: { pile1, pile2, pile3 },
      fugitiveHand,
      marshalHand: [],
      drawsRequired: 0,
      hideoutsRequiredThisStep: 2,
      manhuntActive: false,
      result: null,
      eventLog: [],
      lastEvent: '',
    };

    pushLog(
      state,
      `เริ่มเกม — ${fugitiveName} เป็น Fugitive, ${marshalName} เป็น Marshal · วาง hideout 2 ใบ`,
    );
    return state;
  },

  onAction(state: FugitiveState, playerId: string, action: FugitiveAction): FugitiveState {
    if (state.phase === 'game_over') {
      throw new GameActionRejectedError('เกมจบแล้ว');
    }

    const s: FugitiveState = {
      ...state,
      hideouts: state.hideouts.map((h) => ({
        ...h,
        sprintValues: [...h.sprintValues],
      })),
      decks: {
        pile1: [...state.decks.pile1],
        pile2: [...state.decks.pile2],
        pile3: [...state.decks.pile3],
      },
      fugitiveHand: [...state.fugitiveHand],
      marshalHand: [...state.marshalHand],
      players: state.players.map((p) => ({ ...p })),
      eventLog: [...state.eventLog],
    };

    switch (action.type) {
      case 'draw':
        handleDraw(s, playerId, action.pile);
        break;
      case 'place_hideout':
        handlePlaceHideout(s, playerId, action.hideoutCard, action.sprintCards ?? []);
        break;
      case 'pass':
        handleFugitivePass(s, playerId);
        break;
      case 'guess':
        handleGuess(s, playerId, action.numbers);
        break;
      case 'manhunt_guess':
        handleManhuntGuess(s, playerId, action.number);
        break;
      default:
        throw new GameActionRejectedError('action ไม่รู้จัก');
    }

    return s;
  },

  getPlayerView(state: FugitiveState, playerId: string): FugitivePlayerView {
    return viewFor(state, playerId);
  },

  isGameOver(state: FugitiveState): GameResult | null {
    return state.result;
  },
};
