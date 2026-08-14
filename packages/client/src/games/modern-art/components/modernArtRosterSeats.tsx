import type { ReactNode } from 'react';
import { Banknote, Hand, Landmark } from 'lucide-react';
import type { ModernArtPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';

export function buildModernArtRosterSeats(view: ModernArtPlayerView): RosterSeat[] {
  return view.seats.map((s) => {
    const isFocus =
      (view.phase === 'offer' && s.isAuctioneer) ||
      (view.phase === 'double_wait' && view.doubleWait?.currentChooserId === s.id) ||
      (view.phase === 'set_price' && s.isAuctioneer) ||
      (view.phase === 'auction' &&
        ((view.auction?.kind === 'once_around' && view.auction.nextBidderId === s.id) ||
          (view.auction?.kind === 'fixed' && view.auction.nextBuyerId === s.id)));

    const badges = (
      <>
        {s.isAuctioneer && view.phase !== 'game_over' ? (
          <Badge size="sm" variant="outline" title="ถือค้อน">
            ค้อน
          </Badge>
        ) : null}
        {view.auction?.kind === 'sealed' && s.submittedSealed ? (
          <Badge size="sm" variant="outline" title="ส่งซองแล้ว">
            ส่งซอง
          </Badge>
        ) : null}
      </>
    );

    return {
      id: s.id,
      name: s.name,
      active: isFocus && view.phase !== 'game_over' && view.phase !== 'round_scoring',
      badges,
      status: (
        <span className="ma-roster-stats">
          <span className="ma-roster-stat" title="การ์ดในมือ" aria-label={`มือ ${s.handCount}`}>
            <Hand size={12} strokeWidth={2.25} aria-hidden />
            <span className="tabular-nums">{s.handCount}</span>
          </span>
          <span
            className={s.gallery.length > 0 ? 'ma-roster-stat ma-roster-stat--on' : 'ma-roster-stat'}
            title="ภาพที่ซื้อรอบนี้"
            aria-label={`พิพิธภัณฑ์ ${s.gallery.length}`}
          >
            <Landmark size={12} strokeWidth={2.25} aria-hidden />
            <span className="tabular-nums">{s.gallery.length}</span>
          </span>
        </span>
      ),
    };
  });
}

export function MoneyChip({ amount, label }: { amount: number; label?: ReactNode }) {
  return (
    <span
      className="ma-money"
      title="เงินของคุณ — คนอื่นมองไม่เห็น"
      aria-label={`เงินของคุณ $${amount}`}
    >
      <Banknote size={16} strokeWidth={2.25} aria-hidden />
      <span className="ma-money__label">{label ?? 'เงินคุณ'}</span>
      <span className="ma-money__amount tabular-nums">${amount}</span>
    </span>
  );
}
