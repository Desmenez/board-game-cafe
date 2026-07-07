import {
  categoryLabelForId,
  filterWordPairs,
  pickWordPairFromPool,
  type UndercoverDifficulty,
  type UndercoverWordPair,
} from 'shared';
import { UNDERCOVER_WORD_PAIRS } from './deck-data.js';

export function pickWordPair(
  categoryId: string,
  difficulty: UndercoverDifficulty,
): UndercoverWordPair {
  return pickWordPairFromPool([...UNDERCOVER_WORD_PAIRS], categoryId, difficulty);
}

export function getPairsForCategory(categoryId: string): UndercoverWordPair[] {
  return filterWordPairs([...UNDERCOVER_WORD_PAIRS], categoryId, 'normal');
}

export function getCategoryLabel(categoryId: string): string {
  return categoryLabelForId(categoryId);
}

export { UNDERCOVER_WORD_PAIRS };
