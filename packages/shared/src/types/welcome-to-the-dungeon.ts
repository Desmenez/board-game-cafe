// ============================================================
// Welcome to the Dungeon (ดัดแปลงเล่นออนไลน์)
// ============================================================

/** พลังมอนสเตอร์ในเกม — ไม่มีพลัง 8 ในสำรับนี้ */
export type WttdMonsterPower = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9;

export const WTTD_HERO_CLASSES = ['warrior', 'barbarian', 'mage', 'rogue'] as const;
export type WttdHeroClass = (typeof WTTD_HERO_CLASSES)[number];

/**
 * โหมดเลือกฮีโร่
 * - `normal` — เลือกได้ซ้ำระหว่างเลือก แต่หลังพร้อมครบจะมอบฮีโร่ไม่ซ้ำ (ชนกันสุ่ม)
 * - `random_unique` — สุ่มไม่ซ้ำทันที ข้ามหน้าเลือก
 * - `same_host` — หัวห้องเลือกหรือสุ่มให้ทุกคนเหมือนกัน
 * - `free` — เหมือน normal แต่ได้ฮีโร่ตามที่เลือก ซ้ำได้
 */
export const WTTD_HERO_PICK_MODES = ['normal', 'random_unique', 'same_host', 'free'] as const;
export type WttdHeroPickMode = (typeof WTTD_HERO_PICK_MODES)[number];

/** ไอดีอุปกรณ์ — ต้องตรงกับ keys ใน `imageMap.welcomeToTheDungeon.equipment` */
export type WttdEquipmentId =
  | 'warrior_dragon_spear'
  | 'warrior_holy_grail'
  | 'warrior_knight_shield'
  | 'warrior_plate_armor'
  | 'warrior_torch'
  | 'warrior_vorpal_sword'
  | 'barbarian_chainmail'
  | 'barbarian_healing_potion'
  | 'barbarian_leather_shield'
  | 'barbarian_torch'
  | 'barbarian_vorpal_axe'
  | 'barbarian_war_hammer'
  | 'mage_demonic_pact'
  | 'mage_polymorph'
  | 'mage_bracelet'
  | 'mage_holy_grail'
  | 'mage_wall_of_fire'
  | 'mage_omnipotence'
  | 'rogue_buckler'
  | 'rogue_vorpal_dagger'
  | 'rogue_invisibility_cloak'
  | 'rogue_healing_potion'
  | 'rogue_mithril_armor'
  | 'rogue_ring_of_power';

export const WTTD_EQUIPMENT_BY_CLASS: Record<WttdHeroClass, readonly WttdEquipmentId[]> = {
  warrior: [
    'warrior_dragon_spear',
    'warrior_holy_grail',
    'warrior_knight_shield',
    'warrior_plate_armor',
    'warrior_torch',
    'warrior_vorpal_sword',
  ],
  barbarian: [
    'barbarian_chainmail',
    'barbarian_healing_potion',
    'barbarian_leather_shield',
    'barbarian_torch',
    'barbarian_vorpal_axe',
    'barbarian_war_hammer',
  ],
  mage: [
    'mage_demonic_pact',
    'mage_polymorph',
    'mage_bracelet',
    'mage_holy_grail',
    'mage_wall_of_fire',
    'mage_omnipotence',
  ],
  rogue: [
    'rogue_buckler',
    'rogue_vorpal_dagger',
    'rogue_invisibility_cloak',
    'rogue_healing_potion',
    'rogue_mithril_armor',
    'rogue_ring_of_power',
  ],
};

/** ตั้งค่าในล็อบบี้ — ส่งเข้า `GameDefinition.setup` */
export interface WttdLobbyOptions {
  heroPickMode: WttdHeroPickMode;
}

/** เซิร์ฟเวอร์ผสาน `hostId` เข้า setup อัตโนมัติ */
export interface WttdSetupOptions extends WttdLobbyOptions {
  hostId: string;
}

