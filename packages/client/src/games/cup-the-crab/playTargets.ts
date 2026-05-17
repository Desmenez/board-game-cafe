import type { CupTheCrabCard, CupTheCrabPlayerView, CupTheCrabStack } from 'shared';

export type PlayColumnSlot =
  | { type: 'stack'; stack: CupTheCrabStack }
  | { type: 'empty'; dropId: string };

export function buildPlayColumns(gameState: CupTheCrabPlayerView): PlayColumnSlot[] {
  const slots: PlayColumnSlot[] = gameState.stacks.map((stack) => ({ type: 'stack', stack }));
  let emptyIndex = 0;
  while (slots.length < gameState.maxStacks) {
    slots.push({ type: 'empty', dropId: `ctc-empty-${emptyIndex}` });
    emptyIndex += 1;
  }
  return slots;
}

export function stackHasBottle(stack: CupTheCrabStack): boolean {
  return stack.hasBottle || stack.cards.some((c) => c.kind === 'bottle');
}

/** Split table stack into cup pile vs action cards (chronological within each). */
export function partitionStackCards(cards: CupTheCrabCard[]): {
  cups: CupTheCrabCard[];
  specials: CupTheCrabCard[];
} {
  const cups: CupTheCrabCard[] = [];
  const specials: CupTheCrabCard[] = [];
  for (const card of cards) {
    if (card.kind === 'cup') cups.push(card);
    else specials.push(card);
  }
  return { cups, specials };
}

/** Cup point total currently on this table stack (non-cup cards count as 0). */
export function stackCupPoints(stack: CupTheCrabStack): number {
  return stack.cards
    .filter((c) => c.kind === 'cup')
    .reduce((sum, c) => sum + (c.value ?? 0), 0);
}

export function canPlayOnStack(card: CupTheCrabCard, stack: CupTheCrabStack): boolean {
  const bottled = stackHasBottle(stack);
  switch (card.kind) {
    case 'cup':
    case 'bottle':
    case 'crab':
      return !bottled;
    case 'octopus':
      return bottled;
    default:
      return false;
  }
}

/** True if any card in the hand has at least one legal play target. */
export function hasLegalPlay(gameState: CupTheCrabPlayerView, cards: CupTheCrabCard[]): boolean {
  return cards.some((card) => legalPlayDropIds(gameState, card).size > 0);
}

/** Droppable ids legal for this card (matches server rules). */
export function legalPlayDropIds(gameState: CupTheCrabPlayerView, card: CupTheCrabCard): Set<string> {
  const ids = new Set<string>();
  const canNew =
    (card.kind === 'cup' || card.kind === 'bottle') &&
    gameState.stacks.length < gameState.maxStacks;

  if (canNew) {
    for (let i = 0; i < gameState.maxStacks - gameState.stacks.length; i += 1) {
      ids.add(`ctc-empty-${i}`);
    }
  }

  for (const stack of gameState.stacks) {
    if (canPlayOnStack(card, stack)) {
      ids.add(`ctc-stack-${stack.id}`);
    }
  }

  return ids;
}
