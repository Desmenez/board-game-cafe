import type { GameResult } from './game.js';

// ============================================================
// Constants
// ============================================================

export const MARRAKECH_BOARD_SIZE = 7;
export const MARRAKECH_CELL_COUNT = MARRAKECH_BOARD_SIZE * MARRAKECH_BOARD_SIZE;
/** Center cell (3,3) in row-major indexing. */
export const MARRAKECH_START_CELL = 24;
export const MARRAKECH_DIE_FACES = [1, 2, 2, 3, 3, 4] as const;
export const MARRAKECH_STARTING_DIRHAMS = 30;
/** A rug may not cover Assam's own square. Flip if rules clarify otherwise. */
export const MARRAKECH_RUG_MAY_COVER_ASSAM = false;

export const MARRAKECH_COLORS = ['rug-1', 'rug-2', 'rug-3', 'rug-4'] as const;
export type MarrakechColor = (typeof MARRAKECH_COLORS)[number];

export const MARRAKECH_FACINGS = ['up', 'right', 'down', 'left'] as const;
export type MarrakechFacing = (typeof MARRAKECH_FACINGS)[number];

export type MarrakechTurn = 'straight' | 'left' | 'right';
export type MarrakechPhase = 'choose_direction' | 'roll' | 'place_rug' | 'game_over';
export type MarrakechDirectionMode = 'self' | 'previous-player';

/** Row-major cell index 0..48 */
export type MarrakechCell = number;
export type MarrakechRugCells = [MarrakechCell, MarrakechCell];

export type MarrakechEdge = 'top' | 'bottom' | 'left' | 'right';

export type MarrakechExit = { lane: number; facing: MarrakechFacing };

/**
 * Assam's border swirls. Each edge has one exit per lane (0..6).
 * Calibrated against the printed mosaic paths:
 * - top: pairs (0,1)(2,3)(4,5), column 6 loops on itself
 * - bottom: column 0 loops, pairs (1,2)(3,4)(5,6)
 * - left/right mirror the same pattern on rows
 * - unpaired corner lanes turn onto the neighboring edge
 */
export const MARRAKECH_SWIRLS: Record<MarrakechEdge, MarrakechExit[]> = {
  top: [
    { lane: 1, facing: 'down' },
    { lane: 0, facing: 'down' },
    { lane: 3, facing: 'down' },
    { lane: 2, facing: 'down' },
    { lane: 5, facing: 'down' },
    { lane: 4, facing: 'down' },
    { lane: 6, facing: 'left' },
  ],
  bottom: [
    { lane: 0, facing: 'right' },
    { lane: 2, facing: 'up' },
    { lane: 1, facing: 'up' },
    { lane: 4, facing: 'up' },
    { lane: 3, facing: 'up' },
    { lane: 6, facing: 'up' },
    { lane: 5, facing: 'up' },
  ],
  left: [
    { lane: 1, facing: 'right' },
    { lane: 0, facing: 'right' },
    { lane: 3, facing: 'right' },
    { lane: 2, facing: 'right' },
    { lane: 5, facing: 'right' },
    { lane: 4, facing: 'right' },
    { lane: 6, facing: 'up' },
  ],
  right: [
    { lane: 0, facing: 'down' },
    { lane: 2, facing: 'left' },
    { lane: 1, facing: 'left' },
    { lane: 4, facing: 'left' },
    { lane: 3, facing: 'left' },
    { lane: 6, facing: 'left' },
    { lane: 5, facing: 'left' },
  ],
};

export const MARRAKECH_RUGS_PER_PLAYER: Record<number, number> = {
  2: 24,
  3: 15,
  4: 12,
};

// ============================================================
// Lobby options
// ============================================================

export interface MarrakechLobbyOptions {
  directionMode: MarrakechDirectionMode;
}

export function defaultMarrakechLobbyOptions(): MarrakechLobbyOptions {
  return { directionMode: 'self' };
}

export function parseMarrakechLobbyOptions(raw: unknown): MarrakechLobbyOptions {
  const defaults = defaultMarrakechLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  const directionMode = o.directionMode === 'previous-player' ? 'previous-player' : 'self';
  return { directionMode };
}

// ============================================================
// State / actions / view
// ============================================================

export type MarrakechAction =
  | { type: 'set-direction'; turn: MarrakechTurn }
  | { type: 'roll-die' }
  | { type: 'place-rug'; cells: MarrakechRugCells };

/** Placement order == render z-order (later rugs sit on top). */
export interface MarrakechRug {
  id: number;
  /** Empty string = neutral (eliminated owner's rugs). */
  ownerId: string;
  color: MarrakechColor;
  cells: MarrakechRugCells;
}

