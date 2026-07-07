import type { UndercoverDifficulty, UndercoverWordPair } from './types/undercover.js';
import { UNDERCOVER_CATEGORIES } from './types/undercover.js';

/** Normalize Thai/English guess text for comparison. */
export function normalizeUndercoverGuess(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
}

/** Check if guess matches civilian word or variants. */
export function isCivilianWordGuess(
  guess: string,
  civilian: string,
  variants: string[] = [],
): boolean {
  const g = normalizeUndercoverGuess(guess);
  if (!g) return false;
  const targets = [civilian, ...variants].map(normalizeUndercoverGuess);
  return targets.includes(g);
}

export function categoryLabelForId(categoryId: string): string {
  if (categoryId === 'random') return 'สุ่มหมวด';
  return UNDERCOVER_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function filterWordPairs(
  pairs: readonly UndercoverWordPair[],
  categoryId: string,
  difficulty: UndercoverDifficulty,
): UndercoverWordPair[] {
  let pool = [...pairs];
  if (categoryId !== 'random') {
    pool = pool.filter((p) => p.categoryId === categoryId);
  }
  if (difficulty !== 'normal') {
    const byDiff = pool.filter((p) => p.difficulty === difficulty);
    if (byDiff.length > 0) pool = byDiff;
  }
  return pool;
}

export function pickWordPairFromPool(
  pool: UndercoverWordPair[],
  categoryId: string,
  difficulty: UndercoverDifficulty,
): UndercoverWordPair {
  let filtered = filterWordPairs(pool, categoryId, difficulty);
  if (filtered.length === 0) {
    filtered = [...pool];
  }
  if (filtered.length === 0) {
    return {
      id: 'fallback',
      categoryId: 'food-drink',
      difficulty: 'normal',
      civilian: 'ข้าวผัด',
      undercover: 'ข้าวมันไก่',
    };
  }
  return filtered[Math.floor(Math.random() * filtered.length)]!;
}
