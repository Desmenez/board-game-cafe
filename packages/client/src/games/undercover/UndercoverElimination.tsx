import type { UndercoverPlayerView } from 'shared';
import { Button } from '../../components/ui';

type Props = {
  view: UndercoverPlayerView;
  onAcknowledge: () => void;
};

export function UndercoverElimination({ view, onAcknowledge }: Props) {
  const reveal = view.eliminationReveal;
  const ack = view.eliminationAckProgress;

  if (!reveal) {
    return (
      <div className="card uc-panel">
        <p className="uc-muted">กำลังสรุปผล…</p>
      </div>
    );
  }

  return (
    <div className="card uc-panel uc-elimination">
      <h2>ผลการคัดออก</h2>
      <p className="uc-elimination-name">{reveal.playerName}</p>
      <p className="uc-elimination-message">ถูกคัดออกจากเกม</p>

      <div className="uc-actions">
        <Button variant="primary" onClick={onAcknowledge}>
          รับทราบ
        </Button>
      </div>
      <p className="uc-progress">
        รับทราบแล้ว {ack.current}/{ack.total}
      </p>
    </div>
  );
}
