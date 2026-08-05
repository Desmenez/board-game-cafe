/**
 * Profile titles (ฉายา) — short label shown with the display name.
 * Definitions live in code; unlocks reuse `achievement_unlocks`.
 */

export const NO_TITLE_ID = 'none';

export interface TitleDef {
  id: string;
  label: string;
  description: string;
  /** Optional game association for sectioned profile UI. */
  gameId?: string;
}

export const TITLES: readonly TitleDef[] = [
  {
    id: 'marrakech-carpet-mogul',
    label: 'เจ้าพ่อค้าพรม',
    description: 'ชนะ Marrakech อย่างน้อย 1 ครั้ง',
    gameId: 'marrakech',
  },
] as const;

const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]));

export function getTitleDef(id: string | null | undefined): TitleDef | undefined {
  if (!id || id === NO_TITLE_ID) return undefined;
  return TITLE_BY_ID.get(id);
}

/** Normalize DB / wire value; unknown → none. */
export function normalizeTitleId(value: unknown): string {
  if (typeof value === 'string' && (value === NO_TITLE_ID || TITLE_BY_ID.has(value))) {
    return value;
  }
  return NO_TITLE_ID;
}

export function isKnownTitleId(id: string): boolean {
  return id === NO_TITLE_ID || TITLE_BY_ID.has(id);
}

export function isFreeTitle(id: string): boolean {
  return id === NO_TITLE_ID;
}
