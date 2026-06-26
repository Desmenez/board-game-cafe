import type { SplendorCardView, SplendorGems } from 'shared';
import { Button } from '../../components/ui';
import { SplendorCardFace } from './SplendorCardFace';
import { canAffordCard, costBreakdownText } from './splendorUtils';

type Props = {
  level: 1 | 2 | 3;
  slot: number;
  card: SplendorCardView;
  gems: SplendorGems;
  gold: number;
  bonuses: SplendorGems;
  canReserve: boolean;
  onBuy: () => void;
  onReserve: () => void;
  onClose: () => void;
};

export function SplendorCardModal({
  level,
  card,
  gems,
  gold,
  bonuses,
  canReserve,
  onBuy,
  onReserve,
  onClose,
}: Props) {
  const canBuy = canAffordCard(card, gems, gold, bonuses);
  const costText = costBreakdownText(card, gems, gold, bonuses);

  return (
    <div
      className="splendor-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="splendor-card-modal-title"
      onClick={onClose}
    >
      <div className="splendor-modal" onClick={(e) => e.stopPropagation()}>
        <h3 id="splendor-card-modal-title">การ์ดระดับ {level}</h3>
        <SplendorCardFace card={card} size="modal" />
        <p className="splendor-card-modal__cost" role="status">
          {costText}
        </p>
        <div className="splendor-modal-actions">
          <Button type="button" variant="primary" disabled={!canBuy} onClick={onBuy}>
            ซื้อ
          </Button>
          <Button type="button" variant="secondary" disabled={!canReserve} onClick={onReserve}>
            จอง
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </div>
  );
}
