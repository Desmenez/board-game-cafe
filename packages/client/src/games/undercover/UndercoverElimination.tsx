import type { UndercoverPlayerView, UndercoverRole } from 'shared';
import { Button } from '../../components/ui';
import { ucRoleCardClass } from './roleStyles';

const ROLE_LABEL: Record<UndercoverRole, string> = {
  civilian: 'Civilian (คนธรรมดา)',
  undercover: 'Undercover',
  mr_white: 'Mr. White',
};

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
      <div className={ucRoleCardClass(reveal.role)}>
        <p className="uc-role-name">{ROLE_LABEL[reveal.role]}</p>
        {reveal.word ? <p className="uc-role-word">คำลับ: {reveal.word}</p> : null}
      </div>

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
