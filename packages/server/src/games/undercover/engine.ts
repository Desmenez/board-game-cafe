import {
  GAME_THUMBNAIL_BY_ID,
  isCivilianWordGuess,
  parseUndercoverLobbyOptions,
  type GameDefinition,
  type GameResult,
  type Player,
  type UndercoverAction,
  type UndercoverPlayerFull,
  type UndercoverPlayerView,
  type UndercoverRole,
  type UndercoverState,
  type UndercoverVoteRecord,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';
import { pickWordPair } from './deck.js';

const COVER_FALLBACK =
  'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1783420780/cover_srhisy.png';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneState(state: UndercoverState): UndercoverState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    playerNames: { ...state.playerNames },
    roleAcknowledged: { ...state.roleAcknowledged },
    votes: { ...state.votes },
    tieBreakCandidates: [...state.tieBreakCandidates],
    voteResults: state.voteResults ? { ...state.voteResults } : null,
    tiedPlayerIds: state.tiedPlayerIds ? [...state.tiedPlayerIds] : null,
    eliminationAcknowledged: { ...state.eliminationAcknowledged },
    voteHistory: state.voteHistory.map((v) => ({ ...v, votes: { ...v.votes } })),
    recheckRoleViewByPlayer: { ...state.recheckRoleViewByPlayer },
    civilianVariants: [...state.civilianVariants],
    outcome: state.outcome ? { ...state.outcome } : null,
  };
}

function activePlayers(state: UndercoverState): UndercoverPlayerFull[] {
  return state.players.filter((p) => !p.eliminated);
}

function assignRoles(
  roomPlayers: Player[],
  undercoverCount: number,
  mrWhiteEnabled: boolean,
): UndercoverPlayerFull[] {
  const ids = shuffle(roomPlayers.map((p) => p.id));
  const undercoverIds = new Set(ids.slice(0, undercoverCount));
  let mrWhiteId: string | null = null;
  if (mrWhiteEnabled && ids.length > undercoverCount) {
    mrWhiteId = ids[undercoverCount]!;
  }

  return roomPlayers.map((p) => {
    let role: UndercoverRole = 'civilian';
    if (undercoverIds.has(p.id)) role = 'undercover';
    else if (p.id === mrWhiteId) role = 'mr_white';
    return { id: p.id, name: p.name, role, eliminated: false };
  });
}

function secretWordForRole(
  role: UndercoverRole,
  civilianWord: string,
  undercoverWord: string,
): string | undefined {
  if (role === 'civilian') return civilianWord;
  if (role === 'undercover') return undercoverWord;
  return undefined;
}

function beginClueRound(state: UndercoverState): void {
  const active = activePlayers(state);
  state.clueOrder = shuffle(active.map((p) => p.id));
  state.clueIndex = 0;
  state.phase = 'clue_round';
  if (state.options.timerEnabled) {
    state.clueEndsAtMs = Date.now() + state.options.clueTimerSec * 1000;
  } else {
    state.clueEndsAtMs = null;
  }
  const current = state.clueOrder[0];
  const name = current ? (state.playerNames[current] ?? '') : '';
  state.lastEvent = `รอบคำใบ้ ${state.clueRoundNo}/${state.options.maxClueRounds} — ถึงตา ${name}`;
}

function beginDiscussion(state: UndercoverState): void {
  state.phase = 'discussion';
  state.votes = {};
  if (state.options.timerEnabled) {
    state.discussionEndsAtMs = Date.now() + state.options.discussionTimerSec * 1000;
  } else {
    state.discussionEndsAtMs = null;
  }
  state.lastEvent = 'อภิปราย — หัวห้องสามารถเริ่มโหวตได้เมื่อพร้อม';
}

function beginSecretVote(state: UndercoverState): void {
  state.phase = 'secret_vote';
  state.votes = {};
  state.isTieBreakVote = false;
  state.tieBreakCandidates = [];
  state.discussionEndsAtMs = null;
  state.clueEndsAtMs = null;
  state.lastEvent = 'โหวตลับ — เลือกคนที่จะคัดออก';
}

