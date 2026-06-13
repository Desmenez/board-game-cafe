import type { CamelUpDesertEffect } from 'shared';

export const CAMEL_UP_DESERT_DRAG_PREFIX = 'camel-up-desert-';
export const CAMEL_UP_DESERT_DROP_PREFIX = 'camel-up-desert-drop-';

export function desertDragId(effect: CamelUpDesertEffect): string {
  return `${CAMEL_UP_DESERT_DRAG_PREFIX}${effect}`;
}

export function parseDesertDragId(id: string): CamelUpDesertEffect | null {
  if (id === desertDragId('oasis')) return 'oasis';
  if (id === desertDragId('mirage')) return 'mirage';
  return null;
}

export function desertDropZoneId(space: number): string {
  return `${CAMEL_UP_DESERT_DROP_PREFIX}${space}`;
}

export function parseDesertDropZoneId(id: string): number | null {
  if (!id.startsWith(CAMEL_UP_DESERT_DROP_PREFIX)) return null;
  const space = Number(id.slice(CAMEL_UP_DESERT_DROP_PREFIX.length));
  if (!Number.isInteger(space) || space < 1) return null;
  return space;
}
