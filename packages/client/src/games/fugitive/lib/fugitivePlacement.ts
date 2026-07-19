import { totalSprintValue, validateHideoutPlacement } from 'shared';

export const FUGITIVE_DROP_HIDEOUT = 'fugitive-drop-hideout';
export const FUGITIVE_DROP_SPRINT = 'fugitive-drop-sprint';
export const FUGITIVE_HAND_DRAG_PREFIX = 'hand';

export type StagingState = {
  hideout: number | null;
  sprints: number[];
};

export function parseHandDragCardId(activeId: string): number | null {
  const prefix = `${FUGITIVE_HAND_DRAG_PREFIX}-card-`;
  if (!activeId.startsWith(prefix)) return null;
  const n = Number(activeId.slice(prefix.length));
  return Number.isNaN(n) ? null : n;
}

export function handCardId(card: number): string {
  return `card-${card}`;
}

export function cardsInStaging(staging: StagingState): Set<number> {
  const s = new Set<number>();
  if (staging.hideout !== null) s.add(staging.hideout);
  for (const c of staging.sprints) s.add(c);
  return s;
}

export function filterHandForDisplay(hand: readonly number[], staging: StagingState): number[] {
  const staged = cardsInStaging(staging);
  return hand.filter((c) => !staged.has(c));
}

export function reachableRange(prevValue: number, sprintCards: readonly number[]) {
  const sprintProvided = totalSprintValue(sprintCards);
  return {
    min: prevValue + 1,
    max: prevValue + 3 + sprintProvided,
    sprintProvided,
  };
}

export function tryStageHideout(prevValue: number, card: number, sprints: readonly number[]) {
  return validateHideoutPlacement(prevValue, card, sprints);
}

export function isCardAvailableFromHand(
  card: number,
  hand: readonly number[],
  staging: StagingState,
): boolean {
  if (staging.hideout === card) return true;
  if (staging.sprints.includes(card)) return false;
  const staged = cardsInStaging(staging);
  return hand.includes(card) && !staged.has(card);
}

export function applyStageHideout(staging: StagingState, card: number): StagingState {
  const sprints = staging.sprints.filter((c) => c !== card);
  return { hideout: card, sprints };
}

export function applyStageSprint(staging: StagingState, card: number): StagingState | null {
  if (staging.sprints.includes(card)) return null;
  if (staging.hideout === card) {
    return { hideout: null, sprints: [...staging.sprints, card] };
  }
  return { hideout: staging.hideout, sprints: [...staging.sprints, card] };
}

export function removeFromStaging(staging: StagingState, card: number): StagingState {
  if (staging.hideout === card) {
    return { hideout: null, sprints: staging.sprints };
  }
  return {
    hideout: staging.hideout,
    sprints: staging.sprints.filter((c) => c !== card),
  };
}

export function emptyStaging(): StagingState {
  return { hideout: null, sprints: [] };
}

export function formatReachableLabel(prevValue: number, sprintCards: readonly number[]): string {
  const { min, max, sprintProvided } = reachableRange(prevValue, sprintCards);
  const base = `จาก ${prevValue} ไปได้ ${min}–${max}`;
  if (sprintProvided === 0) return base;
  return `${base} · Sprint +${sprintProvided}`;
}
