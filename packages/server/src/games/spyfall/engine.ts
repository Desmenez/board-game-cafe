import {
  GAME_THUMBNAIL_BY_ID,
  pickSpyfallLocation,
  spyfallLocationChoices,
  type GameDefinition,
  type GameResult,
  type Player,
  type SpyfallAction,
  type SpyfallPlayerView,
  type SpyfallRoundSummary,
  type SpyfallState,
  parseSpyfallLobbyOptions,
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

function cloneState(state: SpyfallState): SpyfallState {
  return {
    ...state,
    assignments: { ...state.assignments },
    playerNames: { ...state.playerNames },
    scores: { ...state.scores },
    usedLocationIds: [...state.usedLocationIds],
    roleAcknowledged: { ...state.roleAcknowledged },
    accusationUsed: { ...state.accusationUsed },
    accusationVotes: { ...state.accusationVotes },
    lastRoundSummary: state.lastRoundSummary ? { ...state.lastRoundSummary, roundPoints: { ...state.lastRoundSummary.roundPoints } } : null,
    result: state.result ? { ...state.result } : null,
  };
}

function allAcknowledged(state: SpyfallState): boolean {
  return state.roleAcknowledgeCount >= state.playerOrder.length;
}

function beginQuestioning(state: SpyfallState): void {
  state.phase = 'questioning';
  state.currentAskerId = state.dealerId;
  state.lastAskerId = null;
  state.roundEndsAtMs = Date.now() + state.roundDurationMs;
  state.accusationVotes = {};
  state.voteMode = 'none';
  state.accusationInitiatorId = null;
  state.pendingSuspectId = null;
  state.lastEvent = `${state.playerNames[state.dealerId]} เริ่มถาม — หมดเวลาใน ${state.roundDurationMs / 60000} นาที`;
}

function setupRound(state: SpyfallState, dealerId: string): void {
  const location = pickSpyfallLocation(state.usedLocationIds);
  state.usedLocationIds.push(location.id);
  state.locationId = location.id;
  state.locationName = location.name;

  const order = shuffle(state.playerOrder);
  state.playerOrder = order;
  state.dealerId = dealerId;
  state.spyId = order[Math.floor(Math.random() * order.length)]!;

  const roles = shuffle([...location.roles]);
  state.assignments = {};
  for (const pid of order) {
    if (pid === state.spyId) {
      state.assignments[pid] = { isSpy: true };
    } else {
      const roleName = roles.shift();
      state.assignments[pid] = { isSpy: false, roleName };
    }
  }

  state.roleAcknowledged = {};
  state.roleAcknowledgeCount = 0;
  state.currentAskerId = null;
  state.lastAskerId = null;
  state.roundEndsAtMs = null;
  state.accusationUsed = {};
  state.accusationVotes = {};
  state.voteMode = 'none';
  state.accusationInitiatorId = null;
  state.pendingSuspectId = null;
  state.phase = 'role_reveal';
  state.lastEvent = `รอบ ${state.roundNo} — เปิดการ์ดบทบาท`;
}

function voteCount(state: SpyfallState): number {
  return Object.keys(state.accusationVotes).length;
}

function allVotesCast(state: SpyfallState): boolean {
  return voteCount(state) >= state.playerOrder.length;
}

function tallyVotes(state: SpyfallState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const suspectId of Object.values(state.accusationVotes)) {
    counts[suspectId] = (counts[suspectId] ?? 0) + 1;
  }
  return counts;
}

function applyRoundPoints(state: SpyfallState, summary: SpyfallRoundSummary): void {
  for (const [pid, pts] of Object.entries(summary.roundPoints)) {
    state.scores[pid] = (state.scores[pid] ?? 0) + pts;
  }
}

