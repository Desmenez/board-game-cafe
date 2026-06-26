import type { SplendorCardView } from 'shared';
import { Button } from '../../components/ui';
import { SplendorCardFace } from './SplendorCardFace';

type Props = {
  level: 1 | 2 | 3;
  slot: number;
  card: SplendorCardView;
  canReserve: boolean;
  onBuy: () => void;
  onReserve: () => void;
  onClose: () => void;
};

export function SplendorCardModal({
  level,
  card,
  canReserve,
  onBuy,
  onReserve,
  onClose,
}: Props) {
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
        <div className="splendor-modal-actions">
          <Button type="button" variant="primary" onClick={onBuy}>
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
