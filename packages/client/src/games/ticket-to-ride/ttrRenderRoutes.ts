import { TTR_ROUTES, type TtrRouteDef } from 'shared';

/** Map-space (0–100) gap between centerlines of parallel tracks (double routes). */
const PARALLEL_OFFSET_STEP = 1.5;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

/** Unit normal (left of direction A→B) for offsetting parallel routes. */
function lineUnitNormal(ax: number, ay: number, bx: number, by: number): { nx: number; ny: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-9;
  return { nx: -dy / len, ny: dx / len };
}

/**
 * For each route id, return segment endpoints with perpendicular spread so double/triple
 * tracks between the same two cities do not share one line in the SVG.
 */
function buildTtrRenderDefById(): ReadonlyMap<string, TtrRouteDef> {
  const byPair = new Map<string, TtrRouteDef[]>();
  for (const r of TTR_ROUTES) {
    const k = pairKey(r.a, r.b);
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k)!.push(r);
  }
  for (const arr of byPair.values()) {
    arr.sort((a, b) => a.id.localeCompare(b.id));
  }
  const out = new Map<string, TtrRouteDef>();
  for (const group of byPair.values()) {
    const n = group.length;
    const meanAx = group.reduce((s, r) => s + r.ax, 0) / n;
    const meanAy = group.reduce((s, r) => s + r.ay, 0) / n;
    const meanBx = group.reduce((s, r) => s + r.bx, 0) / n;
    const meanBy = group.reduce((s, r) => s + r.by, 0) / n;
    const { nx, ny } = lineUnitNormal(meanAx, meanAy, meanBx, meanBy);
    group.forEach((r, i) => {
      const t = n <= 1 ? 0 : (i - (n - 1) / 2) * PARALLEL_OFFSET_STEP;
      out.set(r.id, {
        ...r,
        ax: meanAx + nx * t,
        ay: meanAy + ny * t,
        bx: meanBx + nx * t,
        by: meanBy + ny * t,
      });
    });
  }
  return out;
}

export const TTR_RENDER_BY_ID: ReadonlyMap<string, TtrRouteDef> = buildTtrRenderDefById();

export function ttrRenderDefForRouteId(routeId: string, fallback: TtrRouteDef): TtrRouteDef {
  return TTR_RENDER_BY_ID.get(routeId) ?? fallback;
}
