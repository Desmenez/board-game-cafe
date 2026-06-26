import { useMemo } from 'react';
import type { SplendorCardView, SplendorGems } from 'shared';
import { Button } from '../../components/ui';
import { SplendorCardFace } from './SplendorCardFace';
import {
  buildReserveDockSlots,
  canAffordCard,
  costBreakdownText,
  reservedCount,
} from './splendorUtils';

type Props = {
  reservedSlots: Array<SplendorCardView | { hidden: true } | null>;
  gems: SplendorGems;
  gold: number;
  bonuses: SplendorGems;
  canActPlaying: boolean;
  selectedReservedId: string | null;
  onSelectReserved: (cardId: string) => void;
  onBuyReserved: () => void;
};

export function SplendorPlayDock({
  reservedSlots,
  gems,
  gold,
  bonuses,
  canActPlaying,
  selectedReservedId,
  onSelectReserved,
  onBuyReserved,
}: Props) {
  const dockSlots = useMemo(() => buildReserveDockSlots(reservedSlots), [reservedSlots]);
  const filled = reservedCount(reservedSlots);

  const selectedCard = useMemo(() => {
    if (!selectedReservedId) return null;
    for (const slot of dockSlots) {
      if (slot.kind === 'card' && slot.card.id === selectedReservedId) return slot.card;
    }
    return null;
  }, [dockSlots, selectedReservedId]);

  const canBuy =
    canActPlaying &&
    selectedCard !== null &&
    canAffordCard(selectedCard, gems, gold, bonuses);

  return (
    <section className="card splendor-play-dock" aria-label="การ์ดที่จอง">
      <h2 className="splendor-play-dock__title">การ์ดที่จอง ({filled}/3)</h2>

      <p className="splendor-play-dock__hint">
        {canActPlaying
          ? filled > 0
            ? 'คลิกการ์ดเพื่อเลือก แล้วกดซื้อ'
            : 'แตะการ์ดบนกระดานเพื่อจอง (สูงสุด 3 ใบ)'
          : filled > 0
            ? `จอง ${filled}/3`
            : 'ยังไม่มีการ์ดจอง'}
      </p>

      {canActPlaying && selectedCard && (
        <p className="splendor-play-dock__cost" role="status">
          {costBreakdownText(selectedCard, gems, gold, bonuses)}
        </p>
      )}

      {canActPlaying && (
        <Button type="button" variant="primary" disabled={!canBuy} onClick={onBuyReserved}>
          ซื้อการ์ดที่เลือก
        </Button>
      )}

      <div className="splendor-reserve-slots" aria-label="ช่องจอง">
        {dockSlots.map((item) => {
          if (item.kind === 'empty') {
            return (
              <div
                key={`empty-${item.slot}`}
                className="splendor-reserve-slot splendor-reserve-slot--empty"
                aria-label={`ช่องจอง ${item.slot + 1} ว่าง`}
              >
                <span className="splendor-reserve-slot__label">ว่าง</span>
              </div>
            );
          }

          const { card } = item;
          const isSelected = selectedReservedId === card.id;

          return (
            <SplendorCardFace
              key={card.id}
              card={card}
              size="hand"
              className={isSelected ? 'splendor-card-face--selected' : ''}
              onClick={canActPlaying ? () => onSelectReserved(card.id) : undefined}
              disabled={!canActPlaying}
            />
          );
        })}
      </div>
    </section>
  );
}
