import type {
  GameDefinition,
  GameResult,
  HuesAndCuesAction,
  HuesAndCuesPlayerView,
  HuesAndCuesRevealBreakdown,
  Player,
} from 'shared';
import {
  HUES_AND_CUES_BANNED_WORDS,
  HUES_AND_CUES_COLS,
  HUES_AND_CUES_ROWS,
  huesAndCuesCellHex,
  huesAndCuesChebyshevScore,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

export interface HuesAndCuesState {
  phase: 'playing' | 'game_over';
  playerOrder: string[];
  playerNames: Record<string, string>;
  scores: Record<string, number>;
  roundIndex: number;
  totalRounds: number;
  cueGiverId: string;
  target: { col: number; row: number };
  subPhase: 'clue1' | 'guess1' | 'clue2' | 'guess2' | 'reveal';
  clue1: string | null;
  clue2: string | null;
  guess1: Record<string, { col: number; row: number } | null>;
  guess2: Record<string, { col: number; row: number } | null>;
  occupied1: string[];
  occupied2: string[];
  revealBreakdown: HuesAndCuesRevealBreakdown | null;
  lastEvent: string;
  /** ช่องที่เคยเป็นเป้าหมายแล้วในเกมนี้ (คีย์ `col,row`) — ไม่สุ่มซ้ำเพื่อให้สีหลากหลายขึ้น */
  usedTargetKeys: string[];
  gameResult?: GameResult & { scores: Record<string, number> };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

function guesserIds(s: HuesAndCuesState): string[] {
  return s.playerOrder.filter((id) => id !== s.cueGiverId);
}

function inGrid(col: number, row: number): boolean {
  return col >= 0 && col < HUES_AND_CUES_COLS && row >= 0 && row < HUES_AND_CUES_ROWS;
}

function parseClueWords(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.normalize('NFC'));
}

/** รวม \p{M} — สระ/วรรณยุกต์ไทยหลายตัว (เช่น ุ U+0E38) เป็น Mark ไม่ใช่ Letter */
const WORD_RE = /^[\p{L}\p{N}\p{M}]+$/u;

function validateClueWords(words: string[], expectedCount: 1 | 2): string {
  if (words.length !== expectedCount) {
    return expectedCount === 1
      ? 'คำใบ้รอบแรกต้องเป็นคำเดียว (ไม่เว้นวรรค)'
      : 'คำใบ้รอบสองต้องเป็นสองคำ (คั่นด้วยช่องว่าง)';
  }
  for (const w of words) {
    if (w.length > 48) return 'คำยาวเกินไป';
    if (!WORD_RE.test(w)) {
      return 'ใช้ได้เฉพาะตัวอักษร ตัวเลข และสระ/วรรณยุกต์ที่ติดคำ (ห้ามช่องว่างหรืออักขระพิเศษอื่น)';
    }
    const low = w.toLowerCase();
    if (HUES_AND_CUES_BANNED_WORDS.has(low)) return 'ห้ามใช้ชื่อสีพื้นฐานในคำใบ้';
  }
  return '';
}

function pickDistinctTarget(s: HuesAndCuesState, rng: () => number): { col: number; row: number } {
  const used = new Set(s.usedTargetKeys);
  const totalCells = HUES_AND_CUES_COLS * HUES_AND_CUES_ROWS;
  if (used.size >= totalCells) {
    s.usedTargetKeys = [];
    used.clear();
  }
  const free: { col: number; row: number }[] = [];
  for (let row = 0; row < HUES_AND_CUES_ROWS; row += 1) {
    for (let col = 0; col < HUES_AND_CUES_COLS; col += 1) {
      const k = cellKey(col, row);
      if (!used.has(k)) free.push({ col, row });
    }
  }
  if (free.length === 0) {
    s.usedTargetKeys = [];
    return {
      col: Math.floor(rng() * HUES_AND_CUES_COLS),
      row: Math.floor(rng() * HUES_AND_CUES_ROWS),
    };
  }
  const pick = free[Math.floor(rng() * free.length)]!;
  s.usedTargetKeys.push(cellKey(pick.col, pick.row));
  return pick;
}

function startRound(s: HuesAndCuesState, rng: () => number): void {
  const n = s.playerOrder.length;
  s.cueGiverId = s.playerOrder[s.roundIndex % n]!;
  s.target = pickDistinctTarget(s, rng);
  s.subPhase = 'clue1';
  s.clue1 = null;
  s.clue2 = null;
  s.guess1 = {};
  s.guess2 = {};
  s.occupied1 = [];
  s.occupied2 = [];
  s.revealBreakdown = null;
  for (const id of guesserIds(s)) {
    s.guess1[id] = null;
    s.guess2[id] = null;
  }
  const name = s.playerNames[s.cueGiverId] ?? s.cueGiverId;
  s.lastEvent = `รอบที่ ${s.roundIndex + 1}/${s.totalRounds} — ${name} เป็นผู้ให้คำใบ้`;
}

function allGuessersPlaced(s: HuesAndCuesState, which: 1 | 2): boolean {
  const g = which === 1 ? s.guess1 : s.guess2;
  return guesserIds(s).every((id) => g[id] != null);
}

function applyRoundScores(s: HuesAndCuesState): void {
  const { col: tc, row: tr } = s.target;
  const byPlayer: HuesAndCuesRevealBreakdown['byPlayer'] = {};
  let cueGain = 0;

  for (const id of guesserIds(s)) {
    const g1 = s.guess1[id];
    const g2 = s.guess2[id];
    const p1 = g1 ? huesAndCuesChebyshevScore(tc, tr, g1.col, g1.row) : 0;
    const p2 = g2 ? huesAndCuesChebyshevScore(tc, tr, g2.col, g2.row) : 0;
    const roundTotal = p1 + p2;
    byPlayer[id] = { guess1: p1, guess2: p2, roundTotal };
    s.scores[id] = (s.scores[id] ?? 0) + roundTotal;
    cueGain += roundTotal;
  }

  s.scores[s.cueGiverId] = (s.scores[s.cueGiverId] ?? 0) + cueGain;
  s.revealBreakdown = {
    target: { ...s.target },
    byPlayer,
    cueGiverRoundGain: cueGain,
  };
  s.subPhase = 'reveal';
  s.lastEvent = 'เปิดเฉลยสี — ดูคะแนนรอบนี้แล้วกดไปรอบถัดไป';
}

function finishGame(s: HuesAndCuesState): void {
  const ids = [...s.playerOrder];
  let best = -Infinity;
  for (const id of ids) best = Math.max(best, s.scores[id] ?? 0);
  const winners = ids.filter((id) => (s.scores[id] ?? 0) === best);
  const scores: Record<string, number> = {};
  for (const id of ids) scores[id] = s.scores[id] ?? 0;
  const reason =
    winners.length === 1
      ? `${s.playerNames[winners[0]!] ?? winners[0]} ชนะ (${best} คะแนน)`
      : `เสมอที่ ${best} คะแนน`;
  s.phase = 'game_over';
  s.gameResult = { winners, reason, scores };
  s.lastEvent = 'เกมจบ';
}

function toView(state: HuesAndCuesState, viewerId: string): HuesAndCuesPlayerView {
  const g1ids = guesserIds(state);
  const guess1Done = g1ids.filter((id) => state.guess1[id] != null).length;
  const guess2Done = g1ids.filter((id) => state.guess2[id] != null).length;
  const showTarget =
    state.phase === 'game_over' ||
    state.subPhase === 'reveal' ||
    (viewerId === state.cueGiverId && state.phase === 'playing');

  const t = showTarget ? state.target : null;
  const targetHex = t ? huesAndCuesCellHex(t.col, t.row) : null;

  return {
    phase: state.phase,
    myId: viewerId,
    playerOrder: [...state.playerOrder],
    playerNames: { ...state.playerNames },
    scores: { ...state.scores },
    roundIndex: state.roundIndex,
    totalRounds: state.totalRounds,
    cueGiverId: state.cueGiverId,
    amCueGiver: viewerId === state.cueGiverId,
    subPhase: state.subPhase,
    clue1: state.clue1,
    clue2: state.clue2,
    target: t,
    targetHex,
    guess1: { ...state.guess1 },
    guess2: { ...state.guess2 },
    progress: {
      guess1Done,
      guess1Total: g1ids.length,
      guess2Done,
      guess2Total: g1ids.length,
    },
    revealBreakdown: state.revealBreakdown ? { ...state.revealBreakdown, byPlayer: { ...state.revealBreakdown.byPlayer } } : null,
    lastEvent: state.lastEvent,
    gameResult: state.gameResult
      ? {
          winners: [...state.gameResult.winners],
          reason: state.gameResult.reason,
          scores: { ...state.gameResult.scores },
        }
      : undefined,
  };
}

function onActionImpl(state: HuesAndCuesState, playerId: string, action: HuesAndCuesAction): HuesAndCuesState {
  const s: HuesAndCuesState = {
    ...state,
    scores: { ...state.scores },
    guess1: { ...state.guess1 },
    guess2: { ...state.guess2 },
    occupied1: [...state.occupied1],
    occupied2: [...state.occupied2],
    usedTargetKeys: [...(state.usedTargetKeys ?? [])],
  };

  if (s.phase === 'game_over') {
    throw new GameActionRejectedError('เกมจบแล้ว');
  }

  const rng = Math.random;

  if (action.type === 'continue_after_reveal') {
    if (s.subPhase !== 'reveal') throw new GameActionRejectedError('ยังไม่ถึงขั้นเปิดเฉลย');
    s.roundIndex += 1;
    if (s.roundIndex >= s.totalRounds) {
      finishGame(s);
      return s;
    }
    startRound(s, rng);
    return s;
  }

  if (action.type === 'submit_clue1') {
    if (playerId !== s.cueGiverId) throw new GameActionRejectedError('เฉพาะผู้ให้คำใบ้ส่งคำใบ้ได้');
    if (s.subPhase !== 'clue1') throw new GameActionRejectedError('ไม่ใช่ช่วงคำใบ้แรก');
    const words = parseClueWords(action.text);
    const err = validateClueWords(words, 1);
    if (err) throw new GameActionRejectedError(err);
    s.clue1 = words[0]!;
    s.subPhase = 'guess1';
    s.lastEvent = `คำใบ้แรก: «${s.clue1}» — ผู้ทายวางมาร์กเกอร์ช่องที่ 1`;
    return s;
  }

  if (action.type === 'submit_clue2') {
    if (playerId !== s.cueGiverId) throw new GameActionRejectedError('เฉพาะผู้ให้คำใบ้ส่งคำใบ้ได้');
    if (s.subPhase !== 'clue2') throw new GameActionRejectedError('ไม่ใช่ช่วงคำใบ้ที่สอง');
    const words = parseClueWords(action.text);
    const err = validateClueWords(words, 2);
    if (err) throw new GameActionRejectedError(err);
    s.clue2 = `${words[0]} ${words[1]}`;
    s.subPhase = 'guess2';
    s.lastEvent = `คำใบ้ที่สอง: «${s.clue2}» — วางมาร์กเกอร์ช่องที่ 2`;
    return s;
  }

  if (action.type === 'place_guess1' || action.type === 'place_guess2') {
    const { col, row } = action;
    if (playerId === s.cueGiverId) throw new GameActionRejectedError('ผู้ให้คำใบ้ไม่วางมาร์กเกอร์');
    if (!inGrid(col, row)) throw new GameActionRejectedError('ช่องไม่ถูกต้อง');
    const phase = action.type === 'place_guess1' ? 'guess1' : 'guess2';
    if (s.subPhase !== phase) throw new GameActionRejectedError('ไม่ใช่ช่วงทายนี้');

    const guessMap = phase === 'guess1' ? s.guess1 : s.guess2;
    const occupied = phase === 'guess1' ? s.occupied1 : s.occupied2;
    if (guessMap[playerId] != null) throw new GameActionRejectedError('คุณวางมาร์กเกอร์รอบนี้แล้ว');
    const k = cellKey(col, row);
    if (occupied.includes(k)) throw new GameActionRejectedError('ช่องนี้มีมาร์กเกอร์แล้ว');

    if (phase === 'guess1') {
      s.guess1[playerId] = { col, row };
      s.occupied1 = [...occupied, k];
      if (allGuessersPlaced(s, 1)) {
        s.subPhase = 'clue2';
        s.lastEvent = 'ครบทุกคนแล้ว — ผู้ให้คำใบ้ส่งคำใบ้สองคำ';
      }
    } else {
      s.guess2[playerId] = { col, row };
      s.occupied2 = [...occupied, k];
      if (allGuessersPlaced(s, 2)) {
        applyRoundScores(s);
      }
    }
    return s;
  }

  return s;
}

export const huesAndCuesGame: GameDefinition<HuesAndCuesState, HuesAndCuesAction> = {
  id: 'hues-and-cues',
  name: 'Hues and Cues',
  description:
    'ทายสีบนกระดาน 30x16 ช่องจากคำใบ้หนึ่งคำแล้วสองคำ — ใกล้เฉลยยิ่งได้คะแนนมาก (3-10 คน)',
  minPlayers: 3,
  maxPlayers: 10,
  thumbnail: '',

  setup(players: Player[]): HuesAndCuesState {
    const rng = Math.random;
    const playerOrder = shuffle(
      players.map((p) => p.id),
      rng,
    );
    const playerNames: Record<string, string> = {};
    for (const p of players) playerNames[p.id] = p.name;
    const n = playerOrder.length;
    const cycles = n <= 6 ? 2 : 1;
    const s: HuesAndCuesState = {
      phase: 'playing',
      playerOrder,
      playerNames,
      scores: Object.fromEntries(playerOrder.map((id) => [id, 0])),
      roundIndex: 0,
      totalRounds: n * cycles,
      cueGiverId: '',
      target: { col: 0, row: 0 },
      subPhase: 'clue1',
      clue1: null,
      clue2: null,
      guess1: {},
      guess2: {},
      occupied1: [],
      occupied2: [],
      revealBreakdown: null,
      lastEvent: '',
      usedTargetKeys: [],
    };
    startRound(s, rng);
    return s;
  },

  onAction(state: HuesAndCuesState, playerId: string, action: HuesAndCuesAction): HuesAndCuesState {
    return onActionImpl(state, playerId, action);
  },

  getPlayerView(state: HuesAndCuesState, playerId: string): unknown {
    return toView(state, playerId);
  },

  isGameOver(state: HuesAndCuesState): GameResult | null {
    if (state.phase !== 'game_over' || !state.gameResult) return null;
    const { winners, reason } = state.gameResult;
    return { winners, reason };
  },
};
