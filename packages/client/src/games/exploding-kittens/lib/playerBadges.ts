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

export function buildTurnCellClass(
  gs: ExplodingKittensPlayerView,
  p: ExplodingKittensPlayerView['players'][number],
  frontBadges: FrontRowBadge[],
): string {
  const mods = ['ek-turn-cell'];
  if (p.id === gs.currentPlayerId) mods.push('is-current');
  if (!p.alive) mods.push('is-dead');
  if (frontBadges.length > 0) mods.push('has-front-badges');
  if (frontBadges.some((b) => b.variant === 'ill-take')) mods.push('has-ill-take-wait');
  else if (frontBadges.some((b) => b.variant === 'tower')) mods.push('has-tower-front');
  else if (frontBadges.some((b) => b.variant === 'barking')) mods.push('has-barking-front');
  return mods.join(' ');
}

export function spotlightColClass(
  gs: ExplodingKittensPlayerView,
  player: { id: string; alive: boolean } | null | undefined,
): string {
  if (!player?.alive) return '';
  const fb = getPlayerFrontRowBadges(gs, player.id, true);
  if (fb.length === 0) return '';
  if (fb.some((b) => b.variant === 'ill-take')) return ' ek-turn-spotlight__col--ill-take-wait';
  if (fb.some((b) => b.variant === 'tower')) return ' ek-turn-spotlight__col--tower-front';
  if (fb.some((b) => b.variant === 'barking')) return ' ek-turn-spotlight__col--barking-front';
  return '';
}

/** ขอบ/พื้นหลัง chip ใน modal ลำดับโต๊ะ */
export function modalTurnChipFrontClass(
  gs: ExplodingKittensPlayerView,
  p: ExplodingKittensPlayerView['players'][number],
): string {
  if (!p.alive) return '';
  const fb = getPlayerFrontRowBadges(gs, p.id, true);
  if (fb.length === 0) return '';
  if (fb.some((b) => b.variant === 'ill-take')) return ' ek-modal-turn-chip--ill-take-wait';
  if (fb.some((b) => b.variant === 'tower')) return ' ek-modal-turn-chip--tower-front';
  if (fb.some((b) => b.variant === 'barking')) return ' ek-modal-turn-chip--barking-front';
  return '';
}
