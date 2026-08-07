import type { ExplodingKittensPlayerView } from 'shared';
import { CARD_LABEL } from './cardMeta';

export type FrontRowBadge = {
  key: string;
  label: string;
  title: string;
  variant: 'ill-take' | 'tower' | 'barking' | 'blind' | 'mark';
};

/** โดน I'll Take That ค้าง — ยังไม่ถึงตาให้จั่วจบเทิร์น */
export function illTakeWaitingNotTheirTurn(
  gs: ExplodingKittensPlayerView,
  playerId: string,
): boolean {
  const pending = gs.illTakeBlockedTargets ?? [];
  if (pending.length === 0 || !pending.includes(playerId)) return false;
  return playerId !== gs.currentPlayerId;
}

export function getPlayerFrontRowBadges(
  gs: ExplodingKittensPlayerView,
  playerId: string,
  alive: boolean,
): FrontRowBadge[] {
  const out: FrontRowBadge[] = [];
  if (!alive) return out;
  if (illTakeWaitingNotTheirTurn(gs, playerId)) {
    out.push({
      key: 'ill',
      label: "I'll Take",
      title: "โดน I'll Take That — รอถึงตาถึงจั่วจบเทิร์น",
      variant: 'ill-take',
    });
  }
  if (playerId === gs.towerWearerId) {
    const n = gs.towerStashCount ?? 0;
    out.push({
      key: 'tower',
      label: n > 0 ? `Tower ×${n}` : 'Tower',
      title: 'Tower of Power — สวมมงกุฎ (การ์ดซ่อนในมงกุฎ)',
      variant: 'tower',
    });
  }
  if (playerId === gs.barkingLonerPlayerId) {
    out.push({
      key: 'bark',
      label: 'Barking',
      title: 'Barking Kitten วางค้าง — ถ้ามีคนเล่นใบคู่ คุณต้อง Defuse หรือระเบิด',
      variant: 'barking',
    });
  }
  if (playerId === gs.blindPlayerId) {
    out.push({
      key: 'blind',
      label: 'Blind',
      title: 'Curse of the Cat Butt — มือบอดจนกว่าจะจั่วสำเร็จโดยไม่ระเบิด',
      variant: 'blind',
    });
  }
  const marked = gs.markedCardsPublic?.find((m) => m.playerId === playerId);
  if (marked) {
    const cardName = CARD_LABEL[marked.cardType] ?? marked.cardType;
    out.push({
      key: 'mark',
      label: `Mark · ${cardName}`,
      title: `Marked — โชว์ ${cardName} หน้าออก`,
      variant: 'mark',
    });
  }
  return out;
}
