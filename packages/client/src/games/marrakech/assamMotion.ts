import {
  MARRAKECH_SWIRLS,
  colOf,
  moveAssam,
  rowOf,
  stepAssam,
  type MarrakechAssam,
  type MarrakechEdge,
  type MarrakechExit,
  type MarrakechFacing,
} from 'shared';
import { cellCenter, type MarrakechBoardLayout, type PercentPos } from './boardLayout';

export const ASSAM_FACING_DEG: Record<MarrakechFacing, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

/** Seconds per orthogonal cell step. */
export const ASSAM_STEP_DURATION = 0.28;
/** Seconds for a full swirl (exit → arc → re-enter). */
export const ASSAM_SWIRL_DURATION = 0.72;
/** Seconds for an in-place facing turn. */
export const ASSAM_TURN_DURATION = 0.22;

export type AssamWayPoint = PercentPos & {
  /** Continuous degrees (may leave 0–360 for smooth turns). */
  rotate: number;
  kind: 'cell' | 'swirl';
};

export type AssamMotionSegment = {
  points: AssamWayPoint[];
  duration: number;
};

function shortestRotate(fromDeg: number, toFacing: MarrakechFacing): number {
  const target = ASSAM_FACING_DEG[toFacing];
  const normalized = ((fromDeg % 360) + 360) % 360;
  const delta = ((target - normalized + 540) % 360) - 180;
  return fromDeg + delta;
}

/** Prefer the turn direction that matches travel along the border. */
function swirlRotate(
  fromDeg: number,
  toFacing: MarrakechFacing,
  edge: MarrakechEdge,
  fromLane: number,
  toLane: number,
): number {
  const target = ASSAM_FACING_DEG[toFacing];
  const normalized = ((fromDeg % 360) + 360) % 360;
  const short = ((target - normalized + 540) % 360) - 180;
  if (fromLane === toLane) {
    // U-turn: always take the long way if short is 0, else prefer +180 toward mosaic traffic.
    if (Math.abs(short) < 1) return fromDeg + 180;
    return fromDeg + (short >= 0 ? 180 : -180);
  }
  // Positive lane delta on top/left edges reads clockwise when exiting outward.
  const laneDelta = toLane - fromLane;
  const clockwisePreferred = edge === 'top' || edge === 'left' ? laneDelta > 0 : laneDelta < 0;
  const absShort = Math.abs(short);
  if (absShort > 179) {
    return fromDeg + (clockwisePreferred ? 180 : -180);
  }
  if (short > 0 === clockwisePreferred || absShort < 1) {
    return fromDeg + short;
  }
  // Take the long way so the figure turns with the swirl.
  const long = short > 0 ? short - 360 : short + 360;
  return fromDeg + long;
}

function outwardDelta(facing: MarrakechFacing, depth: number): PercentPos {
  switch (facing) {
    case 'up':
      return { left: 0, top: -depth };
    case 'down':
      return { left: 0, top: depth };
    case 'left':
      return { left: -depth, top: 0 };
    case 'right':
      return { left: depth, top: 0 };
  }
}

/** Point just outside the board along the direction Assam is leaving. */
function exitOutPos(layout: MarrakechBoardLayout, from: MarrakechAssam): PercentPos {
  const c = cellCenter(layout, from.cell);
  const d = outwardDelta(from.facing, layout.cellSize * 0.9);
  return { left: c.left + d.left, top: c.top + d.top };
}

/** Point just outside the board before stepping onto the re-entry cell. */
function entryOutPos(layout: MarrakechBoardLayout, to: MarrakechAssam): PercentPos {
  const c = cellCenter(layout, to.cell);
  // Approach from opposite of landing facing (come in from the mosaic).
  const approachFacing: MarrakechFacing =
    to.facing === 'up'
      ? 'down'
      : to.facing === 'down'
        ? 'up'
        : to.facing === 'left'
          ? 'right'
          : 'left';
  const d = outwardDelta(approachFacing, layout.cellSize * 0.9);
  return { left: c.left + d.left, top: c.top + d.top };
}