function beginTieBreakVote(state: UndercoverState, candidates: string[]): void {
  state.phase = 'tie_break_vote';
  state.votes = {};
  state.isTieBreakVote = true;
  state.tieBreakCandidates = candidates;
  state.voteResults = null;
  state.tiedPlayerIds = candidates;
  state.lastEvent = 'โหวตซ้ำ — เฉพาะผู้ที่คะแนนเท่ากัน';
}

function tallyVotes(
  state: UndercoverState,
  voterPool: string[],
): { counts: Record<string, number>; leaders: string[]; max: number } {
  const counts: Record<string, number> = {};
  for (const voterId of voterPool) {
    const target = state.votes[voterId];
    if (!target) continue;
    counts[target] = (counts[target] ?? 0) + 1;
  }
  let max = 0;
  for (const c of Object.values(counts)) {
    if (c > max) max = c;
  }
  const leaders = Object.entries(counts)
    .filter(([, c]) => c === max && max > 0)
    .map(([id]) => id);
  return { counts, leaders, max };
}

function resolveVotePhase(state: UndercoverState): void {
  const active = activePlayers(state);
  const eligibleVoters = active.map((p) => p.id);

  const { counts, leaders, max } = tallyVotes(state, eligibleVoters);
  state.voteResults = counts;

  const record: UndercoverVoteRecord = {
    roundNo: state.roundNo,
    votes: { ...state.votes },
    eliminatedId: null,
    tie: false,
  };

  if (max === 0 || leaders.length === 0) {
    record.tie = true;
    state.voteHistory.push(record);
    state.clueRoundNo += 1;
    if (state.clueRoundNo > state.options.maxClueRounds) {
      state.clueRoundNo = 1;
      state.roundNo += 1;
    }
    beginClueRound(state);
    state.lastEvent = 'ไม่มีโหวต — เริ่มรอบคำใบ้ใหม่';
    return;
  }

  if (leaders.length > 1) {
    if (state.isTieBreakVote) {
      record.tie = true;
      if (state.options.randomEliminationOnTie) {
        const pick = leaders[Math.floor(Math.random() * leaders.length)]!;
        state.pendingEliminationId = pick;
        state.phase = 'elimination';
        state.eliminationAcknowledged = {};
        state.eliminationAckCount = 0;
        record.eliminatedId = pick;
        record.tie = false;
        state.voteHistory.push(record);
        state.lastEvent = `เสมออีกครั้ง — สุ่มคัดออก ${state.playerNames[pick] ?? pick}`;
        return;
      }
      state.voteHistory.push(record);
      state.clueRoundNo += 1;
      if (state.clueRoundNo > state.options.maxClueRounds) {
        state.clueRoundNo = 1;
        state.roundNo += 1;
      }
      beginClueRound(state);
      state.lastEvent = 'โหวตเสมอ — ไม่มีใครถูกคัดออก เริ่มรอบคำใบ้ใหม่';
      return;
    }
    beginTieBreakVote(state, leaders);
    return;
  }

  const eliminatedId = leaders[0]!;
  record.eliminatedId = eliminatedId;
  record.tie = false;
  state.voteHistory.push(record);
  state.pendingEliminationId = eliminatedId;
  state.phase = 'elimination';
  state.eliminationAcknowledged = {};
  state.eliminationAckCount = 0;
  state.lastEvent = `${state.playerNames[eliminatedId] ?? eliminatedId} ได้รับโหวตสูงสุด — กำลังคัดออก`;
}

function countByRole(state: UndercoverState): Record<UndercoverRole, number> {
  const counts: Record<UndercoverRole, number> = {
    civilian: 0,
    undercover: 0,
    mr_white: 0,
  };
  for (const p of activePlayers(state)) {
    counts[p.role] += 1;
  }
  return counts;
}

