import type { TtrMapDefinition, TtrRouteDef } from 'shared';
import { ttrMapIndex } from 'shared';

/** Position on the board art: `left` is % of board width, `top` is % of board height. */
export type TtrPoint = { left: number; top: number };

export type TtrRouteLayout = {
  /** Bend points the track passes through, in board %. */
  waypoints?: TtrPoint[];
  /**
   * Perpendicular shift of the whole track, in % of board width.
   * Omitted routes fall back to an even spread across their parallel group.
   */
  offset?: number;
  /** Overrides for tracks whose printed cars are unusually long/short. */
  slotLength?: number;
  slotWidth?: number;
};

export type TtrBoardLayout = {
  /** Board art width / height. */
  aspectRatio: number;
  /**
   * Multiplier for city dots, car slots, gaps, and parallel spacing.
   * Portrait boards (e.g. India) need >1 so overlays stay readable when height-fitted.
   * Default 1.
   */
  overlayScale?: number;
  /** City dot diameter, % of board width (before overlayScale). */
  citySize: number;
  slot: {
    /** Preferred car length, % of board width. */
    length: number;
    /** Car thickness, % of board width. */
    width: number;
    /** Space between cars, % of board width. */
    gap: number;
    /** Space kept clear at each city end, % of board width. */
    endPad: number;
  };
  /** Distance between the centrelines of parallel tracks, % of board width. */
  parallelSpacing: number;
  cities: Record<string, TtrPoint>;
  routes: Record<string, TtrRouteLayout>;
};

/** Effective overlay multiplier (portrait maps bump this so cars stay readable). */
export function ttrLayoutOverlayScale(layout: TtrBoardLayout): number {
  return layout.overlayScale ?? 1;
}

/** One printed train-car cell. `left`/`top` are board %, sizes are % of board width. */
export type TtrRouteSlot = {
  left: number;
  top: number;
  angleDeg: number;
  length: number;
  width: number;
};

export type TtrBoardGeometry = {
  cityPoints: Record<string, TtrPoint>;
  slotsByRouteId: Record<string, TtrRouteSlot[]>;
};

const MIN_SLOT_LENGTH = 0.35;
const FALLBACK_POINT: TtrPoint = { left: 50, top: 50 };

/**
 * Board % is anisotropic (`left` over width, `top` over height), so all geometry runs in
 * "width units" where both axes are % of board width. Angles and lengths are then visual.
 */
type Unit = { x: number; y: number };

function toUnit(p: TtrPoint, aspectRatio: number): Unit {
  return { x: p.left, y: p.top / aspectRatio };
}

function toPoint(u: Unit, aspectRatio: number): TtrPoint {
  return { left: u.x, top: u.y * aspectRatio };
}

function normalOf(from: Unit, to: Unit): Unit {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1e-9;
  return { x: -dy / len, y: dx / len };
}

function polylineLengths(points: Unit[]): { segment: number[]; total: number } {
  const segment: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
    segment.push(d);
    total += d;
  }
  return { segment, total };
}

function sampleAt(
  points: Unit[],
  segment: number[],
  distance: number,
): { at: Unit; angleDeg: number } {
  let remaining = Math.max(0, distance);
  for (let i = 0; i < segment.length; i += 1) {
    const segLen = segment[i]!;
    if (remaining <= segLen || i === segment.length - 1) {
      const a = points[i]!;
      const b = points[i + 1]!;
      const t = segLen <= 1e-9 ? 0 : Math.min(1, remaining / segLen);
      return {
        at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        angleDeg: Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI),
      };
    }
    remaining -= segLen;
  }
  return { at: points[0] ?? { x: 0, y: 0 }, angleDeg: 0 };
}

function cityPoint(layout: TtrBoardLayout, cityId: string): TtrPoint {
  return layout.cities[cityId] ?? FALLBACK_POINT;
}

/**
 * Even spread for parallel tracks, so a fresh layout never stacks double routes
 * on one line before anyone tunes it.
 */
function autoOffsets(map: TtrMapDefinition, layout: TtrBoardLayout): Record<string, number> {
  const out: Record<string, number> = {};
  const spacing = layout.parallelSpacing * ttrLayoutOverlayScale(layout);
  for (const routeIds of Object.values(ttrMapIndex(map).routeIdsByGroup)) {
    const n = routeIds.length;
    routeIds.forEach((id, i) => {
      out[id] = n <= 1 ? 0 : (i - (n - 1) / 2) * spacing;
    });
  }
  return out;
}

export function routeSlots(
  layout: TtrBoardLayout,
  route: TtrRouteDef,
  offset: number,
): TtrRouteSlot[] {
  const aspect = layout.aspectRatio;
  const scale = ttrLayoutOverlayScale(layout);
  const routeLayout = layout.routes[route.id];
  const raw: TtrPoint[] = [
    cityPoint(layout, route.a),
    ...(routeLayout?.waypoints ?? []),
    cityPoint(layout, route.b),
  ];
  const points = raw.map((p) => toUnit(p, aspect));
  const shift = routeLayout?.offset ?? offset;
  if (shift !== 0 && points.length >= 2) {
    const n = normalOf(points[0]!, points[points.length - 1]!);
    for (const p of points) {
      p.x += n.x * shift;
      p.y += n.y * shift;
    }
  }

  const { segment, total } = polylineLengths(points);
  const count = Math.max(1, route.length);
  const maxLength = (routeLayout?.slotLength ?? layout.slot.length) * scale;
  const width = (routeLayout?.slotWidth ?? layout.slot.width) * scale;
  const gap = layout.slot.gap * scale;

  // Short city pairs cannot afford the full end padding, or their cars collapse to slivers.
  const endPad = Math.min(layout.slot.endPad * scale, total * 0.15);
  const span = Math.max(0, total - endPad * 2);
  const fitted = (span - gap * (count - 1)) / count;
  const length = Math.max(MIN_SLOT_LENGTH, Math.min(maxLength, fitted));
  const used = length * count + gap * (count - 1);
  const start = (total - used) / 2 + length / 2;
  const step = length + gap;

  const slots: TtrRouteSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    const { at, angleDeg } = sampleAt(points, segment, start + step * i);
    const p = toPoint(at, aspect);
    slots.push({ left: p.left, top: p.top, angleDeg, length, width });
  }
  return slots;
}

export function buildTtrBoardGeometry(
  map: TtrMapDefinition,
  layout: TtrBoardLayout,
): TtrBoardGeometry {
  const offsets = autoOffsets(map, layout);
  const cityPoints: Record<string, TtrPoint> = {};
  for (const city of map.cities) cityPoints[city.id] = cityPoint(layout, city.id);
  const slotsByRouteId: Record<string, TtrRouteSlot[]> = {};
  for (const route of map.routes) {
    slotsByRouteId[route.id] = routeSlots(layout, route, offsets[route.id] ?? 0);
  }
  return { cityPoints, slotsByRouteId };
}

/** Midpoint of a route's cars — anchor for owner badges and ticket highlights. */
export function routeMidpoint(slots: TtrRouteSlot[]): TtrPoint {
  if (slots.length === 0) return FALLBACK_POINT;
  const mid = slots[Math.floor((slots.length - 1) / 2)]!;
  if (slots.length % 2 === 1) return { left: mid.left, top: mid.top };
  const next = slots[Math.floor(slots.length / 2)]!;
  return { left: (mid.left + next.left) / 2, top: (mid.top + next.top) / 2 };
}
