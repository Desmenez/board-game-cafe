/**
 * Profile name chips — CSS theme on `.player-nameplate__label`.
 * Definitions live in code; unlocks reuse `achievement_unlocks`.
 * Themes are CSS-only (no Cloudinary media) for size + paint cost.
 */

export const NO_CHIP_ID = 'none';

export interface ChipDef {
  id: string;
  label: string;
  description: string;
  /**
   * CSS theme key → `.player-nameplate__label--chip-{theme}`.
   */
  theme: string;
  /** Optional game association for sectioned profile UI. */
  gameId?: string;
}

/** Metal ladder themes (bronze → silver → gold), CSS-only. */
export const CHIPS: readonly ChipDef[] = [
  {
    id: 'chip-bronze',
    label: 'ทองแดง',
    description: 'ชนะแมตช์อย่างน้อย 1 ครั้ง',
    theme: 'bronze',
  },
  {
    id: 'chip-silver',
    label: 'เงิน',
    description: 'ชนะแมตช์อย่างน้อย 5 ครั้ง',
    theme: 'silver',
  },
  {
    id: 'chip-gold',
    label: 'ทอง',
    description: 'ชนะแมตช์อย่างน้อย 10 ครั้ง',
    theme: 'gold',
  },
] as const;

const CHIP_BY_ID = new Map(CHIPS.map((c) => [c.id, c]));

export function getChipDef(id: string | null | undefined): ChipDef | undefined {
  if (!id || id === NO_CHIP_ID) return undefined;
  return CHIP_BY_ID.get(id);
}

/** Normalize DB / wire value; unknown → none. */
export function normalizeChipId(value: unknown): string {
  if (typeof value === 'string' && (value === NO_CHIP_ID || CHIP_BY_ID.has(value))) {
    return value;
  }
  return NO_CHIP_ID;
}

export function isKnownChipId(id: string): boolean {
  return id === NO_CHIP_ID || CHIP_BY_ID.has(id);
}

export function isFreeChip(id: string): boolean {
  return id === NO_CHIP_ID;
}
