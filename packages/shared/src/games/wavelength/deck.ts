import type { WavelengthSpectrum } from './types.js';
import { WAVELENGTH_SPECTRUM_CARDS_TH } from './spectrum-cards.th.js';

/** Independent spectrum prompts. Each round draws two at random as card faces. */
export const WAVELENGTH_SPECTRA: readonly WavelengthSpectrum[] = WAVELENGTH_SPECTRUM_CARDS_TH.map(
  (item, index) => ({
    id: `wl-${String(index + 1).padStart(3, '0')}`,
    left: item.left,
    right: item.right,
  }),
);

export function shuffleWavelengthDeck(rng: () => number = Math.random): WavelengthSpectrum[] {
  const spectra = WAVELENGTH_SPECTRA.map((item) => ({ ...item }));
  for (let i = spectra.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [spectra[i], spectra[j]] = [spectra[j]!, spectra[i]!];
  }
  return spectra;
}

const NUMBER_WORDS = new Set([
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
  'hundred',
  'thousand',
  'million',
  'first',
  'second',
  'third',
  'half',
  'quarter',
  'percent',
  'ศูนย์',
  'หนึ่ง',
  'สอง',
  'สาม',
  'สี่',
  'ห้า',
  'หก',
  'เจ็ด',
  'แปด',
  'เก้า',
  'สิบ',
  'ร้อย',
  'พัน',
  'ล้าน',
]);

/** Obvious synonyms for common spectrum endpoints. Keys are lowercase English. */
export const WAVELENGTH_SYNONYMS: Record<string, readonly string[]> = {
  hot: ['heat', 'warm', 'boiling', 'scorching', 'ร้อน'],
  cold: ['cool', 'chilly', 'freezing', 'icy', 'หนาว', 'เย็น'],
  bad: ['worse', 'worst', 'terrible', 'awful', 'แย่'],
  good: ['better', 'best', 'great', 'excellent', 'ดี'],
  easy: ['simple', 'ง่าย'],
  hard: ['difficult', 'tough', 'ยาก'],
  ugly: ['hideous', 'น่ารังเกียจ'],
  beautiful: ['pretty', 'gorgeous', 'สวย'],
  quiet: ['silent', 'mute', 'เงียบ'],
  loud: ['noisy', 'ดัง'],
  dark: ['black', 'มืด'],
  light: ['bright', 'สว่าง'],
  sad: ['unhappy', 'เศร้า'],
  happy: ['glad', 'joyful', 'สุข'],
  fake: ['false', 'ปลอม'],
  authentic: ['real', 'genuine', 'แท้'],
  short: ['small', 'สั้น'],
  long: ['tall', 'ยาว'],
  soft: ['gentle', 'นุ่ม'],
  wet: ['damp', 'เปียก'],
  dry: ['arid', 'แห้ง'],
  cheap: ['inexpensive', 'ถูก'],
  expensive: ['costly', 'pricey', 'แพง'],
};

function labelTokens(label: string): string[] {
  return label
    .normalize('NFC')
    .toLowerCase()
    .split(/[\s/,._\-–—]+/u)
    .map((token) => token.replace(/[^\p{L}\p{N}\p{M}]+/gu, ''))
    .filter((token) => token.length >= 3);
}

function bannedTermsForLabel(label: string): string[] {
  const tokens = labelTokens(label);
  const extra = tokens.flatMap((token) => [...(WAVELENGTH_SYNONYMS[token] ?? [])]);
  return [...new Set([label.normalize('NFC').toLowerCase().trim(), ...tokens, ...extra])];
}

/**
 * Wavelength clues are one conceptual idea (short phrase OK).
 * Reject empty text, digits / number-words, and spectrum endpoint words.
 */
export function validateWavelengthClue(raw: string, leftLabel: string, rightLabel: string): string {
  const text = raw.trim().normalize('NFC');
  if (!text) return 'คำใบ้ว่างไม่ได้';
  if (text.length > 80) return 'คำใบ้ยาวเกินไป';
  if (/\d/.test(text)) return 'ห้ามใส่ตัวเลขในคำใบ้';

  const words = text.split(/\s+/u).filter(Boolean);
  if (words.length > 8) return 'คำใบ้ยาวเกินไป — ใช้ไอเดียเดียว';
  for (const word of words) {
    if (NUMBER_WORDS.has(word.toLowerCase())) return 'ห้ามใส่ตัวเลขในคำใบ้';
  }

  const haystack = text.toLowerCase();
  for (const term of [...bannedTermsForLabel(leftLabel), ...bannedTermsForLabel(rightLabel)]) {
    if (!term) continue;
    if (haystack.includes(term)) {
      return 'ห้ามใช้คำที่อยู่ปลายสเปกตรัมหรือคำใกล้เคียง';
    }
  }
  return '';
}