/** แพ้ในดันเจี้ยนครบจำนวนนี้ = ออกจากเกม */
export const WTTD_DUNGEON_LOSSES_TO_ELIMINATE = 2;

export type WttdPhase = 'hero_pick' | 'role_reveal' | 'bidding' | 'dungeon' | 'game_over';

export type WttdAction =
  | { type: 'wttd_select_hero'; heroClass: WttdHeroClass }
  | { type: 'wttd_set_ready'; ready: boolean }
  | { type: 'wttd_host_same_set'; heroClass: WttdHeroClass }
  | { type: 'wttd_host_same_random' }
  | { type: 'wttd_host_same_go' }
  | { type: 'wttd_role_ack' }
  | { type: 'bidding_pass' }
  | { type: 'bidding_draw' }
  | { type: 'bidding_add_to_dungeon' }
  | { type: 'bidding_discard_monster'; equipmentId: WttdEquipmentId }
  /** ผู้เข้าเลือกพลังมอนเป้าหมายวอร์ปัล (ดาบ/มีด) ก่อนเข้าดันเจี้ยน */
  | { type: 'bidding_set_vorpal_precog'; power: WttdMonsterPower }
  /** `vorpalPrecogPower` — ส่งพร้อมเข้าดันเจี้ยนเมื่อมีดาบ/มีดวอร์ปัล (เลือกในโมดัลก่อนกดเข้า) */
  | { type: 'dungeon_enter'; vorpalPrecogPower?: WttdMonsterPower }
  | { type: 'dungeon_reveal' }
  | { type: 'dungeon_take_damage' }
  /** ผ่านมอนด้วยแพ้ทาง — การ์ดอุปกรณ์ยังอยู่ในชุด (ไม่ทิ้ง) */
  | { type: 'dungeon_weakness_pass'; equipmentId: WttdEquipmentId }
  | { type: 'dungeon_use_vorpal_blade' }
  | { type: 'dungeon_use_vorpal_axe' }
  | { type: 'dungeon_use_demonic_pact' }
  | { type: 'dungeon_use_polymorph' }
  | { type: 'dungeon_use_ring_of_power' }
  | { type: 'dungeon_healing_potion_revive' }
  | { type: 'dungeon_accept_death' };

/** ซิงค์แอนิเมชันต่อสู้ให้ผู้ชม — เซิร์ฟเวอร์เพิ่ม seq ทุกครั้งที่มีเหตุการณ์สำคัญ */
export type WttdDungeonCombatAnimKind = 'none' | 'take_damage' | 'weakness' | 'special_monster';

/** การ์ดใช้ครั้งเดียวต่อการลงดัน 1 ครั้ง (ยกเว้นแหวน) */
export interface WttdDungeonEquipFlags {
  vorpalBladeUsed: boolean;
  healingPotionUsed: boolean;
  vorpalAxeUsed: boolean;
  demonicPactUsed: boolean;
  polymorphUsed: boolean;
}

export interface WttdHeroPickView {
  mode: WttdHeroPickMode;
  hostId: string;
  /** โหมด same_host — ฮีโร่ที่หัวห้องเลือก (ยังไม่เริ่มรอบจนกดพร้อม) */
  hostTableHero: WttdHeroClass | null;
  preferences: Record<string, WttdHeroClass | null>;
  ready: Record<string, boolean>;
  readyCount: number;
  totalPlayers: number;
}

export interface WttdRoleRevealView {
  myHero: WttdHeroClass;
  hasAcknowledged: boolean;
  acknowledgeProgress: { current: number; total: number };
}