function checkWin(state: UndercoverState): GameResult | null {
  const c = countByRole(state);
  if (c.undercover === 0 && c.mr_white === 0) {
    return {
      winners: state.players.filter((p) => p.role === 'civilian').map((p) => p.id),
      reason: 'คนธรรมดาชนะ — คัดออกบทบาทลับครบแล้ว',
    };
  }
  if (c.undercover + c.mr_white >= c.civilian) {
    const winners = state.players
      .filter((p) => (p.role === 'undercover' || p.role === 'mr_white') && !p.eliminated)
      .map((p) => p.id);
    return {
      winners,
      reason: 'ทีมบทบาทลับชนะ — จำนวนผู้รอดเท่ากับหรือมากกว่าคนธรรมดา',
    };
  }
  return null;
}

function finishGame(
  state: UndercoverState,
  result: GameResult,
  team: 'civilian' | 'hidden' | 'mr_white',
): void {
  state.outcome = result;
  state.winningTeam = team;
  state.phase = 'game_over';
  state.clueEndsAtMs = null;
  state.discussionEndsAtMs = null;
  state.lastEvent = result.reason;
}

function advanceClueTurn(state: UndercoverState): void {
  const active = activePlayers(state);
  if (active.length <= 1) return;

  state.clueIndex += 1;
  if (state.clueIndex >= state.clueOrder.length) {
    beginDiscussion(state);
    return;
  }
  if (state.options.timerEnabled) {
    state.clueEndsAtMs = Date.now() + state.options.clueTimerSec * 1000;
  }
  const current = state.clueOrder[state.clueIndex];
  const name = current ? (state.playerNames[current] ?? '') : '';
  state.lastEvent = `ถึงตา ${name} ให้คำใบ้ (${state.clueIndex + 1}/${state.clueOrder.length})`;
}

function mostVotedPlayerId(history: UndercoverVoteRecord[]): string | null {
  const totals: Record<string, number> = {};
  for (const r of history) {
    for (const target of Object.values(r.votes)) {
      totals[target] = (totals[target] ?? 0) + 1;
    }
  }
  let max = 0;
  let top: string | null = null;
  for (const [id, c] of Object.entries(totals)) {
    if (c > max) {
      max = c;
      top = id;
    }
  }
  return top;
}

