import type {
  GameDefinition,
  GameResult,
  HuesAndCuesAction,
  HuesAndCuesCoord,
  HuesAndCuesPlayerView,
  HuesAndCuesRevealBreakdown,
  HuesAndCuesSubPhase,
  Player,
} from 'shared';
import {
  HUES_AND_CUES_BANNED_WORDS,
  HUES_AND_CUES_COLS,
  HUES_AND_CUES_ROWS,
  huesAndCuesCellHex,
  huesAndCuesCellLabel,
  huesAndCuesChebyshevScore,
  huesAndCuesInScoringFrame,
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
  /** null until cue giver picks from colorCard */
  target: HuesAndCuesCoord | null;
  /** 4 options drawn for this round (cleared after pick) */
  colorCard: HuesAndCuesCoord[] | null;
  subPhase: HuesAndCuesSubPhase;
  clue1: string | null;
  clue2: string | null;
  currentGuessers: string[];
  guess1: Record<string, HuesAndCuesCoord | null>;
  guess2: Record<string, HuesAndCuesCoord | null>;
  occupied1: Set<string>;
  occupied2: Set<string>;
  revealBreakdown: HuesAndCuesRevealBreakdown | null;
  lastEvent: string;
  /** candidate targets to avoid repeats; depleted then reshuffled */
  remainingTargetPool: string[];
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

function validateClueWords(words: string[], mode: 1 | '1or2'): string {
  if (mode === 1) {
    if (words.length !== 1) {
      return 'คำใบ้รอบแรกต้องเป็นคำเดียว (ไม่เว้นวรรค)';
    }
  } else if (words.length < 1 || words.length > 2) {
    return 'คำใบ้รอบสองต้องเป็นหนึ่งหรือสองคำ';
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

function buildTargetPool(rng: () => number): string[] {
  const keys: string[] = [];
  for (let row = 0; row < HUES_AND_CUES_ROWS; row += 1) {
    for (let col = 0; col < HUES_AND_CUES_COLS; col += 1) {
      keys.push(cellKey(col, row));
    }
  }
  return shuffle(keys, rng);
}

function pickDistinctTarget(s: HuesAndCuesState, rng: () => number): HuesAndCuesCoord {
  if (s.remainingTargetPool.length === 0) {
    s.remainingTargetPool = buildTargetPool(rng);
  }
  const key = s.remainingTargetPool.pop();
  if (!key) {
    return {
      col: Math.floor(rng() * HUES_AND_CUES_COLS),
      row: Math.floor(rng() * HUES_AND_CUES_ROWS),
    };
  }
  const [colRaw, rowRaw] = key.split(',');
  return { col: Number(colRaw), row: Number(rowRaw) };
}

/** Draw 4 distinct cells for the cue giver's color card. */
function drawColorCard(s: HuesAndCuesState, rng: () => number): HuesAndCuesCoord[] {
  const options: HuesAndCuesCoord[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (options.length < 4 && guard < 64) {
    guard += 1;
    const c = pickDistinctTarget(s, rng);
    const k = cellKey(c.col, c.row);
    if (seen.has(k)) continue;
    seen.add(k);
    options.push(c);
  }
  while (options.length < 4) {
    options.push({
      col: Math.floor(rng() * HUES_AND_CUES_COLS),
      row: Math.floor(rng() * HUES_AND_CUES_ROWS),
    });
  }
  return options;
}

function startRound(s: HuesAndCuesState, rng: () => number): void {
  const n = s.playerOrder.length;
  s.cueGiverId = s.playerOrder[s.roundIndex % n]!;
  s.currentGuessers = s.playerOrder.filter((id) => id !== s.cueGiverId);
  s.colorCard = drawColorCard(s, rng);
  s.target = null;
  s.subPhase = 'pick_target';
  s.clue1 = null;
  s.clue2 = null;
  s.guess1 = {};
  s.guess2 = {};
  s.occupied1 = new Set<string>();
  s.occupied2 = new Set<string>();
  s.revealBreakdown = null;
  for (const id of s.currentGuessers) {
    s.guess1[id] = null;
    s.guess2[id] = null;
  }
  const name = s.playerNames[s.cueGiverId] ?? s.cueGiverId;
  s.lastEvent = `รอบที่ ${s.roundIndex + 1}/${s.totalRounds} — ${name} เลือกสีจากบัตร`;
}

function allGuessersPlaced(s: HuesAndCuesState, which: 1 | 2): boolean {
  const g = which === 1 ? s.guess1 : s.guess2;
  return s.currentGuessers.every((id) => g[id] != null);
}

function applyRoundScores(s: HuesAndCuesState): void {
  if (!s.target) throw new GameActionRejectedError('ยังไม่ได้เลือกสีเป้าหมาย');
  const { col: tc, row: tr } = s.target;
  const byPlayer: HuesAndCuesRevealBreakdown['byPlayer'] = {};
  /** ผู้ใบ้: นับมาร์กเกอร์ในกรอบ 3×3 เท่านั้น (เกม 3 คน = 2 แต้ม/ชิ้น) */
  let markersInFrame = 0;
  const ptsPerMarker = s.playerOrder.length === 3 ? 2 : 1;

  for (const id of s.currentGuessers) {
    const g1 = s.guess1[id];
    const g2 = s.guess2[id];
    const p1 = g1 ? huesAndCuesChebyshevScore(tc, tr, g1.col, g1.row) : 0;
    const p2 = g2 ? huesAndCuesChebyshevScore(tc, tr, g2.col, g2.row) : 0;
    const roundTotal = p1 + p2;
    byPlayer[id] = { guess1: p1, guess2: p2, roundTotal };
    s.scores[id] = (s.scores[id] ?? 0) + roundTotal;
    if (g1 && huesAndCuesInScoringFrame(tc, tr, g1.col, g1.row)) markersInFrame += 1;
    if (g2 && huesAndCuesInScoringFrame(tc, tr, g2.col, g2.row)) markersInFrame += 1;
  }

  const cueGain = markersInFrame * ptsPerMarker;
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
  const g1ids = state.currentGuessers;
  let guess1Done = 0;
  let guess2Done = 0;
  for (const id of g1ids) {
    if (state.guess1[id] != null) guess1Done += 1;
    if (state.guess2[id] != null) guess2Done += 1;
  }
  const isCue = viewerId === state.cueGiverId;
  const showTarget =
    state.target != null &&
    (state.phase === 'game_over' ||
      state.subPhase === 'reveal' ||
      (isCue && state.phase === 'playing' && state.subPhase !== 'pick_target'));

  const t = showTarget ? state.target : null;
  const targetHex = t ? huesAndCuesCellHex(t.col, t.row) : null;

  const showColorCard =
    isCue &&
    state.subPhase === 'pick_target' &&
    state.colorCard != null &&
    state.colorCard.length > 0;
  const colorCard = showColorCard
    ? state.colorCard!.map((c) => ({
        col: c.col,
        row: c.row,
        hex: huesAndCuesCellHex(c.col, c.row),
        label: huesAndCuesCellLabel(c.col, c.row),
      }))
    : null;

  return {
    phase: state.phase,
    myId: viewerId,
    playerOrder: [...state.playerOrder],
    playerNames: { ...state.playerNames },
    scores: { ...state.scores },
    roundIndex: state.roundIndex,
    totalRounds: state.totalRounds,
    cueGiverId: state.cueGiverId,
    amCueGiver: isCue,
    subPhase: state.subPhase,
    clue1: state.clue1,
    clue2: state.clue2,
    colorCard,
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
    revealBreakdown: state.revealBreakdown
      ? { ...state.revealBreakdown, byPlayer: { ...state.revealBreakdown.byPlayer } }
      : null,
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

function onActionImpl(
  state: HuesAndCuesState,
  playerId: string,
  action: HuesAndCuesAction,
): HuesAndCuesState {
  const s: HuesAndCuesState = {
    ...state,
    scores: { ...state.scores },
    currentGuessers: [...state.currentGuessers],
    guess1: { ...state.guess1 },
    guess2: { ...state.guess2 },
    occupied1: new Set(state.occupied1),
    occupied2: new Set(state.occupied2),
    remainingTargetPool: [...state.remainingTargetPool],
    colorCard: state.colorCard ? state.colorCard.map((c) => ({ ...c })) : null,
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

  if (action.type === 'pick_target') {
    if (playerId !== s.cueGiverId) throw new GameActionRejectedError('เฉพาะผู้ให้คำใบ้เลือกสีได้');
    if (s.subPhase !== 'pick_target') throw new GameActionRejectedError('ไม่ใช่ช่วงเลือกสี');
    if (!s.colorCard || s.colorCard.length === 0) {
      throw new GameActionRejectedError('ไม่มีบัตรสี');
    }
    const { col, row } = action;
    const ok = s.colorCard.some((c) => c.col === col && c.row === row);
    if (!ok) throw new GameActionRejectedError('ต้องเลือกสีจากบัตรเท่านั้น');
    s.target = { col, row };
    s.colorCard = null;
    s.subPhase = 'clue1';
    const label = huesAndCuesCellLabel(col, row);
    s.lastEvent = `เลือกสี ${label} แล้ว — ส่งคำใบ้แรก`;
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
    const err = validateClueWords(words, '1or2');
    if (err) throw new GameActionRejectedError(err);
    s.clue2 = words.join(' ');
    s.subPhase = 'guess2';
    s.lastEvent = `คำใบ้ที่สอง: «${s.clue2}» — วางมาร์กเกอร์ช่องที่ 2`;
    return s;
  }

  if (action.type === 'skip_clue2') {
    if (playerId !== s.cueGiverId) throw new GameActionRejectedError('เฉพาะผู้ให้คำใบ้ส่งคำใบ้ได้');
    if (s.subPhase !== 'clue2') throw new GameActionRejectedError('ไม่ใช่ช่วงคำใบ้ที่สอง');
    s.clue2 = '-';
    /** ข้ามคำใบ้ 2 = ไม่มีการทายรอบ 2 ตามกฎจริง */
    applyRoundScores(s);
    s.lastEvent = 'ข้ามคำใบ้ที่สอง — ไม่มีการทายรอบ 2 · เปิดเฉลย';
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
    if (occupied.has(k)) throw new GameActionRejectedError('ช่องนี้มีมาร์กเกอร์แล้ว');
    if (phase === 'guess2' && s.occupied1.has(k)) {
      const mine = s.guess1[playerId];
      const isOwnFirst = mine != null && mine.col === col && mine.row === row;
      if (!isOwnFirst) {
        throw new GameActionRejectedError(
          'ช่องนี้มีมาร์กเกอร์รอบแรกของผู้อื่นแล้ว — เลือกช่องว่าง',
        );
      }
    }

    if (phase === 'guess1') {
      s.guess1[playerId] = { col, row };
      s.occupied1.add(k);
      if (allGuessersPlaced(s, 1)) {
        s.subPhase = 'clue2';
        s.lastEvent = 'ครบทุกคนแล้ว — ผู้ให้คำใบ้ส่งคำใบ้ (1–2 คำ) หรือข้าม';
      }
    } else {
      s.guess2[playerId] = { col, row };
      s.occupied2.add(k);
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
  thumbnail:
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1775805189/cover_h1chxq.jpg',

  setup(players: Player[]): HuesAndCuesState {
    const rng = Math.random;
    const playerOrder = shuffle(
      players.map((p) => p.id),
      rng,
    );
    const playerNames: Record<string, string> = {};
    for (const p of players) playerNames[p.id] = p.name;
    const n = playerOrder.length;
    /** 3–6 คน: วนเป็นผู้ใบ้ 2 รอบต่อคน · 7 คนขึ้นไป: คนละรอบ (ตามกฎจริง) */
    const cycles = n <= 6 ? 2 : 1;
    const s: HuesAndCuesState = {
      phase: 'playing',
      playerOrder,
      playerNames,
      scores: Object.fromEntries(playerOrder.map((id) => [id, 0])),
      roundIndex: 0,
      totalRounds: n * cycles,
      cueGiverId: '',
      target: null,
      colorCard: null,
      subPhase: 'pick_target',
      clue1: null,
      clue2: null,
      currentGuessers: [],
      guess1: {},
      guess2: {},
      occupied1: new Set<string>(),
      occupied2: new Set<string>(),
      revealBreakdown: null,
      lastEvent: '',
      remainingTargetPool: buildTargetPool(rng),
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
