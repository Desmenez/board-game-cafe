import type { ExplodingKittensPlayerView } from 'shared';
import { CARD_LABEL } from './cardMeta';

/** สรุปการ์ด/แอ็กชันสั้น ๆ — ไม่รวมชื่อผู้เล่น (modal โชว์ avatar แยก) */
export function getReactionActionSummary(gs: ExplodingKittensPlayerView): string {
  const pa = gs.pendingAction;
  if (!pa) return '';

  if (pa.type === 'pair_steal') return 'ขอสุ่มการ์ดบนมือ';
  if (pa.type === 'three_claim') {
    const want = pa.requestedType ? CARD_LABEL[pa.requestedType] : '';
    return want ? `ขอเลือกการ์ด ${want} บนมือ` : 'ขอเลือกการ์ดบนมือ';
  }
  if (pa.type === 'five_cats') {
    const played =
      pa.playedCardTypes && pa.playedCardTypes.length > 0
        ? pa.playedCardTypes.map((t) => CARD_LABEL[t]).join(' + ')
        : '';
    return played
      ? `ขอเลือกหยิบการ์ดจากกองทิ้ง · เล่น ${played}`
      : 'ขอเลือกหยิบการ์ดจากกองทิ้ง';
  }
  if (pa.type === 'ill_take') return "I'll Take That";
  if (pa.type === 'tower_of_power') return 'Tower of Power — สวมมงกุฎ';
  if (pa.type === 'bury') return 'Bury — จั่วแล้วฝังกลับกอง';

  if (pa.playedCardTypes && pa.playedCardTypes.length > 0) {
    return pa.playedCardTypes.map((t) => CARD_LABEL[t]).join(' + ');
  }
  return pa.type;
}
