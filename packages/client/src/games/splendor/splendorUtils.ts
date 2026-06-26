import type { SplendorCardView, SplendorGem, SplendorGems } from 'shared';

export const SPLENDOR_GEMS: SplendorGem[] = ['white', 'blue', 'green', 'red', 'black'];

export const GEM_SHORT: Record<SplendorGem, string> = {
  white: 'ขาว',
  blue: 'น้ำเงิน',
  green: 'เขียว',
  red: 'แดง',
  black: 'ดำ',
};

export function emptyGems(): SplendorGems {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

export function sumGems(g: SplendorGems): number {
  return SPLENDOR_GEMS.reduce((s, k) => s + g[k], 0);
}

export function totalHeld(gems: SplendorGems, gold: number): number {
  return sumGems(gems) + gold;
}

export function effectiveCost(card: SplendorCardView, bonuses: SplendorGems): SplendorGems {
  const e = emptyGems();
  for (const g of SPLENDOR_GEMS) e[g] = Math.max(0, card.cost[g] - bonuses[g]);
  return e;
}

export function cardLabel(card: SplendorCardView): string {
  return `การ์ดระดับ ${card.level} · ${card.prestige} แต้ม`;
}

export type SplendorPaymentPlan = {
  effective: SplendorGems;
  fromGems: SplendorGems;
  goldNeeded: number;
};

export function planPayment(
  card: SplendorCardView,
  gems: SplendorGems,
  _gold: number,
  bonuses: SplendorGems,
): SplendorPaymentPlan {
  const effective = effectiveCost(card, bonuses);
  const fromGems = emptyGems();
  let goldNeeded = 0;
  for (const g of SPLENDOR_GEMS) {
    const use = Math.min(gems[g], effective[g]);
    fromGems[g] = use;
    goldNeeded += effective[g] - use;
  }
  return { effective, fromGems, goldNeeded };
}

export function canAffordCard(
  card: SplendorCardView,
  gems: SplendorGems,
  gold: number,
  bonuses: SplendorGems,
): boolean {
  const { goldNeeded } = planPayment(card, gems, gold, bonuses);
  return goldNeeded <= gold;
}

export function costBreakdownText(
  card: SplendorCardView,
  gems: SplendorGems,
  gold: number,
  bonuses: SplendorGems,
): string {
  const { effective, fromGems, goldNeeded } = planPayment(card, gems, gold, bonuses);
  const parts: string[] = [];
  for (const g of SPLENDOR_GEMS) {
    if (effective[g] > 0) {
      parts.push(`${GEM_SHORT[g]} ${fromGems[g]}${effective[g] > fromGems[g] ? `+ทอง` : ''}`);
    }
  }
  if (goldNeeded > 0) parts.push(`ทอง ${goldNeeded}`);
  if (parts.length === 0) return 'ซื้อฟรี (โบนัสพอ)';
  const afford = canAffordCard(card, gems, gold, bonuses);
  return `${parts.join(' · ')}${afford ? '' : ' — อัญมณีไม่พอ'}`;
}

/** Client-only dock slot — empty placeholder or reserved card */
export type SplendorReserveDockSlot =
  | { kind: 'empty'; slot: number }
  | { kind: 'card'; slot: number; card: SplendorCardView };

export function buildReserveDockSlots(
  reservedSlots: Array<SplendorCardView | { hidden: true } | null>,
): SplendorReserveDockSlot[] {
  return [0, 1, 2].map((slot) => {
    const entry = reservedSlots[slot];
    if (entry !== null && !('hidden' in entry)) {
      return { kind: 'card' as const, slot, card: entry };
    }
    return { kind: 'empty' as const, slot };
  });
}

export function reservedCount(
  reservedSlots: Array<SplendorCardView | { hidden: true } | null>,
): number {
  return reservedSlots.filter(Boolean).length;
}
