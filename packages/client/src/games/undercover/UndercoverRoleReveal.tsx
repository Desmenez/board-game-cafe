import type { UndercoverPlayerView } from 'shared';
import { GroupAcknowledgeGate } from '../../components/session-sync';

type Props = {
  view: UndercoverPlayerView;
  onAcknowledge: () => void;
};

export function UndercoverRoleReveal({ view, onAcknowledge }: Props) {
  const { you } = view;
  const acked = view.roleAcknowledgeProgress;
  const hasWord = you.secretWord != null && you.secretWord.length > 0;

  return (
    <GroupAcknowledgeGate
      className="card uc-panel uc-role-reveal"
      title="เปิดดูคำของคุณ"
      subtitle={<p className="uc-muted">หมวด: {view.categoryLabel}</p>}
      acknowledged={you.hasAcknowledgedRole}
      onAcknowledge={onAcknowledge}
      progress={{ current: acked.current, total: acked.total }}
    >
      <div className="uc-word-card">
        {hasWord ? (
          <p className="uc-word-card__word">{you.secretWord}</p>
        ) : (
          <p className="uc-word-card__empty">การ์ดว่าง — ไม่มีคำบนการ์ด</p>
        )}
        <p className="uc-word-card__hint">
          {hasWord
            ? 'จำคำนี้ไว้ — ให้คำใบ้โดยไม่พูดคำตรงๆ'
            : 'ฟังคำใบ้ของคนอื่นแล้วแสดงท่าว่ารู้คำ'}
        </p>
      </div>
    </GroupAcknowledgeGate>
  );
}