function toPlayerView(state: UndercoverState, viewerId: string): UndercoverPlayerView {
  const youPlayer = state.players.find((p) => p.id === viewerId);
  const revealed = state.phase === 'game_over' || state.outcome != null;
  const inRoleReveal = state.phase === 'role_reveal';

  const recheck = state.recheckRoleViewByPlayer[viewerId];

  let secretWord: string | undefined;
  if (recheck) {
    secretWord = recheck.secretWord;
  } else if (youPlayer && (inRoleReveal || revealed)) {
    secretWord = secretWordForRole(youPlayer.role, state.civilianWord, state.undercoverWord);
  }

  const active = activePlayers(state);
  const currentClueId = state.clueOrder[state.clueIndex] ?? null;

  const voteTotal = state.phase === 'tie_break_vote' ? active.length : active.length;
  const voteDone = Object.keys(state.votes).length;

  const view: UndercoverPlayerView = {
    phase: state.phase,
    roundNo: state.roundNo,
    hostId: state.hostId,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      eliminated: p.eliminated,
      hasAcknowledgedRole: state.roleAcknowledged[p.id] === true,
    })),
    you: {
      id: viewerId,
      name: youPlayer?.name ?? '?',
      role: revealed ? youPlayer?.role : undefined,
      secretWord: inRoleReveal || recheck || revealed ? secretWord : undefined,
      hasAcknowledgedRole: state.roleAcknowledged[viewerId] === true,
      eliminated: youPlayer?.eliminated ?? false,
    },
    categoryLabel: state.categoryLabel,
    timerEnabled: state.options.timerEnabled,
    allowRecheckRole: state.options.allowRecheckRole && !revealed,
    roleAcknowledgeProgress: {
      current: state.roleAcknowledgeCount,
      total: state.players.length,
    },
    clueTurn: {
      currentPlayerId: currentClueId,
      currentPlayerName: currentClueId ? (state.playerNames[currentClueId] ?? null) : null,
      index: state.clueIndex + 1,
      total: state.clueOrder.length,
      clueRoundNo: state.clueRoundNo,
      maxClueRounds: state.options.maxClueRounds,
    },
    clueEndsAtMs: state.phase === 'clue_round' ? state.clueEndsAtMs : null,
    discussionEndsAtMs: state.phase === 'discussion' ? state.discussionEndsAtMs : null,
    voteProgress: { done: voteDone, total: voteTotal },
    yourVoteSubmitted: state.votes[viewerId] != null,
    tieBreakCandidates: state.tieBreakCandidates.map((id) => ({
      id,
      name: state.playerNames[id] ?? id,
    })),
    voteResults:
      state.phase === 'elimination' ||
      state.phase === 'mr_white_guess' ||
      state.phase === 'game_over' ||
      (state.voteResults != null && voteDone >= voteTotal)
        ? state.voteResults
        : null,
    tiedPlayerIds: state.tiedPlayerIds,
    eliminationReveal:
      state.phase === 'elimination' && state.pendingEliminationId
        ? (() => {
            const ep = state.players.find((p) => p.id === state.pendingEliminationId);
            if (!ep) return null;
            return {
              playerId: ep.id,
              playerName: ep.name,
            };
          })()
        : null,
    eliminationAckProgress: {
      current: state.eliminationAckCount,
      total: state.players.length,
    },
    mrWhiteGuessPrompt: state.phase === 'mr_white_guess' && state.mrWhiteGuessPlayerId === viewerId,
    recheckRoleView: recheck ?? null,
    lastEvent: state.lastEvent,
    gameResult: state.outcome,
  };

  if (revealed && state.outcome) {
    const roles: Record<string, UndercoverRole> = {};
    const words: Record<string, string | undefined> = {};
    for (const p of state.players) {
      roles[p.id] = p.role;
      words[p.id] = secretWordForRole(p.role, state.civilianWord, state.undercoverWord);
    }
    view.gameOverReveal = {
      civilianWord: state.civilianWord,
      undercoverWord: state.undercoverWord,
      categoryLabel: state.categoryLabel,
      roles,
      words,
      voteHistory: state.voteHistory,
      roundsPlayed: state.roundNo,
      mostVotedPlayerId: mostVotedPlayerId(state.voteHistory),
      winningTeam: state.winningTeam ?? 'civilian',
    };
  }

  return view;
}

/** Called from socket-handlers when clue/discussion timers expire. */
export function applyUndercoverTimerExpiry(state: UndercoverState): UndercoverState {
  if (state.outcome) return state;
  const s = cloneState(state);
  const now = Date.now();

  if (s.phase === 'clue_round' && s.clueEndsAtMs != null && now >= s.clueEndsAtMs) {
    advanceClueTurn(s);
    return s;
  }

  if (s.phase === 'discussion' && s.discussionEndsAtMs != null && now >= s.discussionEndsAtMs) {
    beginSecretVote(s);
    return s;
  }

  return state;
}