function finishRound(
  state: SpyfallState,
  spyWon: boolean,
  reason: string,
  roundPoints: Record<string, number>,
): void {
  const summary: SpyfallRoundSummary = {
    roundNo: state.roundNo,
    spyId: state.spyId,
    spyName: state.playerNames[state.spyId] ?? state.spyId,
    locationId: state.locationId,
    locationName: state.locationName,
    spyWon,
    reason,
    roundPoints,
  };
  applyRoundPoints(state, summary);
  state.lastRoundSummary = summary;
  state.previousSpyId = state.spyId;
  state.phase = 'round_end';
  state.roundEndsAtMs = null;
  state.currentAskerId = null;
  state.pendingSuspectId = null;
  state.accusationVotes = {};
  state.voteMode = 'none';
  state.lastEvent = reason;

  const maxScore = Math.max(...state.playerOrder.map((id) => state.scores[id] ?? 0));
  if (state.roundNo >= state.totalRounds) {
    const winners = state.playerOrder.filter((id) => (state.scores[id] ?? 0) === maxScore);
    state.phase = 'game_over';
    state.result = {
      winners,
      reason: `จบ ${state.totalRounds} รอบ — คะแนนสูงสุด ${maxScore}`,
    };
  }
}

function resolveTimerEndVotes(state: SpyfallState): void {
  const counts = tallyVotes(state);
  const spyId = state.spyId;
  const n = state.playerOrder.length;
  const spyVotes = counts[spyId] ?? 0;
  const roundPoints: Record<string, number> = {};

  // Everyone but suspect must vote for suspect for spy to lose
  const spyCaught = spyVotes === n - 1;
  if (spyCaught) {
    for (const pid of state.playerOrder) {
      if (pid !== spyId) roundPoints[pid] = 1;
    }
    finishRound(state, false, `${state.playerNames[spyId]} ถูกจับได้ — ทีมรู้สถานที่ชนะ`, roundPoints);
    return;
  }

  roundPoints[spyId] = 2;
  const unanimousWrong = Object.keys(counts).length === 1 && !counts[spyId];
  if (unanimousWrong) {
    roundPoints[spyId] = (roundPoints[spyId] ?? 0) + 2;
  }
  finishRound(state, true, `${state.playerNames[spyId]} รอด — โหวตไม่จับได้`, roundPoints);
}

function resolveEarlyAccusationVotes(state: SpyfallState): void {
  const counts = tallyVotes(state);
  const suspectId = state.pendingSuspectId;
  if (!suspectId) return;

  const n = state.playerOrder.length;
  const suspectVotes = counts[suspectId] ?? 0;
  const unanimous = suspectVotes === n;

  if (!unanimous) {
    state.phase = 'questioning';
    state.accusationVotes = {};
    state.voteMode = 'none';
    state.pendingSuspectId = null;
    state.accusationInitiatorId = null;
    state.lastEvent = 'โหวตไม่เห็นพ้อง — เล่นต่อ';
    return;
  }

  const spyId = state.spyId;
  const roundPoints: Record<string, number> = {};
  const initiator = state.accusationInitiatorId;

  if (suspectId === spyId) {
    for (const pid of state.playerOrder) {
      if (pid !== spyId) roundPoints[pid] = 1;
    }
    if (initiator && initiator !== spyId) {
      roundPoints[initiator] = (roundPoints[initiator] ?? 0) + 1;
    }
    finishRound(
      state,
      false,
      `${state.playerNames[spyId]} ถูกจับก่อนหมดเวลา`,
      roundPoints,
    );
    return;
  }

  roundPoints[spyId] = 2;
  finishRound(
    state,
    true,
    `โหวตผิดคน — ${state.playerNames[spyId]} รอด`,
    roundPoints,
  );
}

function resolveSpyGuess(state: SpyfallState, locationId: string): void {
  const correct = locationId === state.locationId;
  const spyId = state.spyId;
  const roundPoints: Record<string, number> = {};

  if (correct) {
    roundPoints[spyId] = 4;
    finishRound(
      state,
      true,
      `${state.playerNames[spyId]} ทายสถานที่ถูก!`,
      roundPoints,
    );
  } else {
    for (const pid of state.playerOrder) {
      if (pid !== spyId) roundPoints[pid] = 1;
    }
    finishRound(
      state,
      false,
      `${state.playerNames[spyId]} ทายสถานที่ผิด`,
      roundPoints,
    );
  }
}

