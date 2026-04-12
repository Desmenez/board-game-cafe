import type { SheriffCard, SheriffGoodType, SheriffLegalGood } from 'shared';

type GoodsMeta = Record<SheriffGoodType, { value: number; penalty: number }>;

function countByType(stall: SheriffCard[]): Map<SheriffGoodType, number> {
  const m = new Map<SheriffGoodType, number>();
  for (const c of stall) {
    m.set(c.type, (m.get(c.type) ?? 0) + 1);
  }
  return m;
}

/**
 * King / Queen — นับ “หน่วย” ของสายสินค้าถูกกฎหมาย (การ์ดขยายนับหลายหน่วยตามข้อความบนการ์ด)
 */
export function kingQueenUnitsForLegalGood(stall: SheriffCard[], good: SheriffLegalGood): number {
  let u = 0;
  for (const c of stall) {
    if (good === 'apple') {
      if (c.type === 'apple') u += 1;
      else if (c.type === 'green_apples') u += 2;
      else if (c.type === 'golden_apples') u += 3;
    } else if (good === 'cheese') {
      if (c.type === 'cheese') u += 1;
      else if (c.type === 'bleu_cheese') u += 3;
      else if (c.type === 'gouda_cheese') u += 2;
    } else if (good === 'bread') {
      if (c.type === 'bread') u += 1;
      else if (c.type === 'rye_bread') u += 2;
      else if (c.type === 'pumpernickel_bread') u += 3;
    } else if (good === 'chicken') {
      if (c.type === 'chicken') u += 1;
      else if (c.type === 'royal_rooster') u += 2;
    }
  }
  return u;
}

/**
 * มูลค่าทองจากสินค้าในแผงท้ายเกม = ค่าพิมพ์บนการ์ด + โบนัสจากเงื่อนไขบนการ์ดบางใบ
 */
export function stallGoodsGoldAtGameEnd(stall: SheriffCard[], meta: GoodsMeta): number {
  const printed = stall.reduce((sum, c) => sum + meta[c.type].value, 0);
  return printed + synergyBonusGold(stall);
}

function synergyBonusGold(stall: SheriffCard[]): number {
  const n = countByType(stall);
  let bonus = 0;

  const mead = n.get('mead') ?? 0;
  const strawberryMead = n.get('strawberry_mead') ?? 0;
  bonus += mead * strawberryMead;

  const pepper = n.get('pepper') ?? 0;
  const dragonPepper = n.get('dragon_pepper') ?? 0;
  bonus += pepper * dragonPepper;

  const silk = n.get('silk') ?? 0;
  const goldenSilk = n.get('golden_silk') ?? 0;
  bonus += silk * goldenSilk;

  const crossbow = n.get('crossbow') ?? 0;
  const heavyCrossbow = n.get('heavy_crossbow') ?? 0;
  /** Heavy Crossbow: “All your other Crossbow goods are worth +2 Gold each.” */
  bonus += crossbow * heavyCrossbow * 2;

  return bonus;
}

/**
 * คำอธิบายมูลค่าแผงท้ายเกม (ไทย): ค่าพิมพ์บวกกัน + แต่ละเทอมโบนัสคูณแล้วนำมาบวก
 */
export function goodsValueScoreExplanationTh(stall: SheriffCard[], meta: GoodsMeta): string {
  if (stall.length === 0) {
    return 'ไม่มีการ์ดบนแผง — มูลค่าแผงจากสินค้า = 0';
  }
  const printed = stall.reduce((sum, c) => sum + meta[c.type].value, 0);
  const n = countByType(stall);
  const pairParts: string[] = [];

  const mead = n.get('mead') ?? 0;
  const strawberryMead = n.get('strawberry_mead') ?? 0;
  if (mead > 0 && strawberryMead > 0) {
    pairParts.push(`เมด ${mead} × สตรอว์เบอร์รีมีด ${strawberryMead} = +${mead * strawberryMead}`);
  }

  const pepper = n.get('pepper') ?? 0;
  const dragonPepper = n.get('dragon_pepper') ?? 0;
  if (pepper > 0 && dragonPepper > 0) {
    pairParts.push(`พริกไทย ${pepper} × พริกมังกร ${dragonPepper} = +${pepper * dragonPepper}`);
  }

  const silk = n.get('silk') ?? 0;
  const goldenSilk = n.get('golden_silk') ?? 0;
  if (silk > 0 && goldenSilk > 0) {
    pairParts.push(`ไหม ${silk} × ไหมทอง ${goldenSilk} = +${silk * goldenSilk}`);
  }

  const crossbow = n.get('crossbow') ?? 0;
  const heavyCrossbow = n.get('heavy_crossbow') ?? 0;
  if (crossbow > 0 && heavyCrossbow > 0) {
    const v = crossbow * heavyCrossbow * 2;
    pairParts.push(
      `หน้าไม้ ${crossbow} × หน้าไม้หนัก ${heavyCrossbow} × 2 = +${v} (หน้าไม้อื่นแต่ละใบ +2)`,
    );
  }

  const syn = synergyBonusGold(stall);
  let s = `ค่าพิมพ์บนการ์ดทุกใบบนแผงบวกกัน = ${printed}`;
  if (pairParts.length > 0) {
    s += ` · แล้วบวกโบนัสจากคู่การ์ด: ${pairParts.join(' · ')} (รวมโบนัสคู่ +${syn})`;
  }
  s += ` → มูลค่าแผงรวม ${printed + syn}`;
  return s;
}
