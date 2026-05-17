import type { CupTheCrabCard, CupTheCrabCupValue } from 'shared';
import { imageMap } from '../../imageMap';

const { cupTheCrab } = imageMap;

export function cupTheCrabCardImage(card: CupTheCrabCard): string {
  switch (card.kind) {
    case 'cup':
      return cupTheCrab.cups[card.value as CupTheCrabCupValue];
    case 'crab':
      return cupTheCrab.crab;
    case 'bottle':
      return cupTheCrab.bottle;
    case 'octopus':
      return cupTheCrab.octopus;
  }
}

export const CUP_THE_CRAB_CARD_BACK = cupTheCrab.cardBack;