function edgeForExitFacing(facing: MarrakechFacing): MarrakechEdge {
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

function laneOnEdge(edge: MarrakechEdge, cell: number): number {
  return edge === 'top' || edge === 'bottom' ? colOf(cell) : rowOf(cell);
}

function pushOutward(edge: MarrakechEdge, pos: PercentPos, amount: number): PercentPos {
  switch (edge) {
    case 'top':
      return { left: pos.left, top: pos.top - amount };
    case 'bottom':
      return { left: pos.left, top: pos.top + amount };
    case 'left':
      return { left: pos.left - amount, top: pos.top };
    case 'right':
      return { left: pos.left + amount, top: pos.top };
  }
}

function tangentDelta(edge: MarrakechEdge, sign: number, amount: number): PercentPos {
  if (edge === 'top' || edge === 'bottom') {
    return { left: sign * amount, top: 0 };
  }
  return { left: 0, top: sign * amount };
}

/**
 * True when this step leaves the board (swirl) or bounces — not a plain adjacent move.
 */
export function isAssamSwirlStep(from: MarrakechAssam, to: MarrakechAssam): boolean {
  if (from.cell === to.cell) return true;
  if (from.facing !== to.facing) return true;
  const manhattan =
    Math.abs(rowOf(from.cell) - rowOf(to.cell)) + Math.abs(colOf(from.cell) - colOf(to.cell));
  return manhattan !== 1;
}

function swirlArcPoints(
  layout: MarrakechBoardLayout,
  from: MarrakechAssam,
  to: MarrakechAssam,
  startRotate: number,
): AssamWayPoint[] {
  const edge = edgeForExitFacing(from.facing);
  const fromLane = laneOnEdge(edge, from.cell);
  const toLane = laneOnEdge(edge, to.cell);
  const exitCell = cellCenter(layout, from.cell);
  const enterCell = cellCenter(layout, to.cell);
  const outA = exitOutPos(layout, from);
  const outB = entryOutPos(layout, to);
  const endRotate = swirlRotate(startRotate, to.facing, edge, fromLane, toLane);
  const midRotate = startRotate + (endRotate - startRotate) / 2;
  const bulge = layout.cellSize * 0.55;

  const points: AssamWayPoint[] = [
    { ...exitCell, rotate: startRotate, kind: 'cell' },
    { ...outA, rotate: startRotate, kind: 'swirl' },
  ];

  if (fromLane === toLane) {
    // U-turn loop on the mosaic.
    const sign = endRotate >= startRotate ? 1 : -1;
    const t = tangentDelta(edge, sign, layout.cellSize * 0.7);
    const apex = pushOutward(edge, { left: outA.left + t.left, top: outA.top + t.top }, bulge);
    points.push({ ...apex, rotate: midRotate, kind: 'swirl' });
  } else {
    const mid = pushOutward(
      edge,
      { left: (outA.left + outB.left) / 2, top: (outA.top + outB.top) / 2 },
      bulge,
    );
    // Extra samples for long slides so the path reads as a curve, not a chord.
    if (Math.abs(fromLane - toLane) >= 2) {
      const q1 = pushOutward(
        edge,
        {
          left: outA.left * 0.66 + mid.left * 0.34,
          top: outA.top * 0.66 + mid.top * 0.34,
        },
        bulge * 0.25,
      );
      const q3 = pushOutward(
        edge,
        {
          left: mid.left * 0.34 + outB.left * 0.66,
          top: mid.top * 0.34 + outB.top * 0.66,
        },
        bulge * 0.25,
      );
      const r1 = startRotate + (endRotate - startRotate) * 0.33;
      const r2 = startRotate + (endRotate - startRotate) * 0.66;
      points.push({ ...q1, rotate: r1, kind: 'swirl' });
      points.push({ ...mid, rotate: midRotate, kind: 'swirl' });
      points.push({ ...q3, rotate: r2, kind: 'swirl' });
    } else {
      points.push({ ...mid, rotate: midRotate, kind: 'swirl' });
    }
  }

  points.push({ ...outB, rotate: endRotate, kind: 'swirl' });
  points.push({ ...enterCell, rotate: endRotate, kind: 'cell' });
  return points;
}

/**
 * Expand a rules move into visual segments (straight steps + swirl arcs).
 * `from` is Assam *before* the move; `steps` is the die face.
 */
export function buildAssamMotionSegments(
  from: MarrakechAssam,
  steps: number,
  layout: MarrakechBoardLayout,
  swirls: Record<MarrakechEdge, MarrakechExit[]> = MARRAKECH_SWIRLS,
): AssamMotionSegment[] {
  const segments: AssamMotionSegment[] = [];
  let cur = from;
  let rotate = ASSAM_FACING_DEG[from.facing];

  for (let i = 0; i < steps; i++) {
    const next = stepAssam(cur, swirls);
    if (isAssamSwirlStep(cur, next)) {
      const points = swirlArcPoints(layout, cur, next, rotate);
      rotate = points[points.length - 1]!.rotate;
      segments.push({ points, duration: ASSAM_SWIRL_DURATION });
    } else {
      const a = cellCenter(layout, cur.cell);
      const b = cellCenter(layout, next.cell);
      rotate = shortestRotate(rotate, next.facing);
      segments.push({
        points: [
          { ...a, rotate, kind: 'cell' },
          { ...b, rotate, kind: 'cell' },
        ],
        duration: ASSAM_STEP_DURATION,
      });
    }
    cur = next;
  }

  return segments;
}

export function buildAssamMotionPath(
  from: MarrakechAssam,
  steps: number,
  layout: MarrakechBoardLayout,
  swirls: Record<MarrakechEdge, MarrakechExit[]> = MARRAKECH_SWIRLS,
): AssamWayPoint[] {
  const segments = buildAssamMotionSegments(from, steps, layout, swirls);
  const path: AssamWayPoint[] = [];
  for (const seg of segments) {
    for (const p of seg.points) {
      const prev = path[path.length - 1];
      if (prev && prev.left === p.left && prev.top === p.top && prev.rotate === p.rotate) continue;
      path.push(p);
    }
  }
  return path;
}

export function motionPathDuration(segments: AssamMotionSegment[]): number {
  return segments.reduce((sum, s) => sum + s.duration, 0);
}

/** Verify server destination matches a local walk (guards against desync snaps). */
export function assamMoveMatches(
  from: MarrakechAssam,
  steps: number,
  to: MarrakechAssam,
  swirls: Record<MarrakechEdge, MarrakechExit[]> = MARRAKECH_SWIRLS,
): boolean {
  const predicted = moveAssam(from, steps, swirls);
  return predicted.cell === to.cell && predicted.facing === to.facing;
}
