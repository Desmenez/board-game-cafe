import type { ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';

type BarkingShow = NonNullable<ExplodingKittensPlayerView['barkingKittenShow']>;

type Props = {
  barkingShow: BarkingShow;
  aliveCount: number;
  hasAcked: boolean;
  onAck: () => void;
};

export function EkBarkingShowModal({ barkingShow, aliveCount, hasAcked, onAck }: Props) {
  return (
    <EkModalShell
      title="Barking Kitten"
      kicker="เปิดเผยต่อทุกคน"
      media={<EkModalCard size="hero" cardType="barking_kitten" />}
      actors={{
        from: {
          id: barkingShow.actorId,
          name: barkingShow.actorName,
          role: 'ผู้เล่นการ์ด',
        },
      }}
      actionLine={{
        label: 'หมายเหตุ',
        value: 'ไม่ใช่ช่วง Reaction — ใช้ Nope ไม่ได้',
      }}
      footer={
        <Button variant="primary" disabled={hasAcked} onClick={onAck}>
          {hasAcked ? 'รับทราบแล้ว' : 'รับทราบ'}
        </Button>
      }
    >
      <p className="ek-modal-shell__hint">
        รับทราบแล้ว {barkingShow.acknowledgedBy.length}/{aliveCount} คน
      </p>
    </EkModalShell>
  );
}