/** Called when questioning timer expires */
export function applySpyfallTimerExpiry(state: SpyfallState): SpyfallState {
  if (state.result) return state;
  if (state.phase !== 'questioning') return state;
  if (state.roundEndsAtMs == null || Date.now() < state.roundEndsAtMs) return state;

  const next = cloneState(state);
  next.phase = 'accusation_vote';
  next.voteMode = 'timer_end';
  next.accusationVotes = {};
  next.roundEndsAtMs = null;
  next.currentAskerId = null;
  next.lastEvent = 'หมดเวลา — โหวตจับ Spy';
  return next;
}

function toPlayerView(state: SpyfallState, viewerId: string): SpyfallPlayerView {
  const assignment = state.assignments[viewerId];
  const isSpy = assignment?.isSpy === true;
  const revealed = state.phase === 'round_end' || state.phase === 'game_over';

  const pendingAccusation =
    state.phase === 'accusation_vote' && state.pendingSuspectId
      ? {
          initiatorId: state.accusationInitiatorId ?? state.dealerId,
          initiatorName:
            state.playerNames[state.accusationInitiatorId ?? state.dealerId] ?? '',
          suspectId: state.pendingSuspectId,
          suspectName: state.playerNames[state.pendingSuspectId] ?? '',
          votes: { ...state.accusationVotes },
          voteProgress: { done: voteCount(state), total: state.playerOrder.length },
          mode: state.voteMode === 'early_accusation' ? ('early_accusation' as const) : ('timer_end' as const),
        }
      : state.phase === 'accusation_vote' && state.voteMode === 'timer_end'
        ? {
            initiatorId: state.dealerId,
            initiatorName: state.playerNames[state.dealerId] ?? '',
            suspectId: '',
            suspectName: '',
            votes: { ...state.accusationVotes },
            voteProgress: { done: voteCount(state), total: state.playerOrder.length },
            mode: 'timer_end' as const,
          }
        : null;

  const view: SpyfallPlayerView = {
    phase: state.phase,
    roundNo: state.roundNo,
    totalRounds: state.totalRounds,
    dealerId: state.dealerId,
    currentAskerId: state.currentAskerId,
    lastAskerId: state.lastAskerId,
    roundEndsAtMs: state.phase === 'questioning' ? state.roundEndsAtMs : null,
    useRoles: state.useRoles,
    scores: { ...state.scores },
    players: state.playerOrder.map((id) => ({
      id,
      name: state.playerNames[id] ?? id,
      isDealer: id === state.dealerId,
      hasAcknowledgedRole: state.roleAcknowledged[id] === true,
    })),
    you: {
      id: viewerId,
      name: state.playerNames[viewerId] ?? viewerId,
      isSpy,
      hasAcknowledgedRole: state.roleAcknowledged[viewerId] === true,
      locationName: !isSpy ? state.locationName : undefined,
      roleName: !isSpy && state.useRoles ? assignment?.roleName : undefined,
    },
    pendingAccusation,
    accusationUsedByMe: state.accusationUsed[viewerId] === true,
    canSpyReveal:
      isSpy &&
      state.phase === 'questioning' &&
      state.voteMode === 'none' &&
      !state.pendingSuspectId,
    lastRoundSummary: state.lastRoundSummary,
    gameResult: state.result,
    lastEvent: state.lastEvent,
  };

  if (state.phase === 'spy_guess' && isSpy) {
    view.locationChoices = spyfallLocationChoices();
  }

  if (revealed) {
    view.roundReveal = {
      spyId: state.spyId,
      spyName: state.playerNames[state.spyId] ?? state.spyId,
      locationId: state.locationId,
      locationName: state.locationName,
      assignments: Object.fromEntries(
        state.playerOrder.map((id) => [
          id,
          {
            isSpy: state.assignments[id]?.isSpy ?? false,
            roleName: state.assignments[id]?.roleName,
          },
        ]),
      ),
    };
    view.you.isSpy = state.assignments[viewerId]?.isSpy ?? false;
    if (!view.you.isSpy) {
      view.you.locationName = state.locationName;
      view.you.roleName = state.assignments[viewerId]?.roleName;
    }
  }

  return view;
}

