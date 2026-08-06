import type { ExplodingKittensPlayerView } from 'shared';

export type FrontRowBadge = {
  key: string;
  label: string;
  title: string;
  variant: 'ill-take' | 'tower' | 'barking';
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
      label: 'Barking รอคู่',
      title: 'Barking Kitten วางค้าง — รอใบคู่หรือชนคนอื่น',
      variant: 'barking',
    });
  }
  return out;
}
