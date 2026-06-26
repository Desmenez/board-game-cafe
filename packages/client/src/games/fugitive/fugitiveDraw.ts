import type { FugitiveDrawPile } from 'shared';

export const FUGITIVE_DROP_HAND = 'fugitive-drop-hand';
export const FUGITIVE_PILE_DRAG_PREFIX = 'fugitive-pile';

export function pileDragId(pile: FugitiveDrawPile): string {
  return `${FUGITIVE_PILE_DRAG_PREFIX}-${pile}`;
}

export function parsePileDragId(id: string): FugitiveDrawPile | null {
  const prefix = `${FUGITIVE_PILE_DRAG_PREFIX}-`;
  if (!id.startsWith(prefix)) return null;
  const pile = id.slice(prefix.length);
  if (pile === 'pile1' || pile === 'pile2' || pile === 'pile3') return pile;
  return null;
}