export interface WttdPlayerView {
  phase: WttdPhase;
  hostId: string;
  heroPickMode: WttdHeroPickMode;
  /** ฮีโร่ที่ได้รับมอบหมาย (หลัง role reveal / ระหว่างเล่น) */
  myHero: WttdHeroClass;
  /** ทุกคนเห็นการมอบหมาย (ใช้โชว์ชิปผู้เล่น) */
  playerHero: Record<string, WttdHeroClass>;
  players: { id: string; name: string; trophies: number; dungeonLosses: number }[];
  /** ลำดับที่นั่งรอบโต๊ะ — ใช้แสดงคิวประมูล/ลำดับการเล่น */
  tableOrder: string[];
  /** ผู้ชนะประมูล / ผู้เข้าดันเจี้ยน — ตั้งเมื่อเหลือคนเดียวในการประมูล หรือระหว่างเฟสดันเจี้ยน */
  explorerId: string | null;
  /** รอให้ผู้ชนะประมูลกดเข้าสู่ดันเจี้ยน (เฟสประมูล + มี explorerId) */
  awaitingDungeonEntry: boolean;
  /** ผู้ชนะประมูลที่มีดาบ/มีดวอร์ปัลต้องเลือกพลังมอนก่อนกดเข้า */
  needsVorpalPrecogBeforeDungeonEntry: boolean;
  /** พลังมอนที่เลือกไว้สำหรับวอร์ปัล (ประมูลจนถึงดันเจี้ยน) */
  vorpalPrecogMonsterPower: WttdMonsterPower | null;
  /** เฉพาะเฟสประมูล — จำนวนอุปกรณ์ที่เหลือของแต่ละคน (ทุกคนเห็นได้) */
  biddingEquipmentLeft: Record<string, number> | null;
  /** อุปกรณ์ของฮีโร่กลางโต๊ะระหว่างประมูล/ดันเจี้ยน — ตามคลาสที่ explorer ใช้ */
  hero: { hp: number; hpMax: number; equipment: WttdEquipmentId[] };
  dungeonFaceDownCount: number;
  dungeonStackPreview: WttdMonsterPower[] | null;
  monsterDeckRemaining: number;
  bidding: {
    inAuction: string[];
    currentTurnPlayerId: string;
    pendingDraw: { playerId: string; power: WttdMonsterPower } | null;
  } | null;
  dungeonRun: {
    explorerId: string;
    currentCard: WttdMonsterPower | null;
    resolvedCount: number;
    totalCards: number;
    /** พลังมอนที่เลือกไว้ก่อนเข้า (วอร์ปัลดาบ/มีด) — null ถ้าไม่มีการ์ดหรือยังไม่เลือก */
    vorpalPrecogMonsterPower: WttdMonsterPower | null;
    equipFlags: WttdDungeonEquipFlags;
    /** รอผู้เข้ากดคืนชีพจากโพชัน (HP จะตั้งเป็นฐานคลาส) */
    awaitingHealingPotionRevival: boolean;
    /** หลังใช้สัญญาปีศาจกับมอน 7 — เปิดใบถัดไปจะกำจัดทันที */
    demonicPactBanishNextReveal: boolean;
    /** เพิ่มทุกครั้งที่มีแอคชันต่อสู้ — ผู้ชมใช้เล่นแอนิเมชัน */
    combatAnimSeq: number;
    combatAnimKind: WttdDungeonCombatAnimKind;
    /** การ์ดที่เล่น (แพ้ทาง/พิเศษ) — สำหรับบินไปมุมจอ; null ถ้าไม่มีภาพการ์ด (เช่น โพชันจบกอง) */
    combatPlayedEquipmentId: WttdEquipmentId | null;
    /** พลังมอนที่จบในแอนิเมชันนี้ — ใช้เมื่อ currentCard ถูกเคลียร์แล้วในข้อความเดียวกับ combatAnimSeq */
    combatMonsterPower: WttdMonsterPower | null;
  } | null;
  trophiesToWin: number;
  lastEvent: string;
  heroPick: WttdHeroPickView | null;
  roleReveal: WttdRoleRevealView | null;
  gameResult?: { winners: string[]; reason: string };
}
