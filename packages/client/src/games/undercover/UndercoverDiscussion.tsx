import type { UndercoverPublicPlayer } from 'shared';
import { Button } from '../../components/ui';

function formatRemain(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s} วิ`;
}

type Props = {
  players: UndercoverPublicPlayer[];
  timerEnabled: boolean;
  discussionEndsAtMs: number | null;
  now: number;
  isHost: boolean;
  onStartVoting: () => void;
};

export function UndercoverDiscussion({
  players,
  timerEnabled,
  discussionEndsAtMs,
  now,
  isHost,
  onStartVoting,
}: Props) {
  const active = players.filter((p) => !p.eliminated);
  const remain =
    timerEnabled && discussionEndsAtMs != null ? formatRemain(discussionEndsAtMs - now) : null;

  return (
    <div className="card uc-panel">
      <h2>อภิปราย</h2>
      <p className="uc-muted">พูดคุยหาคนที่น่าสงสัย — ไม่แสดงบทบาทหรือคำลับ</p>

      {remain != null ? <p className="uc-timer">เหลือ {remain}</p> : null}

      <ul className="uc-player-list">
        {active.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>

      {isHost ? (
        <div className="uc-actions">
          <Button variant="primary" onClick={onStartVoting}>
            เริ่มโหวต
          </Button>
        </div>
      ) : (
        <p className="uc-muted">รอหัวห้องเริ่มโหวต…</p>
      )}
    </div>
  );
}
