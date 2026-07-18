import type { CamelUpAction, CamelUpColor } from 'shared';

export function hasActionType(actions: CamelUpAction[], type: CamelUpAction['type']): boolean {
  return actions.some((a) => a.type === type);
}

export function spacesForDesert(actions: CamelUpAction[]): number[] {
  const spaces = new Set<number>();
  for (const a of actions) {
    if (a.type === 'place-desert-tile') spaces.add(a.space);
  }
  return [...spaces].sort((a, b) => a - b);
}

export function colorsForActionType(
  actions: CamelUpAction[],
  type: 'bet-overall-winner' | 'bet-overall-loser',
): CamelUpColor[] {
  return actions.filter((a) => a.type === type).map((a) => (a as { color: CamelUpColor }).color);
}
