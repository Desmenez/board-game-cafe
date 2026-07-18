import type { ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';

type BarkingShow = NonNullable<ExplodingKittensPlayerView['barkingKittenShow']>;

type Props = {
  barkingShow: BarkingShow;
  aliveCount: number;
  hasAcked: boolean;
  onAck: () => void;
};

export function EkBarkingShowModal({ barkingShow, aliveCount, hasAcked, onAck }: Props) {
  return (
    <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
      <div className="modal ek-reaction-modal">
        <p className="ek-reaction-kicker">Barking Kitten</p>

        <div className="ek-reaction-nope-spotlight">
          <div className="ek-modal-card-preview ek-modal-card-preview--reaction-hero">
            <img
              src={CARD_IMAGE.barking_kitten}
              alt={CARD_LABEL.barking_kitten}
              className="ek-card-img"
              loading="lazy"
            />
          </div>
          <p className="ek-reaction-hero-caption">
            <strong>{barkingShow.actorName}</strong>
            <span className="ek-reaction-hero-action"> · เล่นการ์ดนี้</span>
            <span className="ek-reaction-hero-sub"> · ทุกคนเห็น · ใช้ Nope ไม่ได้</span>
          </p>
        </div>

        <p className="ek-reaction-one-liner">
          <span className="ek-reaction-one-liner-label">หมายเหตุ</span>{' '}
          <strong className="text-white text-base">
            ไม่ใช่ช่วง Reaction — ไม่มี Nope / Pass
          </strong>
        </p>

        <p className="ek-reaction-progress">
          รับทราบแล้ว {barkingShow.acknowledgedBy.length}/{aliveCount} คน
        </p>

        <div
          className="ek-reaction-actions"
          style={{ gridTemplateColumns: '1fr', maxWidth: 280, margin: '8px auto 0' }}
        >
          <Button variant="primary" disabled={hasAcked} onClick={onAck}>
            {hasAcked ? 'รับทราบแล้ว' : 'รับทราบ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
