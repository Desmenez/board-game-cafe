import type { PickedWord, PickedWordPair, ThaiWordCategory } from './types.js';

function pickIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function resolveCategory(
  categories: readonly ThaiWordCategory[],
  categoryId: string | 'random',
): ThaiWordCategory {
  if (categories.length === 0) {
    throw new Error('thai lexicon: no categories');
  }
  if (categoryId === 'random') {
    return categories[pickIndex(categories.length)]!;
  }
  const found = categories.find((c) => c.id === categoryId);
  if (found && found.words.length > 0) return found;
  // Fall back to a random category with enough words
  const usable = categories.filter((c) => c.words.length > 0);
  if (usable.length === 0) throw new Error('thai lexicon: no usable categories');
  return usable[pickIndex(usable.length)]!;
}

/** Pick one word from a category (or a random category). */
export function pickOneWord(
  categories: readonly ThaiWordCategory[],
  categoryId: string | 'random' = 'random',
): PickedWord {
  const category = resolveCategory(categories, categoryId);
  if (category.words.length === 0) {
    throw new Error(`thai lexicon: category ${category.id} has no words`);
  }
  const word = category.words[pickIndex(category.words.length)]!;
  return { category, word };
}

/** Pick two distinct words from the same category. */
export function pickTwoWords(
  categories: readonly ThaiWordCategory[],
  categoryId: string | 'random' = 'random',
): PickedWordPair {
  let category = resolveCategory(categories, categoryId);
  // Need at least 2 words; if not, try another category
  if (category.words.length < 2) {
    const usable = categories.filter((c) => c.words.length >= 2);
    if (usable.length === 0) {
      throw new Error('thai lexicon: no category with at least 2 words');
    }
    category = usable[pickIndex(usable.length)]!;
  }
  const i = pickIndex(category.words.length);
  let j = pickIndex(category.words.length - 1);
  if (j >= i) j += 1;
  return {
    category,
    wordA: category.words[i]!,
    wordB: category.words[j]!,
  };
}

/** Flatten all words across categories (deduped, NFC). */
export function flattenWords(categories: readonly ThaiWordCategory[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    for (const w of cat.words) {
      const key = w.normalize('NFC');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(w);
    }
  }
  return out;
}
