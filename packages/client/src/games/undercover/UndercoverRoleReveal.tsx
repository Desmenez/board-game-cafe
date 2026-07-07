import type { UndercoverPlayerView, UndercoverRole } from 'shared';
import { Button } from '../../components/ui';
import { ucRoleCardClass } from './roleStyles';

const ROLE_LABEL: Record<UndercoverRole, string> = {
  civilian: 'Civilian (คนธรรมดา)',
  undercover: 'Undercover',
  mr_white: 'Mr. White',
};

const ROLE_HINT: Record<UndercoverRole, string> = {
  civilian: 'ให้คำใบ้โดยไม่พูดคำตรงๆ — ช่วยทีมจับคนที่มีคำต่าง',
  undercover: 'แฝงตัวให้เหมือนคนธรรมดา — คำของคุณต่างจากคนธรรมดา',
  mr_white: 'คุณไม่มีคำลับ — ฟังคำใบ้แล้วแสดงท่าว่ารู้คำ',
};

type Props = {
  view: UndercoverPlayerView;
  onAcknowledge: () => void;
};

export function UndercoverRoleReveal({ view, onAcknowledge }: Props) {
  const { you } = view;
  const role = you.role;
  const acked = view.roleAcknowledgeProgress;

  return (
    <div className="card uc-panel uc-role-reveal">
      <h2>เปิดบทบาท</h2>
      <p className="uc-muted">หมวด: {view.categoryLabel}</p>

      {role ? (
        <div className={ucRoleCardClass(role)}>
          <p className="uc-role-name">{ROLE_LABEL[role]}</p>
          {role === 'mr_white' ? (
            <p className="uc-role-word uc-role-word--none">ไม่มีคำลับ</p>
          ) : (
            <p className="uc-role-word">{you.secretWord}</p>
          )}
          <p className="uc-role-hint">{ROLE_HINT[role]}</p>
        </div>
      ) : (
        <p className="uc-muted">กำลังโหลดบทบาท…</p>
      )}

      <div className="uc-actions">
        <Button variant="primary" disabled={you.hasAcknowledgedRole} onClick={onAcknowledge}>
          {you.hasAcknowledgedRole ? 'รับทราบแล้ว' : 'รับทราบ'}
        </Button>
      </div>
      <p className="uc-progress">
        รับทราบแล้ว {acked.current}/{acked.total}
      </p>
    </div>
  );
}
