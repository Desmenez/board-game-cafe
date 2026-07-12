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
