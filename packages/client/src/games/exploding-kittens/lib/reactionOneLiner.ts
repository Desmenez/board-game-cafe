import type { ExplodingKittensPlayerView } from 'shared';
import { CARD_LABEL } from './cardMeta';

/** หนึ่งบรรทัด: ใคร · การ์ด / คำอธิบายแอ็กชัน · ใส่ใคร */
export function getReactionOneLiner(gs: ExplodingKittensPlayerView): string {
  const pa = gs.pendingAction;
  if (!pa) return '';
  const tn = pa.targetId ? (gs.players.find((p) => p.id === pa.targetId)?.name ?? '') : '';

  if (pa.type === 'pair_steal' && tn) {
    return `${pa.actorName} · ขอสุ่มการ์ดบนมือ · ใส่ ${tn}`;
  }
  if (pa.type === 'three_claim' && tn) {
    const want = pa.requestedType ? CARD_LABEL[pa.requestedType] : '';
    const mid = want ? `ขอเลือกการ์ด ${want} บนมือ: ` : 'ขอเลือกการ์ดบนมือ';
    return `${pa.actorName} · ${mid} · ใส่ ${tn}`;
  }
  if (pa.type === 'five_cats') {
    const played =
      pa.playedCardTypes && pa.playedCardTypes.length > 0
        ? pa.playedCardTypes.map((t) => CARD_LABEL[t]).join(' + ')
        : '';
    const mid = played
      ? `ขอเลือกหยิบการ์ดจากกองทิ้ง · เล่น ${played}`
      : 'ขอเลือกหยิบการ์ดจากกองทิ้ง';
    return `${pa.actorName} · ${mid}`;
  }
  if (pa.type === 'ill_take' && tn) {
    return `${pa.actorName} · I'll Take That · ใส่ ${tn}`;
  }
  if (pa.type === 'tower_of_power') {
    return `${pa.actorName} · Tower of Power — สวมมงกุฎ`;
  }
  if (pa.type === 'bury') {
    return `${pa.actorName} · Bury — จั่วแล้วฝังกลับกอง`;
  }

  const cards =
    pa.playedCardTypes && pa.playedCardTypes.length > 0
      ? pa.playedCardTypes.map((t) => CARD_LABEL[t]).join(' + ')
      : '';
  const mid = cards || pa.type;
  if (tn) return `${pa.actorName} · ${mid} · ใส่ ${tn}`;
  return `${pa.actorName} · ${mid}`;
}