export const undercoverGame: GameDefinition<UndercoverState, UndercoverAction> = {
  id: 'undercover',
  name: 'Undercover',
  description: 'หาคนที่มีคำลับต่างหรือไม่มีคำ — ให้คำใบ้ อภิปราย โหวตคัดออก เล่น 3–20 คน',
  minPlayers: 3,
  maxPlayers: 20,
  thumbnail: GAME_THUMBNAIL_BY_ID.undercover ?? COVER_FALLBACK,

  setup(players: Player[], options?: unknown): UndercoverState {
    const playerCount = players.length;
    const opts = parseUndercoverLobbyOptions(options, playerCount);
    const undercoverCount = Math.min(
      opts.undercoverCount,
      playerCount - (opts.mrWhiteEnabled ? 2 : 1),
    );
    const pair = pickWordPair(opts.categoryId);
    const hostId = players[0]?.id ?? '';

    return {
      phase: 'role_reveal',
      hostId,
      players: assignRoles(players, undercoverCount, opts.mrWhiteEnabled),
      playerNames: Object.fromEntries(players.map((p) => [p.id, p.name])),
      options: { ...opts, undercoverCount },
      categoryLabel: pair.categoryLabel,
      civilianWord: pair.civilian,
      undercoverWord: pair.undercover,
      civilianVariants: [],
      roleAcknowledged: {},
      roleAcknowledgeCount: 0,
      roundNo: 1,
      clueRoundNo: 1,
      clueOrder: [],
      clueIndex: 0,
      clueEndsAtMs: null,
      discussionEndsAtMs: null,
      votes: {},
      tieBreakCandidates: [],
      isTieBreakVote: false,
      voteResults: null,
      tiedPlayerIds: null,
      pendingEliminationId: null,
      eliminationAcknowledged: {},
      eliminationAckCount: 0,
      mrWhiteGuessPlayerId: null,
      voteHistory: [],
      recheckRoleViewByPlayer: {},
      lastEvent: 'เปิดดูคำของคุณ — รับทราบให้ครบทุกคนเพื่อเริ่มเกม',
      outcome: null,
      winningTeam: null,
    };
  },

  onAction(state: UndercoverState, playerId: string, action: UndercoverAction): UndercoverState {
    if (state.outcome) return state;
    const s = cloneState(state);

    if (action.type === 'acknowledge_role') {
      if (s.phase !== 'role_reveal') return state;
      if (!s.playerNames[playerId]) return state;
      if (s.roleAcknowledged[playerId]) return state;
      s.roleAcknowledged[playerId] = true;
      s.roleAcknowledgeCount += 1;
      if (s.roleAcknowledgeCount >= s.players.length) {
        beginClueRound(s);
      } else {
        s.lastEvent = `รับทราบแล้ว ${s.roleAcknowledgeCount}/${s.players.length} คน`;
      }
      return s;
    }

    if (action.type === 'complete_clue') {
      if (s.phase !== 'clue_round') return state;
      const currentId = s.clueOrder[s.clueIndex];
      if (currentId !== playerId) {
        throw new GameActionRejectedError('ยังไม่ถึงตาของคุณ');
      }
      advanceClueTurn(s);
      return s;
    }

    if (action.type === 'host_skip_player') {
      if (playerId !== s.hostId) {
        throw new GameActionRejectedError('เฉพาะหัวห้องเท่านั้น');
      }
      if (s.phase !== 'clue_round') return state;
      advanceClueTurn(s);
      s.lastEvent = 'หัวห้องข้ามผู้เล่น — ไปคนถัดไป';
      return s;
    }

    if (action.type === 'start_voting') {
      if (playerId !== s.hostId) {
        throw new GameActionRejectedError('เฉพาะหัวห้องเท่านั้น');
      }
      if (s.phase !== 'discussion') return state;
      beginSecretVote(s);
      return s;
    }

    if (action.type === 'cast_vote') {
      if (s.phase !== 'secret_vote' && s.phase !== 'tie_break_vote') return state;
      const you = s.players.find((p) => p.id === playerId);
      if (!you || you.eliminated) {
        throw new GameActionRejectedError('คุณไม่สามารถโหวตได้');
      }
      if (s.votes[playerId]) return state;
      if (action.targetId === playerId) {
        throw new GameActionRejectedError('ห้ามโหวตตัวเอง');
      }
      const target = s.players.find((p) => p.id === action.targetId);
      if (!target || target.eliminated) {
        throw new GameActionRejectedError('เลือกผู้เล่นที่ยังอยู่ในเกม');
      }
      if (s.phase === 'tie_break_vote' && !s.tieBreakCandidates.includes(action.targetId)) {
        throw new GameActionRejectedError('โหวตได้เฉพาะผู้ที่ติดเสมอ');
      }
      s.votes[playerId] = action.targetId;
      const active = activePlayers(s);
      if (Object.keys(s.votes).length >= active.length) {
        resolveVotePhase(s);
      } else {
        s.lastEvent = `โหวตแล้ว ${Object.keys(s.votes).length}/${active.length} คน`;
      }
      return s;
    }

    if (action.type === 'mr_white_guess') {
      if (s.phase !== 'mr_white_guess') return state;
      if (s.mrWhiteGuessPlayerId !== playerId) {
        throw new GameActionRejectedError('เฉพาะ Mr. White ที่ถูกคัดออกเท่านั้น');
      }
      const correct = isCivilianWordGuess(action.text, s.civilianWord, s.civilianVariants);
      const mr = s.players.find((p) => p.id === playerId);
      if (mr) mr.eliminated = true;

      if (correct) {
        finishGame(
          s,
          {
            winners: [playerId],
            reason: `${s.playerNames[playerId] ?? 'Mr. White'} ทายคำถูก — ชนะทันที!`,
          },
          'mr_white',
        );
        return s;
      }

      s.phase = 'elimination';
      s.mrWhiteGuessPlayerId = null;
      s.lastEvent = 'ทายผิด — Mr. White ถูกคัดออก';
      const win = checkWin(s);
      if (win) {
        const team = win.winners.some(
          (id) => s.players.find((p) => p.id === id)?.role === 'mr_white',
        )
          ? 'mr_white'
          : win.reason.includes('บทบาทลับ')
            ? 'hidden'
            : 'civilian';
        finishGame(s, win, team);
      }
      return s;
    }

    if (action.type === 'ack_elimination') {
      if (s.phase !== 'elimination') return state;
      if (s.eliminationAcknowledged[playerId]) return state;
      s.eliminationAcknowledged[playerId] = true;
      s.eliminationAckCount += 1;
      if (s.eliminationAckCount < s.players.length) {
        s.lastEvent = `รับทราบผลการคัดออก ${s.eliminationAckCount}/${s.players.length}`;
        return s;
      }

      const elimId = s.pendingEliminationId;
      const ep = elimId ? s.players.find((p) => p.id === elimId) : undefined;

      if (ep?.role === 'mr_white') {
        s.phase = 'mr_white_guess';
        s.mrWhiteGuessPlayerId = elimId;
        s.pendingEliminationId = null;
        s.eliminationAcknowledged = {};
        s.eliminationAckCount = 0;
        s.lastEvent = 'คนที่ถูกคัดออกมีโอกาสทายคำลับของคนธรรมดา';
        return s;
      }

      if (ep) {
        ep.eliminated = true;
      }

      s.pendingEliminationId = null;
      s.eliminationAcknowledged = {};
      s.eliminationAckCount = 0;
      s.voteResults = null;
      s.tiedPlayerIds = null;

      const win = checkWin(s);
      if (win) {
        const team = win.reason.includes('บทบาทลับ') ? 'hidden' : 'civilian';
        finishGame(s, win, team);
        return s;
      }

      s.clueRoundNo += 1;
      if (s.clueRoundNo > s.options.maxClueRounds) {
        s.clueRoundNo = 1;
        s.roundNo += 1;
      }
      beginClueRound(s);
      return s;
    }

    if (action.type === 'recheck_role') {
      if (!s.options.allowRecheckRole) {
        throw new GameActionRejectedError('ห้องนี้ไม่อนุญาตดูคำซ้ำ');
      }
      if (s.phase === 'game_over' || s.phase === 'role_reveal') return state;
      const p = s.players.find((pl) => pl.id === playerId);
      if (!p) return state;
      s.recheckRoleViewByPlayer[playerId] = {
        secretWord: secretWordForRole(p.role, s.civilianWord, s.undercoverWord),
      };
      return s;
    }

    if (action.type === 'dismiss_recheck_role') {
      delete s.recheckRoleViewByPlayer[playerId];
      return s;
    }

    return state;
  },

  getPlayerView(state: UndercoverState, playerId: string): UndercoverPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: UndercoverState): GameResult | null {
    return state.outcome;
  },
};

export type { UndercoverState };
