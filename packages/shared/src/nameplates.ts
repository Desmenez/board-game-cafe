/**
 * Profile nameplate cosmetics (background behind display name).
 * Art: CSS `theme` and/or Cloudinary `imageUrl` / `videoUrl`.
 */

export const DEFAULT_NAMEPLATE_ID = 'default';

/** Cloudinary delivery base (public CDN). */
const CLOUDINARY_IMAGE = 'https://res.cloudinary.com/dpkqjlk3g/image/upload';
const CLOUDINARY_VIDEO = 'https://res.cloudinary.com/dpkqjlk3g/video/upload';

export type NameplateMotion = 'static' | 'animated';

export interface NameplateDef {
  id: string;
  label: string;
  /** Thai short blurb for profile picker */
  description: string;
  motion: NameplateMotion;
  /**
   * CSS theme key → `.player-nameplate--{theme}` / `.player-seat-frame--{theme}`.
   * Used when media is empty, or as fallback under the media.
   */
  theme: string;
  /**
   * Optional game association for sectioned profile UI.
   * Omit for global / progression plates.
   */
  gameId?: string;
  /**
   * Optional still / animated image URL. Empty / omitted → CSS theme only
   * (unless `videoUrl` is set).
   */
  imageUrl?: string;
  /**
   * Optional looping muted video (mp4). When set, clients render `<video>`
   * instead of CSS `background-image`.
   */
  videoUrl?: string;
}

export const NAMEPLATES: readonly NameplateDef[] = [
  {
    id: DEFAULT_NAMEPLATE_ID,
    label: 'มาตรฐาน',
    description: 'พื้นหลังชื่อเริ่มต้น',
    motion: 'static',
    theme: 'default',
  },
  {
    id: 'bronze',
    label: 'ทองแดง',
    description: 'ชนะแมตช์อย่างน้อย 1 ครั้ง (ทุกเกม)',
    motion: 'static',
    theme: 'bronze',
  },
  {
    id: 'silver',
    label: 'เงิน',
    description: 'ชนะแมตช์อย่างน้อย 5 ครั้ง (ทุกเกม)',
    motion: 'static',
    theme: 'silver',
  },
  {
    id: 'gold',
    label: 'ทอง',
    description: 'ชนะแมตช์อย่างน้อย 10 ครั้ง (ทุกเกม)',
    motion: 'static',
    theme: 'gold',
  },
  {
    id: 'marrakech-plate-1',
    label: 'พรม Marrakech',
    description: 'ชนะ Marrakech อย่างน้อย 3 ครั้ง',
    motion: 'static',
    theme: 'marrakech',
    gameId: 'marrakech',
    imageUrl: `${CLOUDINARY_IMAGE}/q_auto/f_auto/v1785856692/plate-1_umbqqj.jpg`,
  },
  {
    id: 'marrakech-plate-2',
    label: 'พรม Marrakech (เคลื่อนไหว)',
    description: 'ชนะ Marrakech อย่างน้อย 5 ครั้ง',
    motion: 'animated',
    theme: 'marrakech',
    gameId: 'marrakech',
    videoUrl: `${CLOUDINARY_VIDEO}/q_auto/v1785897424/plate-2_s9dmeq.mp4`,
  },
] as const;

/** Section labels for profile cosmetics UI. */
export const COSMETIC_GAME_LABELS: Readonly<Record<string, string>> = {
  marrakech: 'Marrakech',
};

export interface NameplateSection {
  key: string;
  label: string;
  gameId?: string;
  plates: NameplateDef[];
}

/** Group catalog plates: global first, then one section per gameId. */
export function nameplateSections(): NameplateSection[] {
  const global: NameplateDef[] = [];
  const byGame = new Map<string, NameplateDef[]>();
  for (const plate of NAMEPLATES) {
    if (!plate.gameId) {
      global.push(plate);
      continue;
    }
    const list = byGame.get(plate.gameId) ?? [];
    list.push(plate);
    byGame.set(plate.gameId, list);
  }
  const sections: NameplateSection[] = [{ key: 'global', label: 'ทั่วไป', plates: global }];
  for (const [gameId, plates] of byGame) {
    sections.push({
      key: gameId,
      label: COSMETIC_GAME_LABELS[gameId] ?? gameId,
      gameId,
      plates,
    });
  }
  return sections;
}

const NAMEPLATE_BY_ID = new Map(NAMEPLATES.map((n) => [n.id, n]));

export function getNameplateDef(id: string | null | undefined): NameplateDef {
  if (id && NAMEPLATE_BY_ID.has(id)) return NAMEPLATE_BY_ID.get(id)!;
  return NAMEPLATE_BY_ID.get(DEFAULT_NAMEPLATE_ID)!;
}

/** Normalize DB / wire value; unknown ids fall back to default. */
export function normalizeNameplateId(value: unknown): string {
  if (typeof value === 'string' && NAMEPLATE_BY_ID.has(value)) return value;
  return DEFAULT_NAMEPLATE_ID;
}

export function isKnownNameplateId(id: string): boolean {
  return NAMEPLATE_BY_ID.has(id);
}

/** Free plates that do not require an achievement unlock. */
export function isFreeNameplate(id: string): boolean {
  return id === DEFAULT_NAMEPLATE_ID;
}
