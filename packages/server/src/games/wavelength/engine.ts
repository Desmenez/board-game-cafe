import {
  GAME_THUMBNAIL_BY_ID,
  WAVELENGTH_ID,
  WAVELENGTH_POINTS_TO_WIN,
  clampWavelengthPosition,
  leftRightOfCenter,
  opposingRoundPoints,
  parseWavelengthLobbyOptions,
  scoreDial,
  shuffleWavelengthDeck,
  spinWavelengthTarget,
  validateWavelengthClue,
  type GameDefinition,
  type GameResult,
  type Player,
  type WavelengthAction,
  type WavelengthCard,
  type WavelengthCardSide,
  type WavelengthPlayMode,
  type WavelengthPlayerView,
  type WavelengthRevealBreakdown,
  type WavelengthState,
  type WavelengthTeam,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

function reject(message: string): never {
  throw new GameActionRejectedError(message);
}

function otherTeam(team: WavelengthTeam): WavelengthTeam {
  return team === 'orange' ? 'purple' : 'orange';
}

function teamLabel(team: WavelengthTeam): string {
  return team === 'orange' ? 'ส้ม' : 'ม่วง';
}

function shuffleIds(ids: string[], rng: () => number): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function assignTeams(
  playerIds: string[],
  rng: () => number,
): { teamByPlayer: Record<string, WavelengthTeam>; teamMembers: Record<WavelengthTeam, string[]> } {
  const shuffled = shuffleIds(playerIds, rng);
  const orange: string[] = [];
  const purple: string[] = [];
  for (const id of shuffled) {
    if (orange.length <= purple.length) orange.push(id);
    else purple.push(id);
  }
  const teamByPlayer: Record<string, WavelengthTeam> = {};
  for (const id of orange) teamByPlayer[id] = 'orange';
  for (const id of purple) teamByPlayer[id] = 'purple';
  return { teamByPlayer, teamMembers: { orange, purple } };
}

function cloneState(state: WavelengthState): WavelengthState {
  return structuredClone(state);
}

function drawCard(state: WavelengthState, rng: () => number): WavelengthCard {
  if (state.deck.length < 2) state.deck = shuffleWavelengthDeck(rng);
  const a = state.deck.pop();
  const b = state.deck.pop();
  if (!a || !b) {
    state.deck = shuffleWavelengthDeck(rng);
    return { a: state.deck.pop()!, b: state.deck.pop()! };
  }
  return { a, b };
}

function spectrumFor(card: WavelengthCard, side: WavelengthCardSide) {
  return side === 'a' ? card.a : card.b;
}

function beginSpectrum(state: WavelengthState, rng: () => number): void {
  state.currentCard = drawCard(state, rng);
  state.chosenSide = null;
  state.phase = 'psychic_setup';
  state.setupStep = 'choose_side';
  state.clue = null;
  state.dial = 0.5;
  state.dialMoved = false;
  state.target = null;
  state.leftRightGuess = null;
  state.revealBreakdown = null;
}

function pairsCycles(playerCount: number): number {
  return playerCount <= 6 ? 2 : 1;
}

/** Hues and Cues: fewer guessers pay the clue-giver 2 per hit, otherwise 1. */
function pairsPsychicPointsPerHit(playerCount: number): number {
  return playerCount <= 3 ? 2 : 1;
}

function startPairsRound(state: WavelengthState, rng: () => number): void {
  const order = state.playerOrder;
  if (order.length < 2) reject('โหมดผลัดกันต้องมีอย่างน้อย 2 คน');
  const idx = state.pairsRound % order.length;
  state.psychicId = order[idx]!;
  state.guesserId = '';
  state.activeTeam = 'orange';
  const dials: WavelengthState['pairDials'] = {};
  for (const id of order) {
    if (id === state.psychicId) continue;
    dials[id] = { position: 0.5, locked: false };
  }
  state.pairDials = dials;
  beginSpectrum(state, rng);
  const psychicName = state.playerNames[state.psychicId] ?? 'Psychic';
  state.lastEvent = `${psychicName} เป็นคนใบ้ — ที่เหลือหมุนเข็มของตัวเอง`;
}

function startRound(state: WavelengthState, team: WavelengthTeam, rng: () => number): void {
  const members = state.teamMembers[team];
  if (members.length === 0) reject('ทีมนี้ไม่มีผู้เล่น');
  const idx = state.psychicIndex[team] % members.length;
  state.activeTeam = team;
  state.psychicId = members[idx]!;
  state.guesserId = '';
  state.psychicIndex[team] = idx + 1;
  beginSpectrum(state, rng);
  const psychicName = state.playerNames[state.psychicId] ?? 'Psychic';
  state.lastEvent = `${psychicName} เป็น Psychic ทีม${teamLabel(team)} — เลือกด้านของการ์ด`;
}

function finishWithWinners(state: WavelengthState, winners: string[], reason: string): void {
  state.phase = 'game_over';
  state.setupStep = null;
  state.gameResult = {
    winners,
    reason,
    scores: { ...state.scores },
  };
  state.lastEvent = 'เกมจบ';
}

function finishGame(state: WavelengthState, winner: WavelengthTeam | 'tie', reason: string): void {
  const winners =
    winner === 'tie'
      ? [...state.teamMembers.orange, ...state.teamMembers.purple]
      : [...state.teamMembers[winner]];
  finishWithWinners(state, winners, reason);
}

function applyPairsScore(state: WavelengthState): void {
  const target = state.target;
  if (target == null) return reject('ยังไม่มีเป้า');
  const psychicId = state.psychicId;
  const perHit = pairsPsychicPointsPerHit(state.playerOrder.length);
  let hits = 0;
  const pairScores: NonNullable<WavelengthRevealBreakdown['pairScores']> = [];
  for (const id of state.playerOrder) {
    if (id === psychicId) continue;
    const dial = state.pairDials[id];
    if (!dial?.locked) return reject('ยังมีคนทายที่ยังไม่ล็อกเข็ม');
    const wedge = scoreDial(dial.position, target);
    state.playerScores[id] = (state.playerScores[id] ?? 0) + wedge;
    if (wedge > 0) hits += 1;
    pairScores.push({ playerId: id, points: wedge, wedge, dial: dial.position });
  }
  const psychicPoints = hits * perHit;
  state.playerScores[psychicId] = (state.playerScores[psychicId] ?? 0) + psychicPoints;
  pairScores.unshift({ playerId: psychicId, points: psychicPoints });
  state.revealBreakdown = {
    dial: 0.5,
    target: { ...target },
    activeScore: 0,
    opposingScore: 0,
    leftRightGuess: 'left',
    centerSide: null,
    bonusTurn: false,
    pairScores,
  };
  state.phase = 'reveal';
  state.setupStep = null;
  const psychicName = state.playerNames[psychicId] ?? 'คนใบ้';
  state.lastEvent = `${psychicName} +${psychicPoints} จากเข็มที่เข้าโซน ${hits} อัน`;
}

function finishPairs(state: WavelengthState): void {
  let max = 0;
  for (const id of state.playerOrder) {
    max = Math.max(max, state.playerScores[id] ?? 0);
  }
  const winners = state.playerOrder.filter((id) => (state.playerScores[id] ?? 0) === max);
  const names = winners.map((id) => state.playerNames[id] ?? id).join(', ');
  finishWithWinners(
    state,
    winners,
    winners.length > 1 ? `${names} เสมอที่ ${max} แต้ม` : `${names} ชนะ (${max} แต้ม)`,
  );
}

function labelsOrReject(state: WavelengthState): { left: string; right: string } {
  const card = state.currentCard;
  const side = state.chosenSide;
  if (!card || !side) return reject('ยังไม่ได้เลือกด้านของการ์ด');
  const spectrum = spectrumFor(card, side);
  return { left: spectrum.left, right: spectrum.right };
}

function applyReveal(state: WavelengthState): void {
  const target = state.target;
  const guess = state.leftRightGuess;
  if (target == null) return reject('ยังไม่มีเป้า');
  if (guess == null) return reject('ฝั่งตรงข้ามยังไม่ได้ทายซ้าย/ขวา');
  const dialScore = scoreDial(state.dial, target);
  const centerSide = leftRightOfCenter(state.dial, target.center);
  const opposingScore = opposingRoundPoints(dialScore, guess, centerSide);
  const active = state.activeTeam;
  const opposing = otherTeam(active);
  state.scores[active] += dialScore;
  state.scores[opposing] += opposingScore;

  const activeNow = state.scores[active];
  const opposingNow = state.scores[opposing];
  const bonusTurn = !state.suddenDeath && dialScore === 4 && activeNow < opposingNow;

  const breakdown: WavelengthRevealBreakdown = {
    dial: state.dial,
    target: { ...target },
    activeScore: dialScore,
    opposingScore,
    leftRightGuess: guess,
    centerSide,
    bonusTurn,
  };
  state.revealBreakdown = breakdown;
  state.phase = 'reveal';
  state.setupStep = null;

  const parts = [
    `ทีม${teamLabel(active)} ได้ ${dialScore} แต้ม`,
    opposingScore > 0
      ? `ทีม${teamLabel(opposing)} ทายถูก (+1)`
      : `ทีม${teamLabel(opposing)} ไม่ได้แต้มซ้าย/ขวา`,
  ];
  if (bonusTurn) parts.push('ได้ 4 และยังตามอยู่ — เล่นต่อทันที');
  state.lastEvent = parts.join(' · ');
}

function advanceAfterReveal(state: WavelengthState, rng: () => number): void {
  if (state.mode === 'pairs') {
    state.pairsRound += 1;
    if (state.pairsRound >= state.pairsTotalRounds) finishPairs(state);
    else startPairsRound(state, rng);
    return;
  }

  const orange = state.scores.orange;
  const purple = state.scores.purple;
  const active = state.activeTeam;
  const bonusTurn = state.revealBreakdown?.bonusTurn === true;

  if (state.suddenDeath) {
    state.suddenDeathRoundsLeft -= 1;
    if (state.suddenDeathRoundsLeft <= 0) {
      if (orange === purple) {
        state.suddenDeathRoundsLeft = 2;
        state.lastEvent = 'ยังเสมอ — sudden death ต่ออีกทีมละรอบ';
        startRound(state, otherTeam(active), rng);
        return;
      }
      const winner: WavelengthTeam = orange > purple ? 'orange' : 'purple';
      finishGame(state, winner, `ทีม${teamLabel(winner)} ชนะ sudden death`);
      return;
    }
    startRound(state, otherTeam(active), rng);
    return;
  }

  const orangeWin = orange >= WAVELENGTH_POINTS_TO_WIN;
  const purpleWin = purple >= WAVELENGTH_POINTS_TO_WIN;
  if (orangeWin || purpleWin) {
    if (orange === purple) {
      state.suddenDeath = true;
      state.suddenDeathRoundsLeft = 2;
      state.lastEvent = 'เสมอที่ 10+ — sudden death ทีมละอีกหนึ่งรอบ';
      startRound(state, otherTeam(active), rng);
      return;
    }
    const winner: WavelengthTeam = orange > purple ? 'orange' : 'purple';
    finishGame(state, winner, `ทีม${teamLabel(winner)} ถึง ${WAVELENGTH_POINTS_TO_WIN} แต้มก่อน`);
    return;
  }

  if (bonusTurn) {
    startRound(state, active, rng);
    return;
  }
  startRound(state, otherTeam(active), rng);
}

function isPsychic(state: WavelengthState, playerId: string): boolean {
  return playerId === state.psychicId;
}

function playerTeam(state: WavelengthState, playerId: string): WavelengthTeam {
  const team = state.teamByPlayer[playerId];
  if (!team) reject('ผู้เล่นไม่ได้อยู่ในเกม');
  return team;
}

function canAct(state: WavelengthState, playerId: string): boolean {
  if (state.phase === 'game_over') return false;
  if (state.phase === 'reveal') return true;
  if (state.phase === 'psychic_setup' || state.phase === 'clue') {
    return isPsychic(state, playerId);
  }
  if (state.mode === 'pairs') {
    const dial = state.pairDials[playerId];
    return state.phase === 'team_dial' && dial != null && !dial.locked;
  }
  const team = state.teamByPlayer[playerId];
  if (!team) return false;
  if (state.phase === 'team_dial') {
    return team === state.activeTeam && !isPsychic(state, playerId);
  }
  if (state.phase === 'left_right') {
    return team === otherTeam(state.activeTeam);
  }
  return false;
}

function toView(state: WavelengthState, viewerId: string): WavelengthPlayerView {
  const amPsychic = viewerId === state.psychicId;
  const myTeam = state.teamByPlayer[viewerId] ?? 'orange';
  const showCardSides =
    amPsychic &&
    state.phase === 'psychic_setup' &&
    state.setupStep === 'choose_side' &&
    state.currentCard != null;
  const labels =
    state.currentCard && state.chosenSide ? spectrumFor(state.currentCard, state.chosenSide) : null;
  const showTarget =
    state.target != null && (amPsychic || state.phase === 'reveal' || state.phase === 'game_over');
  const screenOpen = showTarget;
  const myPairDial = state.mode === 'pairs' ? state.pairDials[viewerId] : undefined;
  const showAllPairNeedles =
    state.mode === 'pairs' && (state.phase === 'reveal' || state.phase === 'game_over');
  const showDial =
    showAllPairNeedles ||
    (state.mode === 'pairs' && state.phase === 'team_dial' && myPairDial != null) ||
    state.phase === 'left_right' ||
    state.phase === 'reveal' ||
    state.phase === 'game_over' ||
    (state.phase === 'team_dial' && state.dialMoved);

  const players = state.playerOrder.map((id) => ({
    id,
    name: state.playerNames[id] ?? id,
    team: state.mode === 'pairs' ? null : (state.teamByPlayer[id] ?? null),
  }));

  return {
    phase: state.phase,
    setupStep: state.setupStep,
    mode: state.mode,
    myId: viewerId,
    playerOrder: [...state.playerOrder],
    players,
    playerNames: { ...state.playerNames },
    teamByPlayer: { ...state.teamByPlayer },
    myTeam,
    amPsychic,
    amGuesser: state.mode === 'pairs' ? myPairDial != null : viewerId === state.guesserId,
    psychicId: state.psychicId,
    guesserId: state.guesserId,
    activeTeam: state.activeTeam,
    scores: { ...state.scores },
    playerScores: { ...state.playerScores },
    pairsRound: state.pairsRound,
    pairsTotalRounds: state.pairsTotalRounds,
    lockedGuesserIds: Object.entries(state.pairDials)
      .filter(([, dial]) => dial.locked)
      .map(([id]) => id),
    pairNeedles: showAllPairNeedles
      ? state.playerOrder
          .filter((id) => state.pairDials[id])
          .map((id) => ({ playerId: id, position: state.pairDials[id]!.position }))
      : null,
    myDialLocked: myPairDial?.locked === true,
    leftLabel: labels?.left ?? null,
    rightLabel: labels?.right ?? null,
    cardSides: showCardSides
      ? { a: { ...state.currentCard!.a }, b: { ...state.currentCard!.b } }
      : null,
    clue: state.clue,
    dial: showAllPairNeedles
      ? null
      : myPairDial
        ? myPairDial.position
        : showDial
          ? state.dial
          : null,
    dialLocked:
      state.phase === 'left_right' || state.phase === 'reveal' || state.phase === 'game_over',
    target: showTarget && state.target ? { ...state.target } : null,
    screenOpen,
    leftRightGuess:
      state.phase === 'reveal' || state.phase === 'game_over' ? state.leftRightGuess : null,
    revealBreakdown: state.revealBreakdown ? structuredClone(state.revealBreakdown) : null,
    suddenDeath: state.suddenDeath,
    lastEvent: state.lastEvent,
    canAct: canAct(state, viewerId),
    gameResult: state.gameResult
      ? {
          winners: [...state.gameResult.winners],
          reason: state.gameResult.reason,
          scores: { ...state.gameResult.scores },
        }
      : undefined,
  };
}

function onActionImpl(
  state: WavelengthState,
  playerId: string,
  action: WavelengthAction,
  rng: () => number,
): WavelengthState {
  const s = cloneState(state);
  if (s.phase === 'game_over') reject('เกมจบแล้ว');
  const team = s.mode === 'pairs' ? null : playerTeam(s, playerId);

  if (action.type === 'ack-reveal') {
    if (s.phase !== 'reveal') reject('ยังไม่ถึงขั้นเปิดเฉลย');
    advanceAfterReveal(s, rng);
    return s;
  }

  if (action.type === 'choose-card-side') {
    if (!isPsychic(s, playerId)) reject('เฉพาะ Psychic เลือกด้านของการ์ดได้');
    if (s.phase !== 'psychic_setup' || s.setupStep !== 'choose_side') {
      reject('ไม่ใช่ช่วงเลือกด้านของการ์ด');
    }
    const card = s.currentCard;
    if (!card) return reject('ไม่มีการ์ด');
    s.chosenSide = action.side;
    s.target = spinWavelengthTarget(rng);
    s.phase = 'clue';
    s.setupStep = null;
    const spectrum = spectrumFor(card, action.side);
    s.lastEvent = `สเปกตรัม: ${spectrum.left} ↔ ${spectrum.right} — ส่งคำใบ้หนึ่งไอเดีย`;
    return s;
  }

  if (action.type === 'submit-clue') {
    if (!isPsychic(s, playerId)) reject('เฉพาะ Psychic ส่งคำใบ้ได้');
    if (s.phase !== 'clue') reject('ไม่ใช่ช่วงส่งคำใบ้');
    const { left, right } = labelsOrReject(s);
    const err = validateWavelengthClue(action.text, left, right);
    if (err) reject(err);
    s.clue = action.text.trim().normalize('NFC');
    s.phase = 'team_dial';
    if (s.mode === 'pairs') {
      s.lastEvent = `คำใบ้: «${s.clue}» — ทุกคนที่ไม่ใช่คนใบ้หมุนเข็มของตัวเอง`;
    } else {
      s.lastEvent = `คำใบ้: «${s.clue}» — ทีม${teamLabel(s.activeTeam)} (ไม่ใช่ Psychic) หมุนเข็ม`;
    }
    return s;
  }

  if (action.type === 'set-dial') {
    if (s.phase !== 'team_dial') reject('ไม่ใช่ช่วงหมุนเข็ม');
    if (s.mode === 'pairs') {
      const mine = s.pairDials[playerId];
      if (!mine) reject('เฉพาะคนทายหมุนเข็มได้');
      if (mine.locked) reject('ล็อกเข็มแล้ว');
      mine.position = clampWavelengthPosition(action.position);
      return s;
    } else {
      if (isPsychic(s, playerId)) reject('Psychic ใบ้แล้ว — ห้ามขยับเข็ม');
      if (team !== s.activeTeam) reject('เฉพาะทีมที่เล่นอยู่หมุนเข็มได้');
    }
    s.dial = clampWavelengthPosition(action.position);
    s.dialMoved = true;
    return s;
  }

  if (action.type === 'confirm-dial') {
    if (s.phase !== 'team_dial') reject('ไม่ใช่ช่วงล็อกเข็ม');
    if (s.mode === 'pairs') {
      const mine = s.pairDials[playerId];
      if (!mine) reject('เฉพาะคนทายล็อกเข็มได้');
      if (mine.locked) reject('ล็อกเข็มแล้ว');
      mine.locked = true;
      const pending = Object.values(s.pairDials).some((dial) => !dial.locked);
      if (pending) {
        const name = s.playerNames[playerId] ?? 'คนทาย';
        s.lastEvent = `${name} ล็อกเข็มแล้ว`;
        return s;
      }
      applyPairsScore(s);
      return s;
    }
    if (isPsychic(s, playerId)) reject('Psychic ใบ้แล้ว — ห้ามล็อกเข็ม');
    if (team !== s.activeTeam) reject('เฉพาะทีมที่เล่นอยู่ล็อกเข็มได้');
    s.dialMoved = true;
    s.phase = 'left_right';
    s.lastEvent = `ล็อกเข็มแล้ว — ทีม${teamLabel(otherTeam(s.activeTeam))} ทายว่า 4 อยู่ซ้ายหรือขวา`;
    return s;
  }

  if (action.type === 'guess-left-right') {
    if (s.mode === 'pairs') reject('โหมดผลัดกันไม่มีทายซ้าย/ขวา');
    if (s.phase !== 'left_right') reject('ไม่ใช่ช่วงทายซ้าย/ขวา');
    if (team !== otherTeam(s.activeTeam)) reject('เฉพาะทีมตรงข้ามทายซ้าย/ขวาได้');
    if (isPsychic(s, playerId)) reject('Psychic ทายซ้าย/ขวาไม่ได้');
    s.leftRightGuess = action.guess;
    applyReveal(s);
    return s;
  }

  return reject('แอ็กชันไม่รู้จัก');
}

export const wavelengthGame: GameDefinition<WavelengthState, WavelengthAction> = {
  id: WAVELENGTH_ID,
  name: 'Wavelength',
  description:
    'ใบ้บนสเปกตรัมแล้วหมุนเข็มให้ใกล้เป้า — เล่นเป็นทีม หรือผลัดกันให้ทุกคนทายคนละเข็ม (2–12 คน)',
  minPlayers: 2,
  maxPlayers: 12,
  thumbnail: GAME_THUMBNAIL_BY_ID[WAVELENGTH_ID] ?? '',

  setup(players: Player[], options?: unknown): WavelengthState {
    const rng = Math.random;
    const mode: WavelengthPlayMode = parseWavelengthLobbyOptions(options).mode;
    const playerOrder = shuffleIds(
      players.map((p) => p.id),
      rng,
    );
    const playerNames: Record<string, string> = {};
    const playerScores: Record<string, number> = {};
    for (const p of players) {
      playerNames[p.id] = p.name;
      playerScores[p.id] = 0;
    }
    const { teamByPlayer, teamMembers } =
      mode === 'pairs'
        ? { teamByPlayer: {}, teamMembers: { orange: [] as string[], purple: [] as string[] } }
        : assignTeams(playerOrder, rng);
    const startingTeam: WavelengthTeam = rng() < 0.5 ? 'orange' : 'purple';
    const s: WavelengthState = {
      phase: 'psychic_setup',
      setupStep: 'choose_side',
      mode,
      playerOrder,
      playerNames,
      teamByPlayer,
      teamMembers,
      psychicIndex: { orange: 0, purple: 0 },
      turnIndex: 0,
      pairsRound: 0,
      pairsTotalRounds: mode === 'pairs' ? playerOrder.length * pairsCycles(playerOrder.length) : 0,
      psychicId: '',
      guesserId: '',
      pairDials: {},
      activeTeam: startingTeam,
      scores:
        mode === 'pairs'
          ? { orange: 0, purple: 0 }
          : {
              orange: startingTeam === 'orange' ? 0 : 1,
              purple: startingTeam === 'purple' ? 0 : 1,
            },
      playerScores,
      deck: shuffleWavelengthDeck(rng),
      currentCard: null,
      chosenSide: null,
      clue: null,
      dial: 0.5,
      dialMoved: false,
      target: null,
      leftRightGuess: null,
      revealBreakdown: null,
      suddenDeath: false,
      suddenDeathRoundsLeft: 0,
      lastEvent: '',
    };
    if (mode === 'pairs') startPairsRound(s, rng);
    else startRound(s, startingTeam, rng);
    return s;
  },

  onAction(state: WavelengthState, playerId: string, action: WavelengthAction): WavelengthState {
    return onActionImpl(state, playerId, action, Math.random);
  },

  getPlayerView(state: WavelengthState, playerId: string): unknown {
    return toView(state, playerId);
  },

  isGameOver(state: WavelengthState): GameResult | null {
    if (state.phase !== 'game_over' || !state.gameResult) return null;
    const { winners, reason } = state.gameResult;
    return { winners, reason };
  },
};
