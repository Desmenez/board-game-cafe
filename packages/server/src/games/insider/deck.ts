/**
 * ชุดคำ Insider — 100 หมวด × 10 คำ = 1,000 คำ (ภาษาไทย)
 * ข้อมูลหมวด/คำอยู่ใน deck-data.ts
 */

import { INSIDER_CATEGORY_LABELS, INSIDER_WORD_ROWS } from './deck-data.js';

export interface InsiderCategoryDeck {
  id: string;
  label: string;
  /** หมวดละ 10 คำ */
  words: readonly string[];
}

export const INSIDER_DECKS: InsiderCategoryDeck[] = INSIDER_CATEGORY_LABELS.map((label, i) => ({
  id: `cat-${String(i).padStart(3, '0')}`,
  label,
  words: INSIDER_WORD_ROWS[i]!,
}));

export function pickRandomWord(): { category: InsiderCategoryDeck; word: string } {
  const category = INSIDER_DECKS[Math.floor(Math.random() * INSIDER_DECKS.length)]!;
  const w = category.words[Math.floor(Math.random() * category.words.length)]!;
  return { category, word: w };
}
