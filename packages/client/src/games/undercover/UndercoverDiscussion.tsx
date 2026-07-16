import type { UndercoverPublicPlayer } from 'shared';
import { Button } from '../../components/ui';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';

type Props = {
  players: UndercoverPublicPlayer[];
  timerEnabled: boolean;
  discussionEndsAtMs: number | null;
  isHost: boolean;
  onStartVoting: () => void;
};

export function UndercoverDiscussion({
  players,
  timerEnabled,
  discussionEndsAtMs,
  isHost,
  onStartVoting,
}: Props) {
  const active = players.filter((p) => !p.eliminated);
  const { label: remain } = useDeadlineCountdown(timerEnabled ? discussionEndsAtMs : null);

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
