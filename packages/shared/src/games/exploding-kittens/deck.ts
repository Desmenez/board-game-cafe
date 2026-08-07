import { clampEkDeckCopies } from './types.js';
import type {
  ExplodingKittensCardType,
  ExplodingKittensExpansionsEnabled,
  ExplodingKittensMode,
} from './types.js';

/** จำนวนการ์ดฐานตามโหมด (ก่อนคูณ deckCopies ที่หัวห้องเลือก) */
export const EK_BASE_COUNTS_BY_MODE: Record<
  ExplodingKittensMode,
  Partial<Record<ExplodingKittensCardType, number>>
> = {
  original: {
    exploding_kitten: 4,
    defuse: 6,
    attack: 4,
    skip: 4,
    shuffle: 4,
    see_future: 5,
    favor: 4,
    nope: 5,
    cat_taco: 4,
    cat_melon: 4,
    cat_beard: 4,
    cat_rainbow: 4,
    cat_potato: 4,
  },
  party_pack: {
    exploding_kitten: 9,
    defuse: 11,
    attack: 4,
    targeted_attack: 4,
    skip: 4,
    shuffle: 4,
    see_future: 5,
    alter_future: 4,
    draw_from_bottom: 4,
    favor: 4,
    nope: 6,
    feral_cat: 6,
    cat_taco: 4,
    cat_melon: 4,
    cat_beard: 4,
    cat_rainbow: 4,
    cat_potato: 4,
  },
};

/** Barking Kittens — จำนวนตามกล่อง (ไม่สเกลตามจำนวนผู้เล่น) */
export const EK_BARKING_FIXED_COUNTS: Partial<Record<ExplodingKittensCardType, number>> = {
  alter_future_now: 2,
  barking_kitten: 2,
  bury: 2,
  ill_take_that: 4,
  personal_attack_3x: 4,
  potluck: 2,
  share_future_3x: 2,
  super_skip: 1,
  tower_of_power: 1,
};

/**
 * Streaking Kittens — จำนวนตามกล่อง (ไม่สเกล)
 * Exploding Kitten +1 ใส่ตอน setup แยก (ไม่ใส่ในกองแจกเริ่ม)
 */
export const EK_STREAKING_FIXED_COUNTS: Partial<Record<ExplodingKittensCardType, number>> = {
  streaking_kitten: 1,
  super_skip: 1,
  see_future_5x: 1,
  alter_future_5x: 1,
  swap_top_bottom: 3,
  garbage_collection: 1,
  catomic_bomb: 1,
  curse_of_the_cat_butt: 2,
  mark: 3,
};

/** ลำดับแสดงใน lobby preview */
const PREVIEW_ORDER: ExplodingKittensCardType[] = [
  'exploding_kitten',
  'defuse',
  'attack',
  'targeted_attack',
  'personal_attack_3x',
  'skip',
  'super_skip',
  'shuffle',
  'see_future',
  'see_future_5x',
  'alter_future',
  'alter_future_5x',
  'alter_future_now',
  'share_future_3x',
  'swap_top_bottom',
  'draw_from_bottom',
  'favor',
  'nope',
  'bury',
  'ill_take_that',
  'potluck',
  'barking_kitten',
  'tower_of_power',
  'streaking_kitten',
  'garbage_collection',
  'catomic_bomb',
  'curse_of_the_cat_butt',
  'mark',
  'feral_cat',
  'cat_taco',
  'cat_melon',
  'cat_beard',
  'cat_rainbow',
  'cat_potato',
];

export type ExplodingKittensDeckPreviewEntry = {
  type: ExplodingKittensCardType;
  count: number;
};

export type ExplodingKittensDeckPreview = {
  entries: ExplodingKittensDeckPreviewEntry[];
  total: number;
  /** สำรับฐานถูกคูณตาม deckCopies ที่หัวห้องเลือก */
  copies: number;
};

/**
 * องค์ประกอบสำรับตาม logic setup จริง (รวม Defuse ในมือ + EK ที่ใส่หลังแจก)
 * `playerCount` < 2 จะคิดแบบโต๊ะขั้นต่ำ 2 คน
 * `deckCopies` = จำนวนชุดฐานที่ทบ (ค่าเริ่มต้น 1)
 */
export function explodingKittensDeckPreview(
  mode: ExplodingKittensMode,
  expansions: ExplodingKittensExpansionsEnabled,
  playerCount: number,
  deckCopies = 1,
): ExplodingKittensDeckPreview {
  const n = Math.max(2, Math.floor(playerCount) || 2);
  const copies = clampEkDeckCopies(deckCopies);
  const base = EK_BASE_COUNTS_BY_MODE[mode];
  const byType = new Map<ExplodingKittensCardType, number>();

  for (const t of Object.keys(base) as ExplodingKittensCardType[]) {
    if (t === 'exploding_kitten' || t === 'defuse') continue;
    const count = (base[t] ?? 0) * copies;
    if (count > 0) byType.set(t, count);
  }

  const defuseTotal = Math.max(n, (base.defuse ?? 0) * copies);
  byType.set('defuse', defuseTotal);

  let kittens = Math.max(1, Math.min(n - 1, (base.exploding_kitten ?? n - 1) * copies));
  if (expansions.streaking) kittens += 1;
  byType.set('exploding_kitten', kittens);

  if (expansions.barking) {
    for (const t of Object.keys(EK_BARKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const add = EK_BARKING_FIXED_COUNTS[t] ?? 0;
      if (add <= 0) continue;
      byType.set(t, (byType.get(t) ?? 0) + add);
    }
  }
  if (expansions.streaking) {
    for (const t of Object.keys(EK_STREAKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const add = EK_STREAKING_FIXED_COUNTS[t] ?? 0;
      if (add <= 0) continue;
      byType.set(t, (byType.get(t) ?? 0) + add);
    }
  }

  const entries: ExplodingKittensDeckPreviewEntry[] = [];
  for (const t of PREVIEW_ORDER) {
    const count = byType.get(t);
    if (count != null && count > 0) entries.push({ type: t, count });
  }
  for (const [t, count] of byType) {
    if (!PREVIEW_ORDER.includes(t) && count > 0) entries.push({ type: t, count });
  }

  const total = entries.reduce((sum, e) => sum + e.count, 0);
  return { entries, total, copies };
}
