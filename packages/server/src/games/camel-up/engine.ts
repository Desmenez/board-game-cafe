import {
  CAMEL_UP_COLORS,
  CAMEL_UP_STARTING_EP,
  CAMEL_UP_TRACK_LENGTH,
  GAME_THUMBNAIL_BY_ID,
  camelUpLegBetStack,
  camelUpOverallPayout,
  camelUpPyramidTilesPerPlayer,
  type CamelUpAction,
  type CamelUpColor,
  type CamelUpDesertEffect,
  type CamelUpLastRoll,
  type CamelUpLegScoringSummary,
  type CamelUpMyOverallBet,
  type CamelUpPlayerView,
  type CamelUpPyramidDie,
  type CamelUpScoringBreakdown,
  type GameDefinition,
  type GameResult,
  type Player,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

interface CamelUpPlayerState {
  ep: number;
  pyramidTiles: number;
  raceCardsWinnerInHand: CamelUpColor[];
  raceCardsLoserInHand: CamelUpColor[];
  legBet: { color: CamelUpColor; value: number } | null;
  desertOnTrack: boolean;
}

interface CamelUpState {
  phase: 'leg_play' | 'leg_scoring' | 'game_over';
  leg: number;
  playerCount: number;
  playerOrder: string[];
  playerNames: Record<string, string>;
  currentTurnIndex: number;
  players: Record<string, CamelUpPlayerState>;
  /** space -> stack bottom to top */
  track: Record<number, CamelUpColor[]>;
  desertTiles: Array<{ playerId: string; space: number; effect: CamelUpDesertEffect }>;
  legBetStacks: Record<CamelUpColor, number[]>;
  overallWinnerPiles: Record<CamelUpColor, Array<{ playerId: string; color: CamelUpColor }>>;
  overallLoserPiles: Record<CamelUpColor, Array<{ playerId: string; color: CamelUpColor }>>;
  overallWinnerPlacements: Array<{ playerId: string }>;
  overallLoserPlacements: Array<{ playerId: string }>;
  pyramidDiceBag: CamelUpPyramidDie[];
  rolledDice: CamelUpPyramidDie[];
  lastRoll: CamelUpLastRoll | null;
  /** first player to leg-bet each color this leg */
  firstLegBetOnColor: Partial<Record<CamelUpColor, string>>;
  lastEvent: string;
  result: GameResult | null;
  raceWinnerColor?: CamelUpColor;
  raceLoserColor?: CamelUpColor;
  scoringBreakdown?: CamelUpScoringBreakdown[];
  legScoringSummary?: CamelUpLegScoringSummary;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneState(state: CamelUpState): CamelUpState {
  return structuredClone(state);
}

function reject(message: string): never {
  throw new GameActionRejectedError(message);
}

function activePlayerId(state: CamelUpState): string | null {
  if (state.phase !== 'leg_play') return null;
  return state.playerOrder[state.currentTurnIndex] ?? null;
}

function assertActive(state: CamelUpState, playerId: string): void {
  if (activePlayerId(state) !== playerId) reject('ไม่ใช่ตาคุณ');
}

function advanceTurn(state: CamelUpState): void {
  state.currentTurnIndex = (state.currentTurnIndex + 1) % state.playerOrder.length;
}

function randomPyramidDieValue(): CamelUpPyramidDie['value'] {
  return (Math.floor(Math.random() * 3) + 1) as CamelUpPyramidDie['value'];
}

function buildPyramidDiceBag(): CamelUpPyramidDie[] {
  const dice = CAMEL_UP_COLORS.map((color) => ({
    color,
    value: randomPyramidDieValue(),
  }));
  return shuffle(dice);
}

function buildLegBetStacks(): Record<CamelUpColor, number[]> {
  const values = [...camelUpLegBetStack()];
  const stacks = {} as Record<CamelUpColor, number[]>;
  for (const color of CAMEL_UP_COLORS) {
    stacks[color] = [...values];
  }
  return stacks;
}

function emptyOverallPiles(): Record<
  CamelUpColor,
  Array<{ playerId: string; color: CamelUpColor }>
> {
  const piles = {} as Record<CamelUpColor, Array<{ playerId: string; color: CamelUpColor }>>;
  for (const color of CAMEL_UP_COLORS) {
    piles[color] = [];
  }
  return piles;
}

function resetCamelsOnTrack(): Record<number, CamelUpColor[]> {
  return { 1: shuffle(CAMEL_UP_COLORS) };
}

function findCamelSpace(track: Record<number, CamelUpColor[]>, color: CamelUpColor): number | null {
  for (let space = 1; space <= CAMEL_UP_TRACK_LENGTH; space += 1) {
    const stack = track[space];
    if (stack?.includes(color)) return space;
  }
  return null;
}

function getStack(track: Record<number, CamelUpColor[]>, space: number): CamelUpColor[] {
  return track[space] ?? [];
}

function removeStackAt(track: Record<number, CamelUpColor[]>, space: number): CamelUpColor[] {
  const stack = [...getStack(track, space)];
  delete track[space];
  return stack;
}

function applyDesertAfterLanding(
  state: CamelUpState,
  space: number,
  movingColor: CamelUpColor,
): { crossedFinish: boolean; winnerColor: CamelUpColor | null } {
  const desert = state.desertTiles.find((d) => d.space === space);
  if (!desert) return { crossedFinish: false, winnerColor: null };

  const extra = desert.effect === 'oasis' ? 1 : -1;
  return moveCamelColor(state, movingColor, extra);
}

function splitStackAtColor(
  stack: CamelUpColor[],
  color: CamelUpColor,
): { moving: CamelUpColor[]; staying: CamelUpColor[] } {
  const colorIndex = stack.indexOf(color);
  if (colorIndex === -1) return { moving: [], staying: stack };
  return {
    staying: stack.slice(0, colorIndex),
    moving: stack.slice(colorIndex),
  };
}

function moveCamelColor(
  state: CamelUpState,
  color: CamelUpColor,
  steps: number,
): { crossedFinish: boolean; winnerColor: CamelUpColor | null } {
  const fromSpace = findCamelSpace(state.track, color);
  if (fromSpace === null) return { crossedFinish: false, winnerColor: null };

  const fullStack = removeStackAt(state.track, fromSpace);
  const { moving, staying } = splitStackAtColor(fullStack, color);
  if (moving.length === 0) return { crossedFinish: false, winnerColor: null };

  if (staying.length > 0) {
    state.track[fromSpace] = staying;
  }

  let toSpace = fromSpace + steps;
  if (toSpace < 1) toSpace = 1;

  const crossedFinish = toSpace > CAMEL_UP_TRACK_LENGTH;
  if (toSpace > CAMEL_UP_TRACK_LENGTH) toSpace = CAMEL_UP_TRACK_LENGTH;

  const existing = getStack(state.track, toSpace);
  state.track[toSpace] = [...existing, ...moving];

  if (crossedFinish) {
    return { crossedFinish: true, winnerColor: color };
  }

  if (steps !== 0) {
    const desertResult = applyDesertAfterLanding(state, toSpace, color);
    if (desertResult.crossedFinish) return desertResult;
  }

  return { crossedFinish: false, winnerColor: null };
}

function rollPyramidDie(state: CamelUpState): CamelUpPyramidDie {
  const die = state.pyramidDiceBag.pop();
  if (!die) reject('ไม่มีลูกเต๋าใน Pyramid');
  return die;
}

function determineLegLeader(track: Record<number, CamelUpColor[]>): CamelUpColor {
  for (let space = CAMEL_UP_TRACK_LENGTH; space >= 1; space -= 1) {
    const stack = track[space];
    if (stack?.length) return stack[stack.length - 1]!;
  }
  return CAMEL_UP_COLORS[0]!;
}

function determineRaceLoser(track: Record<number, CamelUpColor[]>): CamelUpColor {
  const startStack = getStack(track, 1);
  if (startStack.length === 0) {
    return CAMEL_UP_COLORS[0]!;
  }
  return startStack[0]!;
}

function resolveLegScoring(
  state: CamelUpState,
  winningColor: CamelUpColor,
): CamelUpLegScoringSummary {
  const rows: CamelUpLegScoringSummary['rows'] = [];

  for (const playerId of state.playerOrder) {
    const p = state.players[playerId]!;
    const bet = p.legBet;
    let legPayout = 0;
    let legFirstBonus = 0;

    if (bet?.color === winningColor) {
      legPayout = bet.value;
      if (state.firstLegBetOnColor[winningColor] === playerId) {
        legFirstBonus = 1;
      }
      p.ep += legPayout + legFirstBonus;
    }

    rows.push({
      playerId,
      legPayout,
      legFirstBonus,
      totalLegGain: legPayout + legFirstBonus,
      legBetColor: bet?.color,
      legBetValue: bet?.value,
    });
  }

  state.lastEvent = `จบ Leg ${state.leg}: อูฐ ${winningColor} นำ — จ่ายเดิมพัน Leg`;
  return { endedLeg: state.leg, winningColor, rows };
}

function resolveOverallScoring(state: CamelUpState): CamelUpScoringBreakdown[] {
  const winnerColor = state.raceWinnerColor!;
  const loserColor = state.raceLoserColor!;
  const breakdown: CamelUpScoringBreakdown[] = [];

  for (const playerId of state.playerOrder) {
    const p = state.players[playerId]!;
    let overallWinnerPayout = 0;
    let overallLoserPayout = 0;

    const winnerBets = state.overallWinnerPiles[winnerColor] ?? [];
    winnerBets.forEach((bet, idx) => {
      if (bet.playerId === playerId) {
        overallWinnerPayout += camelUpOverallPayout(idx + 1);
      }
    });

    const loserBets = state.overallLoserPiles[loserColor] ?? [];
    loserBets.forEach((bet, idx) => {
      if (bet.playerId === playerId) {
        overallLoserPayout += camelUpOverallPayout(idx + 1);
      }
    });

    p.ep += overallWinnerPayout + overallLoserPayout;

    breakdown.push({
      playerId,
      legPayout: 0,
      legFirstBonus: 0,
      overallWinnerPayout,
      overallLoserPayout,
      totalEp: p.ep,
    });
  }

  breakdown.sort((a, b) => b.totalEp - a.totalEp);
  state.scoringBreakdown = breakdown;
  return breakdown;
}

function finishGame(state: CamelUpState, raceWinner: CamelUpColor): void {
  state.raceWinnerColor = raceWinner;
  state.raceLoserColor = determineRaceLoser(state.track);
  resolveLegScoring(state, raceWinner);
  const breakdown = resolveOverallScoring(state);

  const maxEp = breakdown[0]?.totalEp ?? 0;
  const winners = breakdown.filter((b) => b.totalEp === maxEp).map((b) => b.playerId);

  state.phase = 'game_over';
  state.result = {
    winners,
    reason: `อูฐ ${raceWinner} ข้ามเส้นชัย — ${winners.map((id) => state.playerNames[id]).join(', ')} มี EP สูงสุด (${maxEp})`,
  };
  state.lastEvent = state.result.reason;
}

function enterLegScoring(state: CamelUpState, legWinner: CamelUpColor): void {
  state.legScoringSummary = resolveLegScoring(state, legWinner);
  state.phase = 'leg_scoring';
  state.lastEvent = `ลูก Pyramid หมด — จบ Leg ${state.leg}: อูฐ ${legWinner} นำ`;
}

function startNextLeg(state: CamelUpState): void {
  state.legScoringSummary = undefined;
  state.leg += 1;
  state.firstLegBetOnColor = {};
  state.legBetStacks = buildLegBetStacks();
  state.pyramidDiceBag = buildPyramidDiceBag();
  state.rolledDice = [];
  state.lastRoll = null;

  const tilesPerPlayer = camelUpPyramidTilesPerPlayer(state.playerCount);
  for (const playerId of state.playerOrder) {
    const p = state.players[playerId]!;
    p.legBet = null;
    p.pyramidTiles = tilesPerPlayer;
  }

  state.phase = 'leg_play';
  state.lastEvent = `เริ่ม Leg ${state.leg}`;
}

function handleContinueAfterLeg(state: CamelUpState): void {
  if (state.phase !== 'leg_scoring') reject('ไม่ใช่ช่วงสรุป Leg');
  startNextLeg(state);
}

function canPlaceDesert(state: CamelUpState, playerId: string, space: number): boolean {
  if (space < 2 || space > CAMEL_UP_TRACK_LENGTH) return false;

  const ownTile = state.desertTiles.find((d) => d.playerId === playerId);
  const otherTiles = state.desertTiles.filter((d) => d.playerId !== playerId);

  if (otherTiles.some((d) => d.space === space)) return false;
  if (ownTile?.space === space) return false;

  for (const neighbor of [space - 1, space + 1]) {
    if (neighbor < 1 || neighbor > CAMEL_UP_TRACK_LENGTH) continue;
    if (otherTiles.some((d) => d.space === neighbor)) return false;
    if (ownTile?.space === neighbor) return false;
  }

  return true;
}

function computeLegalActions(state: CamelUpState, playerId: string): CamelUpAction[] {
  if (state.phase === 'leg_scoring') {
    return [{ type: 'continue-after-leg' }];
  }

  if (state.phase !== 'leg_play' || activePlayerId(state) !== playerId) return [];

  const p = state.players[playerId];
  if (!p) return [];

  const actions: CamelUpAction[] = [];

  if (!p.legBet) {
    for (const color of CAMEL_UP_COLORS) {
      const stack = state.legBetStacks[color] ?? [];
      if (stack.length > 0) {
        actions.push({ type: 'take-leg-bet-tile', color });
      }
    }
  }

  for (let space = 1; space <= CAMEL_UP_TRACK_LENGTH; space += 1) {
    if (canPlaceDesert(state, playerId, space)) {
      actions.push({ type: 'place-desert-tile', space, effect: 'oasis' });
      actions.push({ type: 'place-desert-tile', space, effect: 'mirage' });
    }
  }

  if (p.pyramidTiles > 0 && state.pyramidDiceBag.length > 0) {
    actions.push({ type: 'take-pyramid-tile' });
  }

  for (const color of p.raceCardsWinnerInHand) {
    actions.push({ type: 'bet-overall-winner', color });
  }

  for (const color of p.raceCardsLoserInHand) {
    actions.push({ type: 'bet-overall-loser', color });
  }

  return actions;
}

function handleTakeLegBetTile(state: CamelUpState, playerId: string, color: CamelUpColor): void {
  const p = state.players[playerId]!;
  if (p.legBet) reject('เดิมพัน Leg นี้แล้ว');

  const stack = state.legBetStacks[color];
  if (!stack || stack.length === 0) reject('ไม่มี Leg Betting Tile สีนี้แล้ว');

  const value = stack.shift()!;
  p.legBet = { color, value };

  if (!state.firstLegBetOnColor[color]) {
    state.firstLegBetOnColor[color] = playerId;
  }

  state.lastEvent = `${state.playerNames[playerId]} เดิมพัน Leg: อูฐ ${color} (${value} EP)`;
}

function handlePlaceDesertTile(
  state: CamelUpState,
  playerId: string,
  space: number,
  effect: CamelUpDesertEffect,
): void {
  if (!canPlaceDesert(state, playerId, space)) reject('วาง Desert Tile ตรงนี้ไม่ได้');

  state.desertTiles = state.desertTiles.filter((d) => d.playerId !== playerId);
  state.desertTiles.push({ playerId, space, effect });
  state.players[playerId]!.desertOnTrack = true;
  state.lastEvent = `${state.playerNames[playerId]} วาง Desert Tile (${effect}) ช่อง ${space}`;
}

function handleTakePyramidTile(state: CamelUpState, playerId: string): void {
  const p = state.players[playerId]!;
  if (p.pyramidTiles <= 0) reject('ไม่มี Pyramid Tile');

  p.pyramidTiles -= 1;
  const die = rollPyramidDie(state);
  state.rolledDice.push(die);

  const result = moveCamelColor(state, die.color, die.value);
  state.lastRoll = { color: die.color, value: die.value, legEnded: result.crossedFinish };
  state.lastEvent = `${state.playerNames[playerId]} ทอย ${die.color} (${die.value}) — อูฐ ${die.color} ขยับ ${die.value}`;
  if (result.crossedFinish) {
    state.lastEvent += ' และข้ามเส้นชัย — เกมจบ!';
  }

  advanceTurn(state);

  if (result.crossedFinish && result.winnerColor) {
    finishGame(state, result.winnerColor);
    return;
  }

  if (state.pyramidDiceBag.length === 0) {
    enterLegScoring(state, determineLegLeader(state.track));
  }
}

function handleBetOverall(
  state: CamelUpState,
  playerId: string,
  color: CamelUpColor,
  kind: 'winner' | 'loser',
): void {
  const p = state.players[playerId]!;
  const hand = kind === 'winner' ? p.raceCardsWinnerInHand : p.raceCardsLoserInHand;
  const idx = hand.indexOf(color);
  if (idx < 0) reject('ไม่มีการ์ดสีนี้ในมือ');

  hand.splice(idx, 1);
  const bet = { playerId, color };
  if (kind === 'winner') {
    state.overallWinnerPiles[color].push(bet);
    state.overallWinnerPlacements.push({ playerId });
    state.lastEvent = `${state.playerNames[playerId]} เดิมพันผู้ชนะทั้งเกม (การ์ดคว่ำ)`;
  } else {
    state.overallLoserPiles[color].push(bet);
    state.overallLoserPlacements.push({ playerId });
    state.lastEvent = `${state.playerNames[playerId]} เดิมพันผู้แพ้ทั้งเกม (การ์ดคว่ำ)`;
  }
}

function setup(players: Player[]): CamelUpState {
  if (players.length < 3 || players.length > 8) {
    throw new Error('Camel Up รองรับ 3–8 คน');
  }

  const playerOrder = shuffle(players.map((p) => p.id));
  const playerNames: Record<string, string> = {};
  const playerStates: Record<string, CamelUpPlayerState> = {};
  const tilesPerPlayer = camelUpPyramidTilesPerPlayer(players.length);

  for (const p of players) {
    playerNames[p.id] = p.name;
    playerStates[p.id] = {
      ep: CAMEL_UP_STARTING_EP,
      pyramidTiles: tilesPerPlayer,
      raceCardsWinnerInHand: [...CAMEL_UP_COLORS],
      raceCardsLoserInHand: [...CAMEL_UP_COLORS],
      legBet: null,
      desertOnTrack: false,
    };
  }

  return {
    phase: 'leg_play',
    leg: 1,
    playerCount: players.length,
    playerOrder,
    playerNames,
    currentTurnIndex: 0,
    players: playerStates,
    track: resetCamelsOnTrack(),
    desertTiles: [],
    legBetStacks: buildLegBetStacks(),
    overallWinnerPiles: emptyOverallPiles(),
    overallLoserPiles: emptyOverallPiles(),
    overallWinnerPlacements: [],
    overallLoserPlacements: [],
    pyramidDiceBag: buildPyramidDiceBag(),
    rolledDice: [],
    lastRoll: null,
    firstLegBetOnColor: {},
    lastEvent: 'เกมเริ่มแล้ว — เดิมพันและขับอูฐ!',
    result: null,
  };
}

function buildTrackView(track: Record<number, CamelUpColor[]>): CamelUpPlayerView['track'] {
  const view: CamelUpPlayerView['track'] = {};
  for (const [key, colors] of Object.entries(track)) {
    view[Number(key)] = { colors: [...colors] };
  }
  return view;
}

function countOverallBets(
  piles: Record<CamelUpColor, Array<{ playerId: string; color: CamelUpColor }>>,
): number {
  return CAMEL_UP_COLORS.reduce((total, color) => total + (piles[color]?.length ?? 0), 0);
}

function buildMyOverallBets(state: CamelUpState, viewerId: string): CamelUpMyOverallBet[] {
  const bets: CamelUpMyOverallBet[] = [];
  for (const color of CAMEL_UP_COLORS) {
    (state.overallWinnerPiles[color] ?? []).forEach((bet, index) => {
      if (bet.playerId === viewerId) {
        bets.push({ kind: 'winner', color, orderInPile: index + 1 });
      }
    });
    (state.overallLoserPiles[color] ?? []).forEach((bet, index) => {
      if (bet.playerId === viewerId) {
        bets.push({ kind: 'loser', color, orderInPile: index + 1 });
      }
    });
  }
  return bets;
}

function emptyOverallPilesView(): CamelUpPlayerView['overallWinnerPiles'] {
  return CAMEL_UP_COLORS.map((color) => ({ color, bets: [] }));
}

function getPlayerView(state: CamelUpState, playerId: string): CamelUpPlayerView {
  const me = state.players[playerId];
  const isGameOver = state.phase === 'game_over';

  const players = state.playerOrder.map((id) => {
    const p = state.players[id]!;
    const winnerBets = Object.values(state.overallWinnerPiles)
      .flat()
      .filter((b) => b.playerId === id);
    const loserBets = Object.values(state.overallLoserPiles)
      .flat()
      .filter((b) => b.playerId === id);
    return {
      id,
      name: state.playerNames[id] ?? id,
      ep: p.ep,
      pyramidTiles: p.pyramidTiles,
      legBet: p.legBet,
      desertOnTrack: p.desertOnTrack,
      overallWinnerBetsPlaced: winnerBets.length,
      overallLoserBetsPlaced: loserBets.length,
      raceCardsRemaining: p.raceCardsWinnerInHand.length + p.raceCardsLoserInHand.length,
    };
  });

  const maskBets = (
    color: CamelUpColor,
    bets: Array<{ playerId: string; color: CamelUpColor }>,
  ) => ({
    color,
    bets: bets.map((b) => ({
      playerId: b.playerId,
      color: b.color,
    })),
  });

  const legalActions = computeLegalActions(state, playerId);

  return {
    phase: state.phase,
    leg: state.leg,
    playerOrder: [...state.playerOrder],
    players,
    track: buildTrackView(state.track),
    desertTiles: [...state.desertTiles],
    legBetStacks: CAMEL_UP_COLORS.map((color) => ({
      color,
      values: [...(state.legBetStacks[color] ?? [])],
    })),
    overallWinnerPiles: isGameOver
      ? CAMEL_UP_COLORS.map((color) => maskBets(color, state.overallWinnerPiles[color] ?? []))
      : emptyOverallPilesView(),
    overallLoserPiles: isGameOver
      ? CAMEL_UP_COLORS.map((color) => maskBets(color, state.overallLoserPiles[color] ?? []))
      : emptyOverallPilesView(),
    pyramidDiceRemaining: state.pyramidDiceBag.length,
    pyramidDiceInBag: [...state.pyramidDiceBag],
    lastRoll: state.lastRoll,
    rolledDice: [...state.rolledDice],
    activePlayerId: activePlayerId(state),
    canAct: legalActions.length > 0,
    legalActions,
    raceCardsWinnerInHand: me ? [...me.raceCardsWinnerInHand] : [],
    raceCardsLoserInHand: me ? [...me.raceCardsLoserInHand] : [],
    lastEvent: state.lastEvent,
    result: state.result,
    overallBetsRevealed: isGameOver ? true : undefined,
    myOverallBets: isGameOver ? undefined : buildMyOverallBets(state, playerId),
    overallWinnerPlacements: isGameOver ? undefined : [...state.overallWinnerPlacements],
    overallLoserPlacements: isGameOver ? undefined : [...state.overallLoserPlacements],
    overallWinnerFaceDownCount: isGameOver ? undefined : countOverallBets(state.overallWinnerPiles),
    overallLoserFaceDownCount: isGameOver ? undefined : countOverallBets(state.overallLoserPiles),
    scoringBreakdown: state.scoringBreakdown,
    legScoringSummary: state.legScoringSummary,
    raceWinnerColor: state.raceWinnerColor,
    raceLoserColor: state.raceLoserColor,
  };
}

function onAction(state: CamelUpState, playerId: string, action: CamelUpAction): CamelUpState {
  if (state.phase === 'game_over') reject('เกมจบแล้ว');

  if (state.phase === 'leg_scoring') {
    if (action.type !== 'continue-after-leg') reject('กดดำเนินการต่อในโมดัลสรุป Leg');
    const next = cloneState(state);
    handleContinueAfterLeg(next);
    return next;
  }

  if (state.phase !== 'leg_play') reject('รอดำเนินการคะแนน');

  assertActive(state, playerId);
  const legal = computeLegalActions(state, playerId);
  const allowed = legal.some((a) => JSON.stringify(a) === JSON.stringify(action));
  if (!allowed) reject('ทำ action นี้ไม่ได้ตอนนี้');

  const next = cloneState(state);

  switch (action.type) {
    case 'take-leg-bet-tile':
      handleTakeLegBetTile(next, playerId, action.color);
      advanceTurn(next);
      break;
    case 'place-desert-tile':
      handlePlaceDesertTile(next, playerId, action.space, action.effect);
      advanceTurn(next);
      break;
    case 'take-pyramid-tile':
      handleTakePyramidTile(next, playerId);
      break;
    case 'bet-overall-winner':
      handleBetOverall(next, playerId, action.color, 'winner');
      advanceTurn(next);
      break;
    case 'bet-overall-loser':
      handleBetOverall(next, playerId, action.color, 'loser');
      advanceTurn(next);
      break;
    default:
      reject('action ไม่รู้จัก');
  }

  return next;
}

function isGameOver(state: CamelUpState): GameResult | null {
  return state.phase === 'game_over' ? state.result : null;
}

export const camelUpGame: GameDefinition<CamelUpState, CamelUpAction> = {
  id: 'camel-up',
  name: 'Camel Up',
  description: 'เดิมพันอูฐแข่งรอบสนาม — ผู้มี Egyptian Pound มากที่สุดชนะ',
  minPlayers: 3,
  maxPlayers: 8,
  thumbnail: GAME_THUMBNAIL_BY_ID['camel-up'] ?? '/games/camel-up/thumbnail.jpg',
  setup,
  onAction,
  getPlayerView,
  isGameOver,
};
