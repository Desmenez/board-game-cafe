/**
 * Shared shape for Thai word categories (server-only lexicon).
 */

export interface ThaiWordCategory {
  id: string;
  label: string;
  words: readonly string[];
}

export interface PickedWord {
  category: ThaiWordCategory;
  word: string;
}

export interface PickedWordPair {
  category: ThaiWordCategory;
  wordA: string;
  wordB: string;
}
