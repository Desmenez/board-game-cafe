/**
 * ชุดคำ Insider — ห่อ lexicon กลาง (100 หมวด × 10 คำ)
 */

import { INSIDER_THAI_CATEGORIES, pickInsiderWord } from '../../lexicon/thai/index.js';
import type { ThaiWordCategory } from '../../lexicon/thai/index.js';

export type InsiderCategoryDeck = ThaiWordCategory;

export const INSIDER_DECKS: InsiderCategoryDeck[] = [...INSIDER_THAI_CATEGORIES];

export function pickRandomWord(): { category: InsiderCategoryDeck; word: string } {
  return pickInsiderWord();
}
