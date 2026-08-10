import { HUES_AND_CUES_COLS, HUES_AND_CUES_ROWS } from 'shared';

/** ช่องอยู่ในพื้นที่ให้คะแนน (Chebyshev ≤ 2 จากเป้าหมาย) */
export function huesInChebyshevFootprint(
  tc: number,
  tr: number,
  col: number,
  row: number,
): boolean {
  if (col < 0 || col >= HUES_AND_CUES_COLS || row < 0 || row >= HUES_AND_CUES_ROWS) {
    return false;
  }
  return Math.max(Math.abs(col - tc), Math.abs(row - tr)) <= 2;
}

/** เส้นขอบรอบ footprint — inset box-shadow เฉพาะด้านที่ติดช่องนอก footprint (ไม่ทาสีทับ) */
export function huesScoreFootprintEdgeShadow(
  tc: number,
  tr: number,
  col: number,
  row: number,
): string | undefined {
  if (!huesInChebyshevFootprint(tc, tr, col, row)) return undefined;
  const parts: string[] = [];
  if (!huesInChebyshevFootprint(tc, tr, col, row - 1)) {
    parts.push('inset 0 2px 0 0 rgb(255 255 255 / 0.25)');
  }
  if (!huesInChebyshevFootprint(tc, tr, col + 1, row)) {
    parts.push('inset -2px 0 0 0 rgb(255 255 255 / 0.25)');
  }
  if (!huesInChebyshevFootprint(tc, tr, col, row + 1)) {
    parts.push('inset 0 -2px 0 0 rgb(255 255 255 / 0.25)');
  }
  if (!huesInChebyshevFootprint(tc, tr, col - 1, row)) {
    parts.push('inset 2px 0 0 0 rgb(255 255 255 / 0.25)');
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

export type MarkersMap = Map<string, { id: string; round: 1 | 2 }[]>;
