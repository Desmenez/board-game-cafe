import type { UndercoverPlayerView } from 'shared';
import { Button } from '../../components/ui';

function formatRemain(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s} วิ`;
}

type Props = {
  view: UndercoverPlayerView;
  myId: string;
  isHost: boolean;
  now: number;
  onComplete: () => void;
  onSkip: () => void;
};

export function UndercoverClueRound({ view, myId, isHost, now, onComplete, onSkip }: Props) {
  const { clueTurn } = view;
  const isMyTurn = clueTurn.currentPlayerId === myId;
  const remain = view.clueEndsAtMs != null ? formatRemain(view.clueEndsAtMs - now) : null;

  return (
    <div className="card uc-panel">
      <h2>
        รอบคำใบ้ {clueTurn.clueRoundNo}/{clueTurn.maxClueRounds}
      </h2>
      <p className="uc-muted">พูดคำใบ้นอกแอป (ห้ามพูดคำตรงๆ) แล้วกดเสร็จเมื่อจบ</p>

      <div className="uc-clue-turn">
        <span className="uc-clue-turn__label">ถึงตา</span>
        <span className="uc-clue-turn__name">{clueTurn.currentPlayerName ?? '—'}</span>
        <span className="uc-clue-turn__order">
          {clueTurn.index}/{clueTurn.total}
        </span>
      </div>

      {view.timerEnabled && remain != null ? <p className="uc-timer">เหลือ {remain}</p> : null}

      <div className="uc-actions">
        {isMyTurn ? (
          <Button variant="primary" onClick={onComplete}>
            เสร็จแล้ว
          </Button>
        ) : (
          <p className="uc-muted">รอ {clueTurn.currentPlayerName} ให้คำใบ้…</p>
        )}
        {isHost ? (
          <Button variant="secondary" onClick={onSkip}>
            ข้ามผู้เล่น (หัวห้อง)
          </Button>
        ) : null}
      </div>
    </div>
  );
}
