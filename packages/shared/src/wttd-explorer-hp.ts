import type { WttdEquipmentId, WttdHeroClass } from './types/welcome-to-the-dungeon.js';

/** HP ฐานตามคลาส (ก่อนรวมโบนัสจากการ์ดอุปกรณ์) — ตามที่กำหนดในโปรเจกต์ */
export const WTTD_EXPLORER_HP_BASE_BY_CLASS: Record<WttdHeroClass, number> = {
  warrior: 3,
  barbarian: 4,
  mage: 2,
  rogue: 3,
};

/** HP บนโต๊ะกลางตอนยังไม่มีผู้เข้า (ชุดว่าง) — ใช้ค่าฐานต่ำสุด */
export const WTTD_IDLE_TABLE_HERO_HP: number = Math.min(
  ...Object.values(WTTD_EXPLORER_HP_BASE_BY_CLASS),
);

export function wttdExplorerBaseHp(heroClass: WttdHeroClass): number {
  return WTTD_EXPLORER_HP_BASE_BY_CLASS[heroClass];
}

/**
 * โบนัส HP สูงสุดจากการ์ดอุปกรณ์ (เฉพาะใบที่เพิ่มพลังชีวิตตามที่กำหนด)
 */
const EQUIPMENT_HP_BONUS: Partial<Record<WttdEquipmentId, number>> = {
  warrior_plate_armor: 5,
  warrior_knight_shield: 3,
  barbarian_leather_shield: 3,
  barbarian_chainmail: 4,
  mage_bracelet: 3,
  mage_wall_of_fire: 6,
  rogue_mithril_armor: 5,
  rogue_buckler: 3,
};

/** การ์ดที่ให้โบนัส HP (เกราะ/โล่ ฯลฯ) — ถือเป็นของสวมใส่ ไม่ใช้เป็นการ์ด “เล่นแพ้ทาง” บน UI ดันเจี้ยน */
export function wttdEquipmentIsWorn(eq: WttdEquipmentId): boolean {
  return (EQUIPMENT_HP_BONUS[eq] ?? 0) > 0;
}

/** HP สูงสุดเมื่อเข้าดันเจี้ยน = ฐานตามคลาส + ผลรวมโบนัสจากการ์ดที่ยังอยู่ในชุด */
export function wttdExplorerMaxHpFromEquipment(
  heroClass: WttdHeroClass,
  equipment: readonly WttdEquipmentId[],
): number {
  let bonus = 0;
  for (const id of equipment) {
    bonus += EQUIPMENT_HP_BONUS[id] ?? 0;
  }
  return wttdExplorerBaseHp(heroClass) + bonus;
}

/** การ์ดอุปกรณ์ที่ให้โบนัส HP (สำหรับแสดงรายละเอียดบน UI) */
export function wttdExplorerHpBonusContributors(
  equipment: readonly WttdEquipmentId[],
): readonly { id: WttdEquipmentId; bonus: number }[] {
  const out: { id: WttdEquipmentId; bonus: number }[] = [];
  for (const id of equipment) {
    const bonus = EQUIPMENT_HP_BONUS[id] ?? 0;
    if (bonus > 0) out.push({ id, bonus });
  }
  return out;
}
