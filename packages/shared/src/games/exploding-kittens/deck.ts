import { clampEkDeckCopies } from './types.js';
import type {
  ExplodingKittensCardType,
  ExplodingKittensExpansionsEnabled,
  ExplodingKittensMixBase,
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
  /** ผลรวม paw + non (ไม่รวมการกรองตามจำนวนผู้เล่น) */
  zombie_kittens: {
    exploding_kitten: 4,
    zombie_kitten: 5,
    attack: 2,
    attack_of_the_dead: 3,
    nope: 5,
    see_future: 4,
    shuffle_now: 2,
    skip: 3,
    super_skip: 2,
    favor: 3,
    clairvoyance: 2,
    dig_deeper: 4,
    clone: 3,
    feed_the_dead: 2,
    grave_robber: 1,
    cat_taco: 4,
    cat_melon: 4,
    cat_beard: 4,
    cat_rainbow: 4,
  },
};

/**
 * Zombie Kittens — แยก paw / non-paw (ไม่รวม EK)
 * Attack เป็น 2 paw / 0 non ตามกล่องจริง → รวม 24 paw / 33 non
 */
export type EkZombiePawSplit = { paw: number; non: number };

export const EK_ZOMBIE_PAW_COUNTS: Partial<Record<ExplodingKittensCardType, EkZombiePawSplit>> = {
  zombie_kitten: { paw: 2, non: 3 },
  attack: { paw: 2, non: 0 },
  attack_of_the_dead: { paw: 0, non: 3 },
  nope: { paw: 2, non: 3 },
  see_future: { paw: 2, non: 2 },
  shuffle_now: { paw: 1, non: 1 },
  skip: { paw: 1, non: 2 },
  super_skip: { paw: 1, non: 1 },
  favor: { paw: 1, non: 2 },
  clairvoyance: { paw: 1, non: 1 },
  dig_deeper: { paw: 2, non: 2 },
  clone: { paw: 1, non: 2 },
  feed_the_dead: { paw: 0, non: 2 },
  grave_robber: { paw: 0, non: 1 },
  cat_taco: { paw: 2, non: 2 },
  cat_melon: { paw: 2, non: 2 },
  cat_beard: { paw: 2, non: 2 },
  cat_rainbow: { paw: 2, non: 2 },
};

export type ZombieKittenCardSpec = { type: ExplodingKittensCardType; paw: boolean };

/**
 * สร้างสเปคการ์ด ZK ตามจำนวนผู้เล่น (ไม่รวม EK — setup ใส่แยก)
 * 2p = เฉพาะ paw, 3p = เฉพาะ non-paw, 4+ = ทั้งสำรับ
 */
export function buildZombieKittenCardSpecs(playerCount: number): ZombieKittenCardSpec[] {
  const n = Math.max(2, Math.floor(playerCount) || 2);
  const filter: 'paw' | 'non' | 'all' = n === 2 ? 'paw' : n === 3 ? 'non' : 'all';
  const specs: ZombieKittenCardSpec[] = [];
  for (const type of Object.keys(EK_ZOMBIE_PAW_COUNTS) as ExplodingKittensCardType[]) {
    const split = EK_ZOMBIE_PAW_COUNTS[type];
    if (!split) continue;
    if (filter === 'paw' || filter === 'all') {
      for (let i = 0; i < split.paw; i += 1) specs.push({ type, paw: true });
    }
    if (filter === 'non' || filter === 'all') {
      for (let i = 0; i < split.non; i += 1) specs.push({ type, paw: false });
    }
  }
  return specs;
}

/** จำนวน Zombie Kitten / Defuse ที่แจกตอน Apocalypse setup */
export function apocalypseSaveCardCounts(playerCount: number): {
  zombieKitten: number;
  defuse: number;
} {
  const n = Math.max(2, Math.min(9, Math.floor(playerCount) || 2));
  const chart: Record<number, { zombieKitten: number; defuse: number }> = {
    2: { zombieKitten: 2, defuse: 0 },
    3: { zombieKitten: 3, defuse: 0 },
    4: { zombieKitten: 4, defuse: 0 },
    5: { zombieKitten: 5, defuse: 0 },
    6: { zombieKitten: 5, defuse: 1 },
    7: { zombieKitten: 5, defuse: 2 },
    8: { zombieKitten: 5, defuse: 3 },
    9: { zombieKitten: 5, defuse: 4 },
  };
  return chart[n] ?? chart[2]!;
}

/** เป้าหมายขนาดกองจั่วหลังแจก (Apocalypse) — ก่อนใส่ EK */
export function apocalypseDrawPileTarget(playerCount: number): number {
  const n = Math.max(2, Math.min(9, Math.floor(playerCount) || 2));
  if (n <= 2) return 15;
  if (n === 3) return 20;
  if (n === 4) return 25;
  if (n === 5) return 30;
  return 35; // 6–9
}

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

/**
 * Imploding Kittens — จำนวนตามกล่อง (ไม่สเกล)
 * Imploding Kitten ใส่ตอน setup แยก (ไม่ใส่ในกองแจกเริ่ม)
 */
export const EK_IMPLODING_FIXED_COUNTS: Partial<Record<ExplodingKittensCardType, number>> = {
  alter_future: 4,
  draw_from_bottom: 4,
  feral_cat: 4,
  reverse: 4,
  targeted_attack: 3,
};