export interface MarrakechPlayerSeat {
  id: string;
  name: string;
  dirhams: number;
  /** Colors this seat owns (1 for 3–4p, 2 for 2p). */
  colors: MarrakechColor[];
  /** Remaining rugs to place (3–4p). For 2p this is the shuffled pile length. */
  rugsRemaining: number;
  /** 2p only: shuffled pile of colors; front = next to place. Empty for 3–4p. */
  rugPile: MarrakechColor[];
  eliminated: boolean;
}

export interface MarrakechAssam {
  cell: MarrakechCell;
  facing: MarrakechFacing;
}

export interface MarrakechPaymentEvent {
  fromId: string;
  toId: string;
  amount: number;
  color: MarrakechColor;
  areaSize: number;
}

export interface MarrakechState {
  phase: MarrakechPhase;
  directionMode: MarrakechDirectionMode;
  playerOrder: string[];
  players: Record<string, MarrakechPlayerSeat>;
  activePlayerId: string;
  assam: MarrakechAssam;
  rugs: MarrakechRug[];
  nextRugId: number;
  lastRoll: number | null;
  lastPayment: MarrakechPaymentEvent | null;
  lastEvent: string;
  result: GameResult | null;
  /**
   * When directionMode is 'previous-player': after placing a rug the same
   * player sets Assam's facing for the next seat, then we advance.
   */
  pendingAdvanceAfterDirection: boolean;
  /**
   * Internal: exact die faces to consume before random (tests only).
   * Omitted from player view.
   */
  dieQueue: number[];
}

export interface MarrakechPublicPlayer {
  id: string;
  name: string;
  dirhams: number;
  colors: MarrakechColor[];
  rugsRemaining: number;
  /** Next color to place (2p), or the single color (3–4p). Null if eliminated / empty. */
  nextColor: MarrakechColor | null;
  eliminated: boolean;
}

export interface MarrakechPlayerView {
  phase: MarrakechPhase;
  directionMode: MarrakechDirectionMode;
  playerOrder: string[];
  players: MarrakechPublicPlayer[];
  activePlayerId: string;
  myId: string;
  canAct: boolean;
  assam: MarrakechAssam;
  rugs: MarrakechRug[];
  lastRoll: number | null;
  lastPayment: MarrakechPaymentEvent | null;
  lastEvent: string;
  legalPlacements: MarrakechRugCells[];
  /** Color the active player would place next (if known). */
  nextPlaceColor: MarrakechColor | null;
  /**
   * previous-player mode: after placing a rug the same seat sets Assam's facing
   * for the next player (confirm direction only — they do not roll).
   */
  pendingAdvanceAfterDirection: boolean;
  result: GameResult | null;
  scores: MarrakechScoreEntry[] | null;
}

export interface MarrakechScoreEntry {
  playerId: string;
  name: string;
  dirhams: number;
  visibleSquares: number;
  total: number;
}

// ============================================================
// Geometry helpers
// ============================================================

export function cellOf(row: number, col: number): MarrakechCell {
  return row * MARRAKECH_BOARD_SIZE + col;
}

export function rowOf(cell: MarrakechCell): number {
  return Math.floor(cell / MARRAKECH_BOARD_SIZE);
}

export function colOf(cell: MarrakechCell): number {
  return cell % MARRAKECH_BOARD_SIZE;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < MARRAKECH_BOARD_SIZE && col >= 0 && col < MARRAKECH_BOARD_SIZE;
}

export function isValidCell(cell: MarrakechCell): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < MARRAKECH_CELL_COUNT;
}

const FACING_DELTA: Record<MarrakechFacing, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  right: { dr: 0, dc: 1 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
};

export function rotateFacing(facing: MarrakechFacing, turn: MarrakechTurn): MarrakechFacing {
  if (turn === 'straight') return facing;
  const idx = MARRAKECH_FACINGS.indexOf(facing);
  const delta = turn === 'right' ? 1 : -1;
  return MARRAKECH_FACINGS[(idx + delta + 4) % 4]!;
}

function edgeForExit(facing: MarrakechFacing): MarrakechEdge {
  switch (facing) {
    case 'up':
      return 'top';
    case 'down':
      return 'bottom';
    case 'left':
      return 'left';
    case 'right':
      return 'right';
  }
}

function laneForEdge(edge: MarrakechEdge, row: number, col: number): number {
  return edge === 'top' || edge === 'bottom' ? col : row;
}

