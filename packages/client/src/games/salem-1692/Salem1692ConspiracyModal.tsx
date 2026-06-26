import type { Salem1692TryalCard } from 'shared';
import { Button } from '../../components/ui';
import { Salem1692TryalRow } from './Salem1692TryalRow';

type Props = {
  revealerName: string;
  blackCatHolderId: string | null;
  myId: string;
  myTryals: Salem1692TryalCard[];
  needsReveal: boolean;
  awaitingView: boolean;
  onRevealTryal: (tryalId: string) => void;
  onAckView: () => void;
};

export function Salem1692ConspiracyModal({
  revealerName,
  blackCatHolderId,
  myId,
  myTryals,
  needsReveal,
  awaitingView,
  onRevealTryal,
  onAckView,
}: Props) {
  const isBlackCatHolder = blackCatHolderId === myId;
  const unrevealed = myTryals.filter((t) => !t.revealed);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-conspiracy-title"
    >
      <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 id="s1692-conspiracy-title">Conspiracy</h2>
        <p>{revealerName} เปิด Conspiracy — ส่ง Tryal ซ้าย</p>

        {needsReveal && isBlackCatHolder && (
          <>
            <p>Black Cat holder — เลือก Tryal 1 ใบเพื่อเปิด</p>
            <div className="s1692-modal-grid">
              {unrevealed.map((t) => (
                <Button key={t.id} type="button" onClick={() => onRevealTryal(t.id)}>
                  เปิด {t.id.slice(-4)}
                </Button>
              ))}
            </div>
          </>
        )}

        {awaitingView && <Salem1692TryalRow tryals={myTryals} title="Tryal ของคุณ (หลังส่ง)" />}

        <Button type="button" onClick={onAckView}>
          {needsReveal && isBlackCatHolder ? 'ดู Tryal ที่ส่งมา' : 'ยืนยัน — ส่ง Tryal ซ้าย'}
        </Button>
      </div>
    </div>
  );
}
