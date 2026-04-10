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
  masterId: string;
  insiderId: string;
  categoryLabel: string;
  secretWord: string;
  /** ระยะเวลาขั้นถาม-ตอบ / อภิปราย — ตั้งจาก lobby */
  questioningDurationMs: number;
  discussionDurationMs: number;
  /** ผู้เล่นที่กดรับทราบบทบาทแล้ว */
  roleAcknowledged: Record<string, true>;
  questionLog: InsiderQuestionEntry[];
  pendingQuestionId: string | null;
  questioningEndsAtMs: number;
  solvedById: string | null;
  discussionEndsAtMs: number | null;
  finalVotes: Record<string, string>;
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

function allVoted(state: InsiderState): boolean {
  const ids = state.players.map((p) => p.id);
  return ids.every((id) => state.finalVotes[id] != null);
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
  return state.players.filter((p) => p.role === 'master' || p.role === 'common').map((p) => p.id);
}

function resolveFinalOutcome(state: InsiderState): GameResult {
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
    return {
      ...state,
      phase: 'final_vote',
      discussionEndsAtMs: null,
      lastEvent: 'หมดเวลาอภิปราย — เริ่มโหวตหา Insider',
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
  const inRoleReveal = state.phase === 'role_reveal';

  const showCategory =
    revealed ||
    (!inRoleReveal && isMaster && state.phase !== 'insider_reads') ||
    (!inRoleReveal && isInsider && state.phase !== 'master_reads');
  const showWord =
    revealed ||
    (!inRoleReveal && isMaster && state.phase !== 'insider_reads') ||
    (!inRoleReveal && isInsider && state.phase !== 'master_reads');

  const voteProgress = {
    done: Object.keys(state.finalVotes).length,
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
    pendingQuestionId: state.pendingQuestionId,
    questioningEndsAtMs: state.phase === 'questioning' ? state.questioningEndsAtMs : null,
    solvedById: state.solvedById,
    solverName:
      state.solvedById != null
        ? (state.players.find((p) => p.id === state.solvedById)?.name ?? null)
        : null,
    discussionEndsAtMs: state.phase === 'discussion' ? state.discussionEndsAtMs : null,
    finalVotes: state.finalVotes,
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

  if (state.phase === 'role_reveal') {
    const acked = state.roleAcknowledged;
    base.hasAcknowledgedRole = acked[viewerId] === true;
    base.roleAcknowledgeProgress = {
      current: state.players.filter((p) => acked[p.id]).length,
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
    const { category, word } = pickRandomWord();
    const { questioningDurationMs, discussionDurationMs } = parseInsiderSetupOptions(options);
    // const masterName = ps.find((p) => p.id === masterId)?.name ?? '';
    return {
      phase: 'role_reveal',
      players: ps,
      masterId,
      insiderId,
      categoryLabel: category.label,
      secretWord: word,
      questioningDurationMs,
      discussionDurationMs,
      roleAcknowledged: {},
      questionLog: [],
      pendingQuestionId: null,
      questioningEndsAtMs: 0,
      solvedById: null,
      discussionEndsAtMs: null,
      finalVotes: {},
      lastEvent: 'เปิดไพ่บทบาท — รับทราบให้ครบทุกคนเพื่อเริ่มเกม',
      outcome: null,
    };
  },

  onAction(state: InsiderState, playerId: string, action: InsiderAction): InsiderState {
    if (state.outcome) return state;

    const s: InsiderState = {
      ...state,
      players: state.players.map((p) => ({ ...p })),
      questionLog: state.questionLog.map((q) => ({ ...q })),
      finalVotes: { ...state.finalVotes },
      roleAcknowledged: { ...state.roleAcknowledged },
    };

    if (action.type === 'acknowledge_role') {
      if (s.phase !== 'role_reveal') return state;
      if (!s.players.some((p) => p.id === playerId)) return state;
      if (s.roleAcknowledged[playerId]) return state;
      s.roleAcknowledged[playerId] = true;
      const done = s.players.filter((pl) => s.roleAcknowledged[pl.id]).length;
      const total = s.players.length;
      if (done === total) {
        s.phase = 'master_reads';
        const masterName = s.players.find((p) => p.id === s.masterId)?.name ?? '';
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
      if (s.pendingQuestionId != null) return state;
      const text = action.text.trim();
      if (text.length < 2 || text.length > 400) return state;
      const asker = s.players.find((p) => p.id === playerId);
      if (!asker) return state;
      const id = newQuestionId();
      s.questionLog.push({
        id,
        askerId: playerId,
        askerName: asker.name,
        text,
      });
      s.pendingQuestionId = id;
      s.lastEvent = `${asker.name} ถามคำถาม`;
      return s;
    }

    if (action.type === 'master_answer') {
      if (s.phase !== 'questioning' || playerId !== s.masterId) return state;
      const q = s.questionLog.find((x) => x.id === action.questionId);
      if (!q || q.answer != null || s.pendingQuestionId !== action.questionId) return state;
      q.answer = action.answer;
      s.pendingQuestionId = null;

      if (action.answer === 'correct') {
        s.solvedById = q.askerId;
        s.phase = 'discussion';
        const dMs = s.discussionDurationMs > 0 ? s.discussionDurationMs : DEFAULT_DISCUSSION_MS;
        s.discussionEndsAtMs = Date.now() + dMs;
        s.lastEvent = `ทายถูกโดย ${q.askerName} — อภิปรายหา Insider`;
        return s;
      }
      s.lastEvent = `Master ตอบ: ${action.answer}`;
      return s;
    }

    if (action.type === 'discussion_done') {
      if (s.phase !== 'discussion' || playerId !== s.masterId) return state;
      s.phase = 'final_vote';
      s.discussionEndsAtMs = null;
      s.lastEvent = 'จบการอภิปราย — โหวตว่าใครเป็น Insider';
      return s;
    }

    if (action.type === 'final_vote') {
      if (s.phase !== 'final_vote') return state;
      const target = s.players.find((p) => p.id === action.targetId);
      if (!target) return state;
      s.finalVotes[playerId] = action.targetId;
      s.lastEvent = 'โหวตแล้ว';
      if (allVoted(s)) {
        s.outcome = resolveFinalOutcome(s);
        s.lastEvent = 'นับคะแนนครบ — เกมจบ';
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
