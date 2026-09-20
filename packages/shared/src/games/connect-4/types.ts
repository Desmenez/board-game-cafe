import type { GameResult } from '../../platform/game.js';

export const CONNECT_4_ID = 'connect-4';

/** Official Connect 4 board: 7 columns × 6 rows. */
export const CONNECT_4_COLS = 7;
export const CONNECT_4_ROWS = 6;
export const CONNECT_4_WIN_LENGTH = 4;

export const CONNECT_4_COLORS = ['red', 'yellow'] as const;
export type Connect4Color = (typeof CONNECT_4_COLORS)[number];

/** Empty cell or a settled disc. */
export type Connect4Cell = Connect4Color | null;

export type Connect4Phase = 'playing' | 'game_over';

export type Connect4Action = { type: 'drop'; col: number };

export interface Connect4CellCoord {
  row: number;
  col: number;
}

/** Last legal drop — client uses this to play the gravity animation. */
export interface Connect4LastMove {
  col: number;
  row: number;
  playerId: string;
}

export interface Connect4Player {
  id: string;
  name: string;
  color: Connect4Color;
}

/**
 * Server state.
 * `board[row][col]` — **row 0 is the bottom** (gravity rest), row 5 is the top.
 * Col 0 is the left column.
 */
export interface Connect4State {
  phase: Connect4Phase;
  board: Connect4Cell[][];
  currentPlayerId: string;
  players: Connect4Player[];
  playerColors: Record<string, Connect4Color>;
  lastMove: Connect4LastMove | null;
  winningLine: Connect4CellCoord[] | null;
  result: GameResult | null;
}

export interface Connect4PlayerView {
  phase: Connect4Phase;
  board: Connect4Cell[][];
  currentPlayerId: string;
  canAct: boolean;
  players: Connect4Player[];
  playerColors: Record<string, Connect4Color>;
  myColor: Connect4Color;
  lastMove: Connect4LastMove | null;
  winningLine: Connect4CellCoord[] | null;
  legalColumns: number[];
  result: GameResult | null;
}

export function createConnect4Board(): Connect4Cell[][] {
  return Array.from({ length: CONNECT_4_ROWS }, () =>
    Array.from({ length: CONNECT_4_COLS }, () => null),
  );
}

export function connect4InBounds(row: number, col: number): boolean {
  return row >= 0 && row < CONNECT_4_ROWS && col >= 0 && col < CONNECT_4_COLS;
}

/** Lowest empty row in a column, or `null` if the column is full. */
export function connect4LowestEmptyRow(board: Connect4Cell[][], col: number): number | null {
  if (col < 0 || col >= CONNECT_4_COLS) return null;
  for (let row = 0; row < CONNECT_4_ROWS; row += 1) {
    if (board[row]![col] == null) return row;
  }
  return null;
}

export function connect4LegalColumns(board: Connect4Cell[][]): number[] {
  const cols: number[] = [];
  for (let col = 0; col < CONNECT_4_COLS; col += 1) {
    if (connect4LowestEmptyRow(board, col) != null) cols.push(col);
  }
  return cols;
}

export function connect4IsBoardFull(board: Connect4Cell[][]): boolean {
  return connect4LegalColumns(board).length === 0;
}

const WIN_DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function cellsInDirection(
  board: Connect4Cell[][],
  originRow: number,
  originCol: number,
  dRow: number,
  dCol: number,
): Connect4CellCoord[] {
  const color = board[originRow]![originCol];
  if (!color) return [];
  const cells: Connect4CellCoord[] = [{ row: originRow, col: originCol }];
  for (const sign of [1, -1] as const) {
    let row = originRow + dRow * sign;
    let col = originCol + dCol * sign;
    while (connect4InBounds(row, col) && board[row]![col] === color) {
      cells.push({ row, col });
      row += dRow * sign;
      col += dCol * sign;
    }
  }
  return cells;
}

/** Winning line through the disc at `(row, col)`, or `null` if that cell is not a 4-in-a-row. */
export function connect4WinningLine(
  board: Connect4Cell[][],
  row: number,
  col: number,
): Connect4CellCoord[] | null {
  if (!connect4InBounds(row, col) || board[row]![col] == null) return null;
  for (const [dRow, dCol] of WIN_DIRS) {
    const cells = cellsInDirection(board, row, col, dRow, dCol);
    if (cells.length >= CONNECT_4_WIN_LENGTH) return cells;
  }
  return null;
}

/**
 * Gravity drop duration in ms — longer for lower (bottom) rows.
 * Stays in the 300–500ms range.
 */
export function connect4DropDurationMs(row: number): number {
  const visualRowFromTop = CONNECT_4_ROWS - 1 - Math.max(0, Math.min(row, CONNECT_4_ROWS - 1));
  return 300 + visualRowFromTop * 32;
}
