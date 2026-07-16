import type { UndercoverPlayerView } from 'shared';
import { GroupAcknowledgeGate } from '../../components/session-sync';

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
    <GroupAcknowledgeGate
      className="card uc-panel uc-elimination"
      title="ผลการคัดออก"
      acknowledged={false}
      onAcknowledge={onAcknowledge}
      progress={{ current: ack.current, total: ack.total }}
    >
      <p className="uc-elimination-name">{reveal.playerName}</p>
      <p className="uc-elimination-message">ถูกคัดออกจากเกม</p>
    </GroupAcknowledgeGate>
  );
}
