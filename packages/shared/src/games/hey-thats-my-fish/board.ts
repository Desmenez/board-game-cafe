import { HEY_THATS_MY_FISH_ROW_WIDTHS, type HeyThatsMyFishHex } from './types.js';

export type HeyThatsMyFishCell = {
  id: number;
  row: number;
  column: number;
  rowLength: number;
  /** Horizontal coordinate in half-column units (pointy-top hex). */
  q2: number;
};

const neighborOffsets = [
  { row: 0, q2: -2 },
  { row: 0, q2: 2 },
  { row: -1, q2: -1 },
  { row: -1, q2: 1 },
  { row: 1, q2: -1 },
  { row: 1, q2: 1 },
] as const;

export type HeyThatsMyFishDirection = (typeof neighborOffsets)[number];

export const HEY_THATS_MY_FISH_DIRECTIONS: readonly HeyThatsMyFishDirection[] = neighborOffsets;

export const HEY_THATS_MY_FISH_CELLS: HeyThatsMyFishCell[] = HEY_THATS_MY_FISH_ROW_WIDTHS.flatMap(
  (rowLength, row) =>
    Array.from({ length: rowLength }, (_, column) => ({
      id:
        HEY_THATS_MY_FISH_ROW_WIDTHS.slice(0, row).reduce((total, width) => total + width, 0) +
        column,
      row,
      column,
      rowLength,
      q2: 2 * column - (rowLength - 1),
    })),
);

const cellByCoord = new Map(
  HEY_THATS_MY_FISH_CELLS.map((cell) => [`${cell.row}:${cell.q2}`, cell] as const),
);

const cellById = new Map(HEY_THATS_MY_FISH_CELLS.map((cell) => [cell.id, cell] as const));

export function heyThatsMyFishCell(id: number): HeyThatsMyFishCell | undefined {
  return cellById.get(id);
}

export function heyThatsMyFishNeighbor(
  cell: HeyThatsMyFishCell,
  direction: HeyThatsMyFishDirection,
): HeyThatsMyFishCell | undefined {
  return cellByCoord.get(`${cell.row + direction.row}:${cell.q2 + direction.q2}`);
}

function isBlockedHex(hex: HeyThatsMyFishHex | undefined): boolean {
  return !hex || hex.fish === 0 || hex.penguinId != null;
}

/**
 * Straight-line destinations in one hex direction. Stops before water, any penguin,
 * or the board edge. Distance is always ≥ 1.
 */
export function heyThatsMyFishRay(
  fromHexId: number,
  direction: HeyThatsMyFishDirection,
  hexes: readonly HeyThatsMyFishHex[],
): number[] {
  const origin = cellById.get(fromHexId);
  if (!origin) return [];
  const dest: number[] = [];
  let current = origin;
  while (true) {
    const next = heyThatsMyFishNeighbor(current, direction);
    if (!next) break;
    if (isBlockedHex(hexes[next.id])) break;
    dest.push(next.id);
    current = next;
  }
  return dest;
}

export function heyThatsMyFishLegalDestinations(
  fromHexId: number,
  hexes: readonly HeyThatsMyFishHex[],
): number[] {
  return HEY_THATS_MY_FISH_DIRECTIONS.flatMap((direction) =>
    heyThatsMyFishRay(fromHexId, direction, hexes),
  );
}

export function heyThatsMyFishLegalPlaceHexIds(hexes: readonly HeyThatsMyFishHex[]): number[] {
  return hexes.filter((hex) => hex.fish === 1 && hex.penguinId == null).map((hex) => hex.id);
}
