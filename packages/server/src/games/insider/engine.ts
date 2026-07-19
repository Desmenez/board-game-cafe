import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  InsiderAction,
  InsiderPhase,
  InsiderPlayerView,
  InsiderQuestionEntry,
  InsiderRole,
} from 'shared';
import { pickRandomWord } from './deck.js';

const DEFAULT_QUESTIONING_MS = 5 * 60 * 1000;
const DEFAULT_DISCUSSION_MS = 2 * 60 * 1000;

function parseInsiderSetupOptions(options?: unknown): {
  questioningDurationMs: number;
  discussionDurationMs: number;
} {
  let qMin = 5;
  let dMin = 2;
  if (options && typeof options === 'object') {
    const o = options as Record<string, unknown>;
    if (typeof o.questioningMinutes === 'number' && Number.isFinite(o.questioningMinutes)) {
      qMin = o.questioningMinutes;
    }
    if (typeof o.discussionMinutes === 'number' && Number.isFinite(o.discussionMinutes)) {
      dMin = o.discussionMinutes;
    }
  }
  qMin = Math.min(30, Math.max(1, Math.round(qMin)));
  dMin = Math.min(15, Math.max(1, Math.round(dMin)));
  return {
    questioningDurationMs: qMin * 60 * 1000,
    discussionDurationMs: dMin * 60 * 1000,
  };
}

let nextQ = 1;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface InsiderPlayerFull {
  id: string;
  name: string;
  role: InsiderRole;
}

export interface InsiderState {
  phase: InsiderPhase;
  players: InsiderPlayerFull[];
  playerNameById: Record<string, string>;
  playerIdSet: Record<string, true>;
  masterId: string;
  insiderId: string;
  categoryLabel: string;
  secretWord: string;
  /** ระยะเวลาขั้นถาม-ตอบ / อภิปราย — ตั้งจาก lobby */
  questioningDurationMs: number;
  discussionDurationMs: number;
  /** ผู้เล่นที่กดรับทราบสำรับแล้ว */
  compositionAcknowledged: Record<string, true>;
  compositionAcknowledgeCount: number;
  /** ผู้เล่นที่กดรับทราบบทบาทแล้ว */
  roleAcknowledged: Record<string, true>;
  roleAcknowledgeCount: number;
  questionLog: InsiderQuestionEntry[];
  questioningEndsAtMs: number;
  solvedById: string | null;
  discussionEndsAtMs: number | null;
  finalVotes: Record<string, string>;
  finalVoteCount: number;
  discussionDraftVotes: Record<string, string>;
  lastEvent: string;
  outcome: GameResult | null;
}

function newQuestionId(): string {
  return `iq-${nextQ++}`;
}

function buildPlayersWithRoles(roomPlayers: Player[]): {
  players: InsiderPlayerFull[];
  masterId: string;
  insiderId: string;
} {
  const ids = shuffle(roomPlayers.map((p) => p.id));
  const masterId = ids[0]!;
  const insiderId = ids[1]!;
  const players: InsiderPlayerFull[] = roomPlayers.map((p) => {
    let role: InsiderRole = 'common';
    if (p.id === masterId) role = 'master';
    else if (p.id === insiderId) role = 'insider';
    return { id: p.id, name: p.name, role };
  });
  return { players, masterId, insiderId };
}

function tallyFinalVotes(state: InsiderState): { topId: string; max: number; tie: boolean } {
  const counts: Record<string, number> = {};
  for (const tid of Object.values(state.finalVotes)) {
    counts[tid] = (counts[tid] ?? 0) + 1;
  }
  let max = -1;
  for (const c of Object.values(counts)) {
    if (c > max) max = c;
  }
  if (max <= 0) return { topId: '', max: 0, tie: true };
  const leaders = Object.entries(counts).filter(([, c]) => c === max);
  const tie = leaders.length > 1;
  const topId = leaders[0]?.[0] ?? '';
  return { topId, max, tie };
}

function goodTeamIds(state: InsiderState): string[] {
  const out: string[] = [];
  for (const p of state.players) {
    if (p.role === 'master' || p.role === 'common') out.push(p.id);
  }
  return out;
}

