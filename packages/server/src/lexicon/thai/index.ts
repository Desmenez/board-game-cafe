import { UNDERCOVER_CATEGORIES } from 'shared';
import { INSIDER_CATEGORY_LABELS, INSIDER_WORD_ROWS } from './insider-data.js';
import { UNDERCOVER_WORD_POOLS } from './undercover-pools.js';
import { flattenWords, pickOneWord, pickTwoWords } from './pick.js';
import type { ThaiWordCategory } from './types.js';

export type { PickedWord, PickedWordPair, ThaiWordCategory } from './types.js';
export { flattenWords, pickOneWord, pickTwoWords } from './pick.js';
export { INSIDER_CATEGORY_LABELS, INSIDER_WORD_ROWS } from './insider-data.js';
export { UNDERCOVER_WORD_POOLS } from './undercover-pools.js';

function assertInsiderShape(): void {
  if (INSIDER_CATEGORY_LABELS.length !== INSIDER_WORD_ROWS.length) {
    throw new Error(
      `insider deck: labels ${INSIDER_CATEGORY_LABELS.length} !== rows ${INSIDER_WORD_ROWS.length}`,
    );
  }
  for (let i = 0; i < INSIDER_WORD_ROWS.length; i += 1) {
    const row = INSIDER_WORD_ROWS[i]!;
    if (row.length !== 10) {
      throw new Error(`insider deck: row ${i} has ${row.length} words (expected 10)`);
    }
  }
}

assertInsiderShape();

/** Insider: 100 fine-grained Thai subcategories. */
export const INSIDER_THAI_CATEGORIES: readonly ThaiWordCategory[] = INSIDER_CATEGORY_LABELS.map(
  (label, i) => ({
    id: `cat-${String(i).padStart(3, '0')}`,
    label,
    words: INSIDER_WORD_ROWS[i]!,
  }),
);

function assertUndercoverPools(): void {
  for (const cat of UNDERCOVER_CATEGORIES) {
    const words = UNDERCOVER_WORD_POOLS[cat.id];
    if (!words || words.length < 2) {
      throw new Error(
        `undercover pool: category ${cat.id} needs at least 2 words (got ${words?.length ?? 0})`,
      );
    }
  }
}

assertUndercoverPools();

/** Undercover: 19 broad categories with word pools. */
export const UNDERCOVER_THAI_CATEGORIES: readonly ThaiWordCategory[] = UNDERCOVER_CATEGORIES.map(
  (c) => ({
    id: c.id,
    label: c.label,
    words: UNDERCOVER_WORD_POOLS[c.id]!,
  }),
);

export function pickInsiderWord(): { category: ThaiWordCategory; word: string } {
  return pickOneWord(INSIDER_THAI_CATEGORIES, 'random');
}

export function pickUndercoverWords(categoryId: string): {
  categoryId: string;
  categoryLabel: string;
  civilianWord: string;
  undercoverWord: string;
} {
  const { category, wordA, wordB } = pickTwoWords(UNDERCOVER_THAI_CATEGORIES, categoryId);
  const swap = Math.random() < 0.5;
  return {
    categoryId: category.id,
    categoryLabel: category.label,
    civilianWord: swap ? wordB : wordA,
    undercoverWord: swap ? wordA : wordB,
  };
}

/** All unique undercover words (for diagnostics / future use). */
export function allUndercoverWords(): string[] {
  return flattenWords(UNDERCOVER_THAI_CATEGORIES);
}