function cellFromEdgeLane(edge: MarrakechEdge, lane: number): MarrakechCell {
  switch (edge) {
    case 'top':
      return cellOf(0, lane);
    case 'bottom':
      return cellOf(MARRAKECH_BOARD_SIZE - 1, lane);
    case 'left':
      return cellOf(lane, 0);
    case 'right':
      return cellOf(lane, MARRAKECH_BOARD_SIZE - 1);
  }
}

/**
 * Advance Assam one square. If the next step would leave the board,
 * follow the swirl (no step cost) and land on the re-entry cell facing
 * the new direction — that landing IS the step.
 */
export function stepAssam(
  assam: MarrakechAssam,
  swirls: Record<MarrakechEdge, MarrakechExit[]> = MARRAKECH_SWIRLS,
): MarrakechAssam {
  const { dr, dc } = FACING_DELTA[assam.facing];
  const row = rowOf(assam.cell);
  const col = colOf(assam.cell);
  const nextRow = row + dr;
  const nextCol = col + dc;

  if (inBounds(nextRow, nextCol)) {
    return { cell: cellOf(nextRow, nextCol), facing: assam.facing };
  }

  const edge = edgeForExit(assam.facing);
  const lane = laneForEdge(edge, row, col);
  const exit = swirls[edge][lane];
  if (!exit) {
    // Fallback: bounce back on same lane
    const opposite: MarrakechFacing =
      assam.facing === 'up'
        ? 'down'
        : assam.facing === 'down'
          ? 'up'
          : assam.facing === 'left'
            ? 'right'
            : 'left';
    return { cell: assam.cell, facing: opposite };
  }
  return { cell: cellFromEdgeLane(edge, exit.lane), facing: exit.facing };
}

export function moveAssam(
  assam: MarrakechAssam,
  steps: number,
  swirls: Record<MarrakechEdge, MarrakechExit[]> = MARRAKECH_SWIRLS,
): MarrakechAssam {
  let cur = assam;
  for (let i = 0; i < steps; i++) {
    cur = stepAssam(cur, swirls);
  }
  return cur;
}

// ============================================================
// Board / rug helpers
// ============================================================

/** Topmost (latest) rug covering a cell, or null. */
export function topRugByCell(rugs: readonly MarrakechRug[], cell: MarrakechCell): MarrakechRug | null {
  for (let i = rugs.length - 1; i >= 0; i--) {
    const rug = rugs[i]!;
    if (rug.cells[0] === cell || rug.cells[1] === cell) return rug;
  }
  return null;
}

/** Orthogonally connected area of the same color, including `start`. */
export function connectedColorArea(
  rugs: readonly MarrakechRug[],
  start: MarrakechCell,
): { color: MarrakechColor; ownerId: string; cells: MarrakechCell[] } | null {
  const top = topRugByCell(rugs, start);
  if (!top) return null;

  const color = top.color;
  const ownerId = top.ownerId;
  const visited = new Set<MarrakechCell>();
  const queue: MarrakechCell[] = [start];
  visited.add(start);

  while (queue.length > 0) {
    const cur = queue.pop()!;
    const r = rowOf(cur);
    const c = colOf(cur);
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const n = cellOf(nr, nc);
      if (visited.has(n)) continue;
      const t = topRugByCell(rugs, n);
      if (!t || t.color !== color) continue;
      visited.add(n);
      queue.push(n);
    }
  }

  return { color, ownerId, cells: [...visited] };
}