function resolveFinalOutcome(state: InsiderState): GameResult {
  if (Object.keys(state.finalVotes).length === 0) {
    return {
      winners: [state.insiderId],
      reason: 'ไม่มีโหวตที่ยืนยัน — Insider ชนะ',
    };
  }
  const { topId, max, tie } = tallyFinalVotes(state);
  if (tie || max <= 0) {
    return {
      winners: [state.insiderId],
      reason: tie ? 'คะแนนโหวตเสมอ — Insider ชนะ' : 'โหวตไม่ครบ — Insider ชนะ',
    };
  }
  if (topId === state.insiderId) {
    return {
      winners: goodTeamIds(state),
      reason: 'โหวตถูกต้อง — Master & ชาวบ้านชนะ',
    };
  }
  return {
    winners: [state.insiderId],
    reason: 'โหวตผิดคน — Insider ชนะ',
  };
}

/** เรียกจากเซิร์ฟเวอร์เมื่อหมดเวลาถามตอบโดยยังไม่ทายถูก */
export function applyInsiderTimerExpiry(state: InsiderState): InsiderState {
  const now = Date.now();
  if (state.outcome) return state;

  if (state.phase === 'questioning' && !state.solvedById && now >= state.questioningEndsAtMs) {
    return {
      ...state,
      outcome: {
        winners: [],
        reason: 'หมดเวลา — ไม่มีใครทายคำถูก (ทุกคนแพ้)',
      },
      lastEvent: 'หมดเวลาถาม-ตอบ — เกมจบ',
    };
  }

  if (
    state.phase === 'discussion' &&
    state.discussionEndsAtMs != null &&
    now >= state.discussionEndsAtMs
  ) {
    const outcome = resolveFinalOutcome(state);
    return {
      ...state,
      discussionEndsAtMs: null,
      outcome,
      lastEvent: 'หมดเวลาอภิปราย — นับเฉพาะโหวตที่ยืนยันแล้ว',
    };
  }

  return state;
}

function toPlayerView(state: InsiderState, viewerId: string): InsiderPlayerView {
  const you = state.players.find((p) => p.id === viewerId);
  const role = you?.role ?? 'common';
  const isMaster = viewerId === state.masterId;
  const isInsider = viewerId === state.insiderId;
  const revealed = state.outcome != null;
  const inIntro = state.phase === 'composition' || state.phase === 'role_reveal';

  /** Master จำคำ/หมวดได้ตั้งแต่ถึงรอบอ่านของตัวเองเป็นต้นไป — ไม่มองทะลุช่วง Insider อ่าน */
  const showCategory =
    revealed ||
    (!inIntro && isMaster) ||
    (!inIntro && isInsider && state.phase !== 'master_reads');
  const showWord =
    revealed ||
    (!inIntro && isMaster) ||
    (!inIntro && isInsider && state.phase !== 'master_reads');

  const voteProgress = {
    done: state.finalVoteCount,
    total: state.players.length,
  };

  const base: InsiderPlayerView = {
    phase: state.phase,
    masterId: state.masterId,
    players: state.players.map((p) => ({ id: p.id, name: p.name })),
    you: { id: viewerId, name: you?.name ?? '?', yourRole: role },
    categoryLabel: showCategory ? state.categoryLabel : undefined,
    secretWord: showWord ? state.secretWord : undefined,
    questionLog: state.questionLog,
    questioningEndsAtMs: state.phase === 'questioning' ? state.questioningEndsAtMs : null,
    solvedById: state.solvedById,
    solverName: state.solvedById != null ? (state.playerNameById[state.solvedById] ?? null) : null,
    discussionEndsAtMs: state.phase === 'discussion' ? state.discussionEndsAtMs : null,
    finalVotes: state.finalVotes,
    discussionDraftVotes:
      state.phase === 'discussion' ? { ...state.discussionDraftVotes } : undefined,
    voteProgress,
    lastEvent: state.lastEvent,
  };

  if (revealed && state.outcome) {
    base.gameResult = state.outcome;
    const roles: Record<string, InsiderRole> = {};
    for (const p of state.players) roles[p.id] = p.role;
    base.gameOverReveal = {
      secretWord: state.secretWord,
      categoryLabel: state.categoryLabel,
      roles,
      insiderId: state.insiderId,
    };
  }

  if (state.phase === 'composition') {
    base.hasAcknowledgedComposition = state.compositionAcknowledged[viewerId] === true;
    base.compositionAcknowledgeProgress = {
      current: state.compositionAcknowledgeCount,
      total: state.players.length,
    };
  }

  if (state.phase === 'role_reveal') {
    const acked = state.roleAcknowledged;
    base.hasAcknowledgedRole = acked[viewerId] === true;
    base.roleAcknowledgeProgress = {
      current: state.roleAcknowledgeCount,
      total: state.players.length,
    };
  }

  return base;
}

