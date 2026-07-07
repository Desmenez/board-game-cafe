import type { UndercoverPlayerView } from 'shared';
import { Button } from '../../components/ui';

type Props = {
  view: UndercoverPlayerView;
  onAcknowledge: () => void;
};

export function UndercoverRoleReveal({ view, onAcknowledge }: Props) {
  const { you } = view;
  const acked = view.roleAcknowledgeProgress;
  const hasWord = you.secretWord != null && you.secretWord.length > 0;

  return (
    <div className="card uc-panel uc-role-reveal">
      <h2>เปิดดูคำของคุณ</h2>
      <p className="uc-muted">หมวด: {view.categoryLabel}</p>

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