export const spyfallGame: GameDefinition<SpyfallState, SpyfallAction> = {
  id: 'spyfall',
  name: 'Spyfall',
  description: 'หาตัว Spy ที่ไม่รู้สถานที่ — ถาม-ตอบแบบ honor system 3–8 คน',
  minPlayers: 3,
  maxPlayers: 8,
  thumbnail: GAME_THUMBNAIL_BY_ID.spyfall || '/games/spyfall/cover.png',

  setup(players: Player[], options?: unknown): SpyfallState {
    const opts = parseSpyfallLobbyOptions(options);
    const order = players.map((p) => p.id);
    const playerNames = Object.fromEntries(players.map((p) => [p.id, p.name])) as Record<
      string,
      string
    >;
    const scores = Object.fromEntries(order.map((id) => [id, 0])) as Record<string, number>;
    const dealerId = order[Math.floor(Math.random() * order.length)]!;

    const state: SpyfallState = {
      phase: 'role_reveal',
      roundNo: 1,
      totalRounds: opts.roundCount,
      roundDurationMs: opts.roundMinutes * 60 * 1000,
      useRoles: opts.useRoles,
      dealerId,
      spyId: '',
      locationId: '',
      locationName: '',
      assignments: {},
      playerOrder: order,
      playerNames,
      scores,
      usedLocationIds: [],
      roleAcknowledged: {},
      roleAcknowledgeCount: 0,
      currentAskerId: null,
      lastAskerId: null,
      roundEndsAtMs: null,
      accusationUsed: {},
      accusationVotes: {},
      voteMode: 'none',
      accusationInitiatorId: null,
      pendingSuspectId: null,
      lastRoundSummary: null,
      lastEvent: 'เปิดการ์ดบทบาท',
      result: null,
      previousSpyId: null,
    };

    setupRound(state, dealerId);
    return state;
  },

  onAction(state: SpyfallState, playerId: string, action: SpyfallAction): SpyfallState {
    if (state.result && state.phase === 'game_over') {
      throw new GameActionRejectedError('เกมจบแล้ว');
    }

    const next = cloneState(state);

    switch (action.type) {
      case 'acknowledge_role': {
        if (next.phase !== 'role_reveal') {
          throw new GameActionRejectedError('ยังไม่ใช่ช่วงเปิดการ์ด');
        }
        if (next.roleAcknowledged[playerId]) {
          throw new GameActionRejectedError('รับทราบแล้ว');
        }
        next.roleAcknowledged[playerId] = true;
        next.roleAcknowledgeCount += 1;
        if (allAcknowledged(next)) {
          beginQuestioning(next);
        } else {
          next.lastEvent = `รับทราบแล้ว ${next.roleAcknowledgeCount}/${next.playerOrder.length}`;
        }
        break;
      }

      case 'ask_player': {
        if (next.phase !== 'questioning') {
          throw new GameActionRejectedError('ยังไม่ใช่ช่วงถาม-ตอบ');
        }
        if (next.currentAskerId !== playerId) {
          throw new GameActionRejectedError('ยังไม่ถึงเทิร์นถามของคุณ');
        }
        if (action.targetId === playerId) {
          throw new GameActionRejectedError('ถามตัวเองไม่ได้');
        }
        if (action.targetId === next.lastAskerId) {
          throw new GameActionRejectedError('ถามคนที่เพิ่งถามคุณไม่ได้');
        }
        if (!next.playerOrder.includes(action.targetId)) {
          throw new GameActionRejectedError('ไม่มีผู้เล่นนี้');
        }
        next.lastAskerId = playerId;
        next.currentAskerId = action.targetId;
        next.lastEvent = `${next.playerNames[playerId]} ถาม ${next.playerNames[action.targetId]}`;
        break;
      }

      case 'initiate_accusation': {
        if (next.phase !== 'questioning') {
          throw new GameActionRejectedError('แจ้งสงสัยได้เฉพาะช่วงถาม-ตอบ');
        }
        if (next.accusationUsed[playerId]) {
          throw new GameActionRejectedError('ใช้การแจ้งสงสัยไปแล้วในรอบนี้');
        }
        if (!next.playerOrder.includes(action.suspectId)) {
          throw new GameActionRejectedError('ไม่มีผู้เล่นนี้');
        }
        next.accusationUsed[playerId] = true;
        next.phase = 'accusation_vote';
        next.voteMode = 'early_accusation';
        next.accusationInitiatorId = playerId;
        next.pendingSuspectId = action.suspectId;
        next.accusationVotes = {};
        next.roundEndsAtMs = null;
        next.currentAskerId = null;
        next.lastEvent = `${next.playerNames[playerId]} แจ้งสงสัย ${next.playerNames[action.suspectId]}`;
        break;
      }

      case 'cast_vote': {
        if (next.phase !== 'accusation_vote') {
          throw new GameActionRejectedError('ยังไม่ใช่ช่วงโหวต');
        }
        if (next.accusationVotes[playerId]) {
          throw new GameActionRejectedError('โหวตแล้ว');
        }
        if (!next.playerOrder.includes(action.suspectId)) {
          throw new GameActionRejectedError('ไม่มีผู้เล่นนี้');
        }
        next.accusationVotes[playerId] = action.suspectId;
        if (!allVotesCast(next)) break;

        if (next.voteMode === 'timer_end') {
          resolveTimerEndVotes(next);
        } else {
          resolveEarlyAccusationVotes(next);
        }
        break;
      }

      case 'spy_reveal': {
        if (playerId !== next.spyId) {
          throw new GameActionRejectedError('เฉพาะ Spy เท่านั้น');
        }
        if (next.phase !== 'questioning') {
          throw new GameActionRejectedError('เปิดตัวได้เฉพาะช่วงถาม-ตอบ');
        }
        if (next.voteMode !== 'none' || next.pendingSuspectId) {
          throw new GameActionRejectedError('มีการแจ้งสงสัยแล้ว — Spy ทายไม่ได้');
        }
        next.phase = 'spy_guess';
        next.roundEndsAtMs = null;
        next.currentAskerId = null;
        next.lastEvent = `${next.playerNames[playerId]} เปิดตัว Spy — เลือกสถานที่`;
        break;
      }

      case 'spy_guess_location': {
        if (playerId !== next.spyId) {
          throw new GameActionRejectedError('เฉพาะ Spy เท่านั้น');
        }
        if (next.phase !== 'spy_guess') {
          throw new GameActionRejectedError('ยังไม่ใช่ช่วงทายสถานที่');
        }
        resolveSpyGuess(next, action.locationId);
        break;
      }

      case 'ack_round_summary': {
        if (next.phase !== 'round_end') {
          throw new GameActionRejectedError('ไม่มีสรุปรอบที่รอ');
        }
        if (next.result) {
          next.phase = 'game_over';
          break;
        }
        next.roundNo += 1;
        const nextDealer = next.previousSpyId ?? next.dealerId;
        setupRound(next, nextDealer);
        break;
      }

      default:
        throw new GameActionRejectedError('action ไม่รู้จัก');
    }

    return next;
  },

  getPlayerView(state: SpyfallState, playerId: string): SpyfallPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: SpyfallState): GameResult | null {
    return state.result;
  },
};
