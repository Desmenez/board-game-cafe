/**
 * Uppercases each whitespace-delimited word that is ASCII Latin letters only (a–z, A–Z).
 * Words containing other scripts (e.g. Thai) are unchanged.
 * Input should already be trimmed with single spaces between words.
 */
export function normalizeToUppercase(text: string): string {
  return text
    .split(' ')
    .map((w) => (/^[a-zA-Z]+$/.test(w) ? w.toUpperCase() : w))
    .join(' ');
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const seg = new Intl.Segmenter('th', { granularity: 'grapheme' });
      return [...seg.segment(text)].map((s) => s.segment);
    } catch {
      /* ignore */
    }
  }
  return [...text];
}

/** จำกัดความยาวตามจำนวน grapheme (สอดคล้องกับช่องตั้งชื่อ Name It — สูงสุด 10) */
export function clampGraphemes(text: string, max: number): string {
  return splitGraphemes(text).slice(0, max).join('');
}

const NAME_IT_DEFAULT_NAME_MAX_GRAPHEMES = 10;

/**
 * ชื่อสุนัขเมื่อหมดเวลาตั้งชื่อ: เอาคำแรกจากชื่อสายพันธุ์ (เช่น Siberian Husky → SIBERIAN),
 * รูปแบบเดียวกับชื่อที่ผู้เล่นตั้ง (Latin → uppercase, จำกัดความยาว)
 */
export function defaultDogNameFromBreedLabel(breedLabel: string): string {
  const first = breedLabel.trim().split(/\s+/)[0] ?? '';
  if (!first) return 'DOG';
  const normalized = normalizeToUppercase(first);
  return clampGraphemes(normalized, NAME_IT_DEFAULT_NAME_MAX_GRAPHEMES);
}