function cellsShareEdge(a: MarrakechCell, b: MarrakechCell): boolean {
  const ar = rowOf(a);
  const ac = colOf(a);
  const br = rowOf(b);
  const bc = colOf(b);
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

function normalizeRugCells(cells: MarrakechRugCells): MarrakechRugCells {
  return cells[0] <= cells[1] ? [cells[0], cells[1]] : [cells[1], cells[0]];
}

export function rugCellsEqual(a: MarrakechRugCells, b: MarrakechRugCells): boolean {
  const na = normalizeRugCells(a);
  const nb = normalizeRugCells(b);
  return na[0] === nb[0] && na[1] === nb[1];
}

/**
 * Legal domino placements adjacent to Assam.
 * A rug covers two orthogonally adjacent cells; one must share an edge with Assam.
 * May not cover Assam's cell (unless MARRAKECH_RUG_MAY_COVER_ASSAM).
 * May not cover both halves of the same existing rug.
 */
export function legalRugPlacements(
  rugs: readonly MarrakechRug[],
  assamCell: MarrakechCell,
): MarrakechRugCells[] {
  const results: MarrakechRugCells[] = [];
  const seen = new Set<string>();

  const ar = rowOf(assamCell);
  const ac = colOf(assamCell);

  // Candidate cells that share an edge with Assam (and optionally Assam itself).
  const touchCells: MarrakechCell[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const nr = ar + dr;
    const nc = ac + dc;
    if (inBounds(nr, nc)) touchCells.push(cellOf(nr, nc));
  }
  if (MARRAKECH_RUG_MAY_COVER_ASSAM) {
    touchCells.push(assamCell);
  }

  for (const c1 of touchCells) {
    const r1 = rowOf(c1);
    const c1col = colOf(c1);
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = r1 + dr;
      const nc = c1col + dc;
      if (!inBounds(nr, nc)) continue;
      const c2 = cellOf(nr, nc);
      if (!MARRAKECH_RUG_MAY_COVER_ASSAM && (c1 === assamCell || c2 === assamCell)) continue;
      // At least one cell must share an edge with Assam (already true for c1 unless Assam itself).
      if (c1 !== assamCell && c2 !== assamCell) {
        if (!cellsShareEdge(c1, assamCell) && !cellsShareEdge(c2, assamCell)) continue;
      } else if (!MARRAKECH_RUG_MAY_COVER_ASSAM) {
        continue;
      }

      const pair = normalizeRugCells([c1, c2]);
      const key = `${pair[0]},${pair[1]}`;
      if (seen.has(key)) continue;

      // Cannot entirely cover one existing rug.
      const top1 = topRugByCell(rugs, pair[0]);
      const top2 = topRugByCell(rugs, pair[1]);
      if (top1 && top2 && top1.id === top2.id) continue;

      seen.add(key);
      results.push(pair);
    }
  }

  return results;
}

/** Count of visible (topmost) squares per ownerId. Neutral rugs (ownerId '') are skipped. */
export function visibleSquares(rugs: readonly MarrakechRug[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let cell = 0; cell < MARRAKECH_CELL_COUNT; cell++) {
    const top = topRugByCell(rugs, cell);
    if (!top || top.ownerId === '') continue;
    counts[top.ownerId] = (counts[top.ownerId] ?? 0) + 1;
  }
  return counts;
}

/** Visible squares for a single color (2p scoring keeps colors separate for areas, but score is by owner). */
export function visibleSquaresByColor(
  rugs: readonly MarrakechRug[],
): Record<MarrakechColor, number> {
  const counts = Object.fromEntries(MARRAKECH_COLORS.map((c) => [c, 0])) as Record<
    MarrakechColor,
    number
  >;
  for (let cell = 0; cell < MARRAKECH_CELL_COUNT; cell++) {
    const top = topRugByCell(rugs, cell);
    if (!top) continue;
    counts[top.color] += 1;
  }
  return counts;
}

export function marrakechScore(
  players: ReadonlyArray<Pick<MarrakechPlayerSeat, 'id' | 'name' | 'dirhams' | 'eliminated'>>,
  rugs: readonly MarrakechRug[],
): MarrakechScoreEntry[] {
  const vis = visibleSquares(rugs);
  return players
    .filter((p) => !p.eliminated)
    .map((p) => {
      const visible = vis[p.id] ?? 0;
      return {
        playerId: p.id,
        name: p.name,
        dirhams: p.dirhams,
        visibleSquares: visible,
        total: p.dirhams + visible,
      };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.dirhams - a.dirhams;
    });
}

export function nextColorForPlayer(player: MarrakechPlayerSeat): MarrakechColor | null {
  if (player.eliminated || player.rugsRemaining <= 0) return null;
  if (player.rugPile.length > 0) return player.rugPile[0] ?? null;
  return player.colors[0] ?? null;
}

export function rollMarrakechDie(random: () => number = Math.random): number {
  const idx = Math.floor(random() * MARRAKECH_DIE_FACES.length);
  return MARRAKECH_DIE_FACES[idx]!;
}

/** Verify swirl map is an involution on each edge (pairing is symmetric). */
export function swirlsAreInvolution(
  swirls: Record<MarrakechEdge, MarrakechExit[]> = MARRAKECH_SWIRLS,
): boolean {
  for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
    const exits = swirls[edge];
    if (exits.length !== MARRAKECH_BOARD_SIZE) return false;
    for (let lane = 0; lane < MARRAKECH_BOARD_SIZE; lane++) {
      const exit = exits[lane]!;
      if (exit.lane < 0 || exit.lane >= MARRAKECH_BOARD_SIZE) return false;
      const back = exits[exit.lane]!;
      if (back.lane !== lane) return false;
    }
  }
  return true;
}
