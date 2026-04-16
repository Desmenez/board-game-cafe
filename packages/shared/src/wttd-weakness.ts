import type { WttdEquipmentId, WttdMonsterPower } from './types/welcome-to-the-dungeon.js';

/** สัญลักษณ์แพ้ทางที่ใช้จับคู่มอน ↔ อุปกรณ์ (ตามชุดมอนในโปรเจกต์) */
export const WTTD_WEAKNESS_SYMBOLS = [
  'torch',
  'holy_grail',
  'war_hammer',
  'invisibility_cloak',
  'demonic_pact',
  'dragon_spear',
] as const;

export type WttdWeaknessSymbol = (typeof WTTD_WEAKNESS_SYMBOLS)[number];

/** แพ้ทางของมอนแต่ละพลัง (จากสเปกการ์ด monster-1 … monster-9) */
export const WTTD_MONSTER_WEAKNESSES_BY_POWER: Record<WttdMonsterPower, readonly WttdWeaknessSymbol[]> = {
  1: ['torch'],
  2: ['torch', 'holy_grail'],
  3: ['torch'],
  4: ['holy_grail'],
  5: ['war_hammer'],
  6: ['invisibility_cloak', 'holy_grail'],
  7: ['invisibility_cloak', 'demonic_pact'],
  9: ['invisibility_cloak', 'dragon_spear'],
};

/** สัญลักษณ์บนการ์ดอุปกรณ์แต่ละใบ (ว่าง = ไม่ใช้แพ้ทางกับมอนชุดนี้) */
export const WTTD_EQUIPMENT_WEAKNESS_SYMBOLS: Record<WttdEquipmentId, readonly WttdWeaknessSymbol[]> = {
  warrior_dragon_spear: ['dragon_spear'],
  warrior_holy_grail: ['holy_grail'],
  warrior_knight_shield: [],
  warrior_plate_armor: [],
  warrior_torch: ['torch'],
  warrior_vorpal_sword: [],
  barbarian_chainmail: [],
  barbarian_healing_potion: [],
  barbarian_leather_shield: [],
  barbarian_torch: ['torch'],
  barbarian_vorpal_axe: [],
  barbarian_war_hammer: ['war_hammer'],
  mage_demonic_pact: ['demonic_pact'],
  mage_polymorph: [],
  mage_bracelet: [],
  mage_holy_grail: ['holy_grail'],
  mage_wall_of_fire: [],
  mage_omnipotence: [],
  rogue_buckler: [],
  rogue_vorpal_dagger: [],
  rogue_invisibility_cloak: ['invisibility_cloak'],
  rogue_healing_potion: [],
  rogue_mithril_armor: [],
  rogue_ring_of_power: [],
};

export const WTTD_WEAKNESS_SYMBOL_TH: Record<WttdWeaknessSymbol, string> = {
  torch: 'คบเพลิง',
  holy_grail: 'จอกศักดิ์สิทธิ์',
  war_hammer: 'ค้อนสงคราม',
  invisibility_cloak: 'ผ้าคลุมล่องหน',
  demonic_pact: 'สัญญาปีศาจ',
  dragon_spear: 'หอกมังกร',
};

export function wttdMonsterWeaknesses(power: WttdMonsterPower): readonly WttdWeaknessSymbol[] {
  return WTTD_MONSTER_WEAKNESSES_BY_POWER[power];
}

export function wttdEquipmentWeaknessSymbols(eq: WttdEquipmentId): readonly WttdWeaknessSymbol[] {
  return WTTD_EQUIPMENT_WEAKNESS_SYMBOLS[eq];
}

/** อุปกรณ์ใบนี้มีสัญลักษณ์ตรงกับจุดอ่อนมอนหรือไม่ */
export function wttdCanWeaknessPassMonster(
  monsterPower: WttdMonsterPower,
  equipmentId: WttdEquipmentId,
): boolean {
  const need = wttdMonsterWeaknesses(monsterPower);
  const have = wttdEquipmentWeaknessSymbols(equipmentId);
  return have.some((s) => need.includes(s));
}

/** พลังมอนทั้งหมดในสำรับ (ใช้เลือกเป้าหมายวอร์ปัล / ไกด์) */
export const WTTD_ALL_MONSTER_POWERS: readonly WttdMonsterPower[] = [1, 2, 3, 4, 5, 6, 7, 9];

/** พลังมอนใดในเกมที่สามารถผ่านด้วยแพ้ทางได้ ถ้ามีชุดอุปกรณ์นี้ (เฟสดันเจี้ยน / พรีวิวชุด) */
export function wttdMonsterPowersPassableWithEquipment(
  equipment: readonly WttdEquipmentId[],
): WttdMonsterPower[] {
  return WTTD_ALL_MONSTER_POWERS.filter((pow) =>
    equipment.some((eq) => wttdCanWeaknessPassMonster(pow, eq)),
  );
}