/** ลำดับแสดงใน lobby preview */
const PREVIEW_ORDER: ExplodingKittensCardType[] = [
  'exploding_kitten',
  'imploding_kitten',
  'defuse',
  'zombie_kitten',
  'attack',
  'attack_of_the_dead',
  'targeted_attack',
  'personal_attack_3x',
  'skip',
  'super_skip',
  'reverse',
  'shuffle',
  'shuffle_now',
  'see_future',
  'see_future_5x',
  'alter_future',
  'alter_future_5x',
  'alter_future_now',
  'share_future_3x',
  'clairvoyance',
  'dig_deeper',
  'clone',
  'swap_top_bottom',
  'draw_from_bottom',
  'favor',
  'feed_the_dead',
  'grave_robber',
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

function addCount(
  byType: Map<ExplodingKittensCardType, number>,
  type: ExplodingKittensCardType,
  count: number,
): void {
  if (count <= 0) return;
  byType.set(type, (byType.get(type) ?? 0) + count);
}

function isCatType(t: ExplodingKittensCardType): boolean {
  return t.startsWith('cat_') || t === 'feral_cat';
}

function addExpansionCounts(
  byType: Map<ExplodingKittensCardType, number>,
  expansions: ExplodingKittensExpansionsEnabled,
): void {
  if (expansions.barking) {
    for (const t of Object.keys(EK_BARKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      addCount(byType, t, EK_BARKING_FIXED_COUNTS[t] ?? 0);
    }
  }
  if (expansions.streaking) {
    for (const t of Object.keys(EK_STREAKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      addCount(byType, t, EK_STREAKING_FIXED_COUNTS[t] ?? 0);
    }
  }
  if (expansions.imploding) {
    for (const t of Object.keys(EK_IMPLODING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      addCount(byType, t, EK_IMPLODING_FIXED_COUNTS[t] ?? 0);
    }
    addCount(byType, 'imploding_kitten', 1);
  }
}

function finalizePreview(
  byType: Map<ExplodingKittensCardType, number>,
  copies: number,
): ExplodingKittensDeckPreview {
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

/**
 * องค์ประกอบสำรับตาม logic setup จริง (รวม Defuse ในมือ + EK ที่ใส่หลังแจก)
 * `playerCount` < 2 จะคิดแบบโต๊ะขั้นต่ำ 2 คน
 * `deckCopies` = จำนวนชุดฐานที่ทบ (ค่าเริ่มต้น 1)
 * `mixBase` — ใช้เมื่อ mode เป็น zombie_kittens (Apocalypse)
 */
export function explodingKittensDeckPreview(
  mode: ExplodingKittensMode,
  expansions: ExplodingKittensExpansionsEnabled,
  playerCount: number,
  deckCopies = 1,
  mixBase: ExplodingKittensMixBase = 'none',
): ExplodingKittensDeckPreview {
  const n = Math.max(2, Math.floor(playerCount) || 2);
  const copies = clampEkDeckCopies(deckCopies);

  if (mode === 'zombie_kittens') {
    return zombieDeckPreview(n, expansions, copies, mixBase);
  }

  const base = EK_BASE_COUNTS_BY_MODE[mode];
  const byType = new Map<ExplodingKittensCardType, number>();

  for (const t of Object.keys(base) as ExplodingKittensCardType[]) {
    if (t === 'exploding_kitten' || t === 'defuse') continue;
    addCount(byType, t, (base[t] ?? 0) * copies);
  }

  const defuseTotal = Math.max(n, (base.defuse ?? 0) * copies);
  byType.set('defuse', defuseTotal);

  let kittens = Math.max(1, Math.min(n - 1, (base.exploding_kitten ?? n - 1) * copies));
  if (expansions.streaking) kittens += 1;
  byType.set('exploding_kitten', kittens);

  addExpansionCounts(byType, expansions);
  return finalizePreview(byType, copies);
}

function zombieDeckPreview(
  n: number,
  expansions: ExplodingKittensExpansionsEnabled,
  copies: number,
  mixBase: ExplodingKittensMixBase,
): ExplodingKittensDeckPreview {
  const byType = new Map<ExplodingKittensCardType, number>();
  const specs = buildZombieKittenCardSpecs(n);
  for (const s of specs) {
    addCount(byType, s.type, 1);
  }

  if (mixBase === 'original' || mixBase === 'party_pack') {
    // Apocalypse: รวม companion (ตัดแมว / EK / Defuse ออก — saves มาจาก chart)
    const companion = EK_BASE_COUNTS_BY_MODE[mixBase];
    for (const t of Object.keys(companion) as ExplodingKittensCardType[]) {
      if (t === 'exploding_kitten' || t === 'defuse' || isCatType(t)) continue;
      addCount(byType, t, (companion[t] ?? 0) * copies);
    }
    const saves = apocalypseSaveCardCounts(n);
    byType.set('zombie_kitten', saves.zombieKitten);
    if (saves.defuse > 0) byType.set('defuse', saves.defuse);
    addExpansionCounts(byType, expansions);
  }

  let kittens = Math.max(1, n - 1);
  if (expansions.streaking) kittens += 1;
  byType.set('exploding_kitten', kittens);

  return finalizePreview(byType, copies);
}