export const insiderGame: GameDefinition<InsiderState, InsiderAction> = {
  id: 'insider',
  name: 'Insider',
  description: 'ถาม Master แบบใช่/ไม่ใช่เพื่อหาคำลับ แล้วโหวตจับ Insider — เล่น 3–8 คน จบไว',
  minPlayers: 3,
  maxPlayers: 8,
  thumbnail: '/games/insider/thumbnail.png',

  setup(players: Player[], options?: unknown): InsiderState {
    const { players: ps, masterId, insiderId } = buildPlayersWithRoles(players);
    const playerNameById = Object.fromEntries(ps.map((p) => [p.id, p.name])) as Record<
      string,
      string
    >;
    const playerIdSet = Object.fromEntries(ps.map((p) => [p.id, true])) as Record<string, true>;
    const { category, word } = pickRandomWord();
    const { questioningDurationMs, discussionDurationMs } = parseInsiderSetupOptions(options);
    // const masterName = ps.find((p) => p.id === masterId)?.name ?? '';
    return {
      phase: 'composition',
      players: ps,
      playerNameById,
      playerIdSet,
      masterId,
      insiderId,
      categoryLabel: category.label,
      secretWord: word,
      questioningDurationMs,
      discussionDurationMs,
      compositionAcknowledged: {},
      compositionAcknowledgeCount: 0,
      roleAcknowledged: {},
      roleAcknowledgeCount: 0,
      questionLog: [],
      questioningEndsAtMs: 0,
      solvedById: null,
      discussionEndsAtMs: null,
      finalVotes: {},
      finalVoteCount: 0,
      discussionDraftVotes: {},
      lastEvent: 'เปิดเผยบทบาทในเกม — รับทราบให้ครบทุกคนก่อนเปิดไพ่ตัวเอง',
      outcome: null,
    };
  },

  onAction(state: InsiderState, playerId: string, action: InsiderAction): InsiderState {
    if (state.outcome) return state;

    const s: InsiderState = {
      ...state,
      questionLog: state.questionLog,
      finalVotes: { ...state.finalVotes },
      discussionDraftVotes: { ...state.discussionDraftVotes },
      compositionAcknowledged: { ...state.compositionAcknowledged },
      roleAcknowledged: { ...state.roleAcknowledged },
    };

    if (action.type === 'acknowledge_composition') {
      if (s.phase !== 'composition') return state;
      if (!s.playerIdSet[playerId]) return state;
      if (s.compositionAcknowledged[playerId]) return state;
      s.compositionAcknowledged[playerId] = true;
      const done = s.compositionAcknowledgeCount + 1;
      s.compositionAcknowledgeCount = done;
      const total = s.players.length;
      if (done === total) {
        s.phase = 'role_reveal';
        s.roleAcknowledged = {};
        s.roleAcknowledgeCount = 0;
        s.lastEvent = 'เปิดไพ่บทบาท — รับทราบให้ครบทุกคนเพื่อเริ่มเกม';
      } else {
        s.lastEvent = `รับทราบสำรับแล้ว ${done}/${total} คน`;
      }
      return s;
    }

    if (action.type === 'acknowledge_role') {
      if (s.phase !== 'role_reveal') return state;
      if (!s.playerIdSet[playerId]) return state;
      if (s.roleAcknowledged[playerId]) return state;
      s.roleAcknowledged[playerId] = true;
      const done = s.roleAcknowledgeCount + 1;
      s.roleAcknowledgeCount = done;
      const total = s.players.length;
      if (done === total) {
        s.phase = 'master_reads';
        const masterName = s.playerNameById[s.masterId] ?? '';
        s.lastEvent = `${masterName} คือ Master — กำลังให้ Master ดูคำลับ`;
      } else {
        s.lastEvent = `รับทราบบทบาทแล้ว ${done}/${total} คน`;
      }
      return s;
    }

    if (action.type === 'master_ack_word') {
      if (s.phase !== 'master_reads' || playerId !== s.masterId) return state;
      s.phase = 'insider_reads';
      s.lastEvent = 'Master ดูคำแล้ว — Insider กำลังดูคำลับ';
      return s;
    }

    if (action.type === 'insider_ack_word') {
      if (s.phase !== 'insider_reads' || playerId !== s.insiderId) return state;
      s.phase = 'questioning';
      const qMs = s.questioningDurationMs > 0 ? s.questioningDurationMs : DEFAULT_QUESTIONING_MS;
      s.questioningEndsAtMs = Date.now() + qMs;
      s.lastEvent = 'เริ่มถาม-ตอบ — Master ตอบได้เฉพาะ ใช่ / ไม่ใช่ / ไม่รู้ / ถูกต้อง';
      return s;
    }

    if (action.type === 'ask_question') {
      if (s.phase !== 'questioning' || playerId === s.masterId) return state;
      const text = action.text.trim();
      if (text.length < 2 || text.length > 400) return state;
      const askerName = s.playerNameById[playerId];
      if (!askerName) return state;
      const id = newQuestionId();
      s.questionLog = [
        ...state.questionLog,
        {
          id,
          askerId: playerId,
          askerName,
          text,
        },
      ];
      s.lastEvent = `${askerName} ถามคำถาม`;
      return s;
    }

    if (action.type === 'master_answer') {
      if (s.phase !== 'questioning' || playerId !== s.masterId) return state;
      const qIdx = state.questionLog.findIndex((x) => x.id === action.questionId);
      if (qIdx < 0) return state;
      const q = state.questionLog[qIdx]!;
      if (q.answer != null) return state;
      const nextQ = { ...q, answer: action.answer };
      s.questionLog = [...state.questionLog];
      s.questionLog[qIdx] = nextQ;

      if (action.answer === 'correct') {
        s.solvedById = nextQ.askerId;
        s.phase = 'discussion';
        s.finalVotes = {};
        s.finalVoteCount = 0;
        s.discussionDraftVotes = {};
        const dMs = s.discussionDurationMs > 0 ? s.discussionDurationMs : DEFAULT_DISCUSSION_MS;
        s.discussionEndsAtMs = Date.now() + dMs;
        s.lastEvent = `ทายถูกโดย ${nextQ.askerName} — อภิปรายและโหวตจับ Insider`;
        return s;
      }
      s.lastEvent = `Master ตอบ: ${action.answer}`;
      return s;
    }

    if (action.type === 'discussion_pick') {
      if (s.phase !== 'discussion') return state;
      if (s.finalVotes[playerId] != null) return state;
      const targetName = s.playerNameById[action.targetId];
      if (!targetName || action.targetId === playerId || action.targetId === s.masterId)
        return state;
      s.discussionDraftVotes[playerId] = action.targetId;
      const voterName = s.playerNameById[playerId] ?? '';
      s.lastEvent = `${voterName} เลือก ${targetName} (รอยืนยัน)`;
      return s;
    }

    if (action.type === 'discussion_confirm_vote') {
      if (s.phase !== 'discussion') return state;
      const pick = s.discussionDraftVotes[playerId];
      if (!pick || s.finalVotes[playerId] != null || pick === s.masterId) return state;
      s.finalVotes[playerId] = pick;
      s.finalVoteCount += 1;
      delete s.discussionDraftVotes[playerId];
      const voterName = s.playerNameById[playerId] ?? '';
      const targetName = s.playerNameById[pick] ?? '';
      s.lastEvent = `${voterName} ยืนยันโหวต → ${targetName}`;
      const allConfirmed = s.finalVoteCount >= s.players.length;
      if (allConfirmed) {
        s.outcome = resolveFinalOutcome(s);
        s.discussionEndsAtMs = null;
        s.lastEvent = 'ทุกคนยืนยันโหวต — เฉลยผล';
      }
      return s;
    }

    return state;
  },

  getPlayerView(state: InsiderState, playerId: string): InsiderPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: InsiderState): GameResult | null {
    return state.outcome;
  },
};
