import { Button } from '../../components/ui';
import { SplendorCardFace } from './SplendorCardFace';

type Props = {
  level: 1 | 2 | 3;
  deckCount: number;
  canReserve: boolean;
  onReserve: () => void;
  onClose: () => void;
};

export function SplendorDeckModal({
  level,
  deckCount,
  canReserve,
  onReserve,
  onClose,
}: Props) {
  return (
    <div
      className="splendor-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="splendor-deck-modal-title"
      onClick={onClose}
    >
      <div className="splendor-modal" onClick={(e) => e.stopPropagation()}>
        <h3 id="splendor-deck-modal-title">กองการ์ดระดับ {level}</h3>
        <p className="splendor-deck-modal__hint">คงเหลือ {deckCount} ใบ · การ์ดบนสุดยังไม่เปิด</p>
        <SplendorCardFace level={level} faceDown size="modal" />
        <div className="splendor-modal-actions">
          <Button type="button" variant="primary" disabled={!canReserve} onClick={onReserve}>
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
