// Hues and Cues–style party game: 30×16 color grid, cue giver + one-word / two-word clues, two guesses each.

export const HUES_AND_CUES_COLS = 30;
export const HUES_AND_CUES_ROWS = 16;

/** แถว A–P (แกน Y) + คอลัมน์ 1–30 (แกน X) → เช่น A1, G8 */
export function huesAndCuesCellLabel(col: number, row: number): string {
  if (row < 0 || row >= HUES_AND_CUES_ROWS || col < 0 || col >= HUES_AND_CUES_COLS) return '';
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

/** H 0–360, S/L 0–100 */
export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (ss === 0) {
    r = g = b = ll;
  } else {
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    const hk = hh / 360;
    r = hue2rgb(p, q, hk + 1 / 3);
    g = hue2rgb(p, q, hk);
    b = hue2rgb(p, q, hk - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * สีต่อช่อง — มองกระดานเป็นวงรีแนวนอนร่วมศูนย์กับกริด 30×16 (สัดส่วนกว้างกว่าสูง)
 * - **Hue** = มุมรอบจุดกลางในระบบพิกัดที่ยืดตามกริด `(nx,ny) = (dx/wx, dy/wy)` เทียบเท่าวงรีแกนขนานกับกริด
 *   (ไม่ใช่มุมจากพิกเซลดิบ — แบบนั้นทำให้แกนกว้าง “กิน”ช่วงสีมากกว่าแกนสั้น)
 * - **ระยะ r** = ระยะจากศูนย์ในระบบเดียวกัน → ขอบมืด กลางสว่าง
 */
export function huesAndCuesCellHex(col: number, row: number): string {
  const cols = HUES_AND_CUES_COLS;
  const rows = HUES_AND_CUES_ROWS;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const wx = Math.max(cx, cols - 1 - cx);
  const wy = Math.max(cy, rows - 1 - cy);

  const dx = col - cx;
  const dy = row - cy;

  const nx = dx / wx;
  const ny = dy / wy;

  // มุมใน “ระนาบวงรี”: บน = แดง 0° (แกน y ลงบนจอ — ใช้ atan2(nx, -ny))
  let h = (Math.atan2(nx, -ny) * 180) / Math.PI;
  h = ((h % 360) + 360) % 360;

  const r = Math.min(1, Math.hypot(nx, ny) / Math.SQRT2);

  const rg = Math.pow(r, 0.88);
  // ขอบมืด (L ต่ำ) → กลางสว่าง (L สูง)
  let l = 78 - 54 * rg;
  // ขอบอิ่มสีกว่า กลางพาสเทลนุ่มขึ้น
  let s = 36 + 52 * Math.pow(r, 0.72);

  l = Math.min(84, Math.max(16, l));
  s = Math.min(100, Math.max(18, s));
  if (r < 0.42 && l > 58) s = Math.max(s, 32 + (0.42 - r) * 48);
  s = Math.min(100, s);

  return hslToHex(h, s, l);
}

/**
 * Chebyshev distance on the grid: 0 → 3 pts, 1 → 2 (3×3 around target), 2 → 1, else 0.
 * Simplified from the physical “scoring frame”.
 */
export function huesAndCuesChebyshevScore(
  targetCol: number,
  targetRow: number,
  guessCol: number,
  guessRow: number,
): 0 | 1 | 2 | 3 {
  const d = Math.max(Math.abs(targetCol - guessCol), Math.abs(targetRow - guessRow));
  if (d === 0) return 3;
  if (d === 1) return 2;
  if (d === 2) return 1;
  return 0;
}

/** ช่องอยู่ในแถบคะแนน 5×5 (Chebyshev ≤ 2 จากเป้าหมาย) — ตรงกับที่มีคะแนนมาร์กเกอร์อย่างน้อย +1 */
export function huesAndCuesInScoringFootprint(
  targetCol: number,
  targetRow: number,
  guessCol: number,
  guessRow: number,
): boolean {
  return Math.max(Math.abs(targetCol - guessCol), Math.abs(targetRow - guessRow)) <= 2;
}

/** Lowercase banned one-word clues (basic color names). Extend as needed. */
export const HUES_AND_CUES_BANNED_WORDS = new Set([
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'brown',
  'black',
  'white',
  'gray',
  'grey',
  'cyan',
  'magenta',
  'violet',
  'lime',
  'gold',
  'silver',
  'แดง',
  'น้ำเงิน',
  'ฟ้า',
  'เขียว',
  'เหลือง',
  'ส้ม',
  'ม่วง',
  'ชมพู',
  'น้ำตาล',
  'ดำ',
  'ขาว',
  'เทา',
]);

export type HuesAndCuesSubPhase = 'clue1' | 'guess1' | 'clue2' | 'guess2' | 'reveal';

export type HuesAndCuesAction =
  | { type: 'submit_clue1'; text: string }
  | { type: 'place_guess1'; col: number; row: number }
  | { type: 'submit_clue2'; text: string }
  | { type: 'skip_clue2' }
  | { type: 'place_guess2'; col: number; row: number }
  | { type: 'continue_after_reveal' };

export interface HuesAndCuesCoord {
  col: number;
  row: number;
}

export interface HuesAndCuesRevealBreakdown {
  target: HuesAndCuesCoord;
  /** Per guesser: points from first and second marker this round */
  byPlayer: Record<string, { guess1: number; guess2: number; roundTotal: number }>;
  /** คะแนนผู้ใบ้รอบนี้ = จำนวนมาร์กเกอร์ผู้ทายที่อยู่ในกรอบ 5×5 (Chebyshev ≤ 2) */
  cueGiverRoundGain: number;
}

export interface HuesAndCuesPlayerView {
  phase: 'playing' | 'game_over';
  myId: string;
  playerOrder: string[];
  playerNames: Record<string, string>;
  scores: Record<string, number>;
  roundIndex: number;
  totalRounds: number;
  cueGiverId: string;
  amCueGiver: boolean;
  subPhase: HuesAndCuesSubPhase;
  clue1: string | null;
  clue2: string | null;
  /** Hidden until reveal unless you are cue giver (while playing) */
  target: HuesAndCuesCoord | null;
  targetHex: string | null;
  guess1: Record<string, HuesAndCuesCoord | null>;
  guess2: Record<string, HuesAndCuesCoord | null>;
  progress: {
    guess1Done: number;
    guess1Total: number;
    guess2Done: number;
    guess2Total: number;
  };
  revealBreakdown: HuesAndCuesRevealBreakdown | null;
  lastEvent: string;
  gameResult?: {
    winners: string[];
    reason: string;
    scores: Record<string, number>;
  };
}
