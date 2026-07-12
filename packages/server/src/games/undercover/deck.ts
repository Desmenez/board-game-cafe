import { categoryLabelForId } from 'shared';
import { pickUndercoverWords, UNDERCOVER_WORD_POOLS } from '../../lexicon/thai/index.js';

export function pickWordPair(categoryId: string): {
  categoryId: string;
  categoryLabel: string;
  civilian: string;
  undercover: string;
} {
  const picked = pickUndercoverWords(categoryId);
  return {
    categoryId: picked.categoryId,
    categoryLabel: picked.categoryLabel,
    civilian: picked.civilianWord,
    undercover: picked.undercoverWord,
  };
}

export function getWordsForCategory(categoryId: string): readonly string[] {
  if (categoryId === 'random') {
    return Object.values(UNDERCOVER_WORD_POOLS).flat();
  }
  return UNDERCOVER_WORD_POOLS[categoryId] ?? [];
}

export function getCategoryLabel(categoryId: string): string {
  return categoryLabelForId(categoryId);
}

export { UNDERCOVER_WORD_POOLS };
