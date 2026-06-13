import type { CamelUpColor } from 'shared';
import { CAMEL_UP_COLORS } from 'shared';

export const CAMEL_UP_LEG_BET_DRAG_PREFIX = 'leg-bet-';
export const CAMEL_UP_LEG_HAND_DROP_ID = 'camel-up-leg-hand-drop';

export function legBetDragId(color: CamelUpColor): string {
  return `${CAMEL_UP_LEG_BET_DRAG_PREFIX}${color}`;
}

export function parseLegBetDragId(id: string): CamelUpColor | null {
  if (!id.startsWith(CAMEL_UP_LEG_BET_DRAG_PREFIX)) return null;
  const color = id.slice(CAMEL_UP_LEG_BET_DRAG_PREFIX.length) as CamelUpColor;
  return CAMEL_UP_COLORS.includes(color) ? color : null;
}

export type CamelUpLegBetHandCard = {
  id: 'my-leg-bet';
  color: CamelUpColor;
  value: number;
};
