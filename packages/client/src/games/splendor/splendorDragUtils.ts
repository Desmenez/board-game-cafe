import type { SplendorGem, SplendorGems } from 'shared';
import { SPLENDOR_GEMS } from './splendorUtils';

export const SPLENDOR_PLAYER_DROP_ID = 'splendor-player-drop';
export const SPLENDOR_BANK_DROP_ID = 'splendor-bank-drop';
export const SPLENDOR_BANK_DRAG_PREFIX = 'bank';
export const SPLENDOR_PLAYER_DRAG_PREFIX = 'player';

export type SplendorBankHandItem = {
  id: SplendorGem;
  gem: SplendorGem;
  count: number;
};

export type SplendorPlayerTokenItem = {
  id: string;
  kind: SplendorGem | 'gold';
};

export function buildBankHandItems(bankGems: SplendorGems): SplendorBankHandItem[] {
  return SPLENDOR_GEMS.map((gem) => ({
    id: gem,
    gem,
    count: bankGems[gem],
  }));
}

/** Individual draggable tokens for return phase (excludes already-drafted returns). */
export function buildPlayerTokenItems(
  gems: SplendorGems,
  gold: number,
  returnDraft: SplendorGems & { gold: number },
): SplendorPlayerTokenItem[] {
  const items: SplendorPlayerTokenItem[] = [];
  for (const gem of SPLENDOR_GEMS) {
    const n = gems[gem] - returnDraft[gem];
    for (let i = 0; i < n; i++) {
      items.push({ id: `${gem}-${i}`, kind: gem });
    }
  }
  const goldN = gold - returnDraft.gold;
  for (let i = 0; i < goldN; i++) {
    items.push({ id: `gold-${i}`, kind: 'gold' });
  }
  return items;
}

export function parseBankDragId(activeId: string): SplendorGem | null {
  const prefix = `${SPLENDOR_BANK_DRAG_PREFIX}-`;
  if (!activeId.startsWith(prefix)) return null;
  const gem = activeId.slice(prefix.length) as SplendorGem;
  return SPLENDOR_GEMS.includes(gem) ? gem : null;
}

export function parsePlayerDragId(activeId: string): SplendorGem | 'gold' | null {
  const prefix = `${SPLENDOR_PLAYER_DRAG_PREFIX}-`;
  if (!activeId.startsWith(prefix)) return null;
  const rest = activeId.slice(prefix.length);
  if (rest.startsWith('gold-')) return 'gold';
  const gem = rest.split('-')[0] as SplendorGem;
  return SPLENDOR_GEMS.includes(gem) ? gem : null;
}

export function canTakeTwo(bankGems: SplendorGems, gem: SplendorGem): boolean {
  return bankGems[gem] >= 4;
}

export type TakeDraftResult =
  | { ok: true; action: 'add'; draft: SplendorGem[] }
  | { ok: true; action: 'take_two'; gem: SplendorGem }
  | { ok: false; message: string };

/** Apply a bank gem drop onto take draft (or trigger take_two). */
export function applyBankGemToTakeDraft(
  draft: SplendorGem[],
  gem: SplendorGem,
  bankGems: SplendorGems,
): TakeDraftResult {
  if (bankGems[gem] < 1) {
    return { ok: false, message: 'ธนาคารไม่มีอัญมณีสีนี้' };
  }
  if (draft.length === 1 && draft[0] === gem) {
    if (!canTakeTwo(bankGems, gem)) {
      return { ok: false, message: 'หยิบ 2 เม็ดสีเดียวได้เมื่อธนาคารมีอย่างน้อย 4 เม็ด' };
    }
    return { ok: true, action: 'take_two', gem };
  }
  if (draft.includes(gem)) {
    return { ok: false, message: 'หยิบคนละสี — ไม่ซ้ำสีในรอบเดียวกัน' };
  }
  if (draft.length >= 3) {
    return { ok: false, message: 'หยิบได้สูงสุด 3 สี' };
  }
  return { ok: true, action: 'add', draft: [...draft, gem] };
}

export function validateTakeGemsConfirm(draft: SplendorGem[]): string | null {
  if (draft.length < 1 || draft.length > 3) return 'หยิบได้ 1–3 สี';
  if (new Set(draft).size !== draft.length) return 'ต้องเป็นคนละสี';
  return null;
}

export function applyPlayerTokenReturn(
  draft: SplendorGems & { gold: number },
  kind: SplendorGem | 'gold',
  myGems: SplendorGems,
  myGold: number,
  excess: number,
): { ok: true; draft: SplendorGems & { gold: number } } | { ok: false; message: string } {
  const currentSum = SPLENDOR_GEMS.reduce((s, g) => s + draft[g], 0) + draft.gold;
  if (currentSum >= excess) {
    return { ok: false, message: `คืนครบ ${excess} เม็ดแล้ว` };
  }
  if (kind === 'gold') {
    if (draft.gold >= myGold) return { ok: false, message: 'ไม่มีทองเหลือคืน' };
    return { ok: true, draft: { ...draft, gold: draft.gold + 1 } };
  }
  if (draft[kind] >= myGems[kind]) {
    return { ok: false, message: 'ไม่มีอัญมณีสีนี้เหลือคืน' };
  }
  return { ok: true, draft: { ...draft, [kind]: draft[kind] + 1 } };
}
