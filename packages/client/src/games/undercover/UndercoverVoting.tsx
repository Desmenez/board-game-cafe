import type { UndercoverPublicPlayer } from 'shared';
import { Button } from '../../components/ui';

type Props = {
  players: UndercoverPublicPlayer[];
  myId: string;
  voteProgress: { done: number; total: number };
  yourVoteSubmitted: boolean;
  tieBreakCandidates: { id: string; name: string }[];
  isTieBreak: boolean;
  onVote: (targetId: string) => void;
};

export function UndercoverVoting({
  players,
  myId,
  voteProgress,
  yourVoteSubmitted,
  tieBreakCandidates,
  isTieBreak,
  onVote,
}: Props) {
  const active = players.filter((p) => !p.eliminated && p.id !== myId);
  const targets = isTieBreak
    ? active.filter((p) => tieBreakCandidates.some((c) => c.id === p.id))
    : active;

  if (yourVoteSubmitted) {
    return (
      <div className="card uc-panel">
        <h2>{isTieBreak ? 'โหวตซ้ำ (เสมอ)' : 'โหวตลับ'}</h2>
        <p className="uc-muted">คุณโหวตแล้ว — รอผู้เล่นคนอื่น…</p>
        <p className="uc-progress">
          โหวตแล้ว {voteProgress.done}/{voteProgress.total}
        </p>
      </div>
    );
  }

  return (
    <div className="card uc-panel">
      <h2>{isTieBreak ? 'โหวตซ้ำ (เสมอ)' : 'โหวตลับ'}</h2>
      <p className="uc-muted">เลือกคนที่จะคัดออก (ห้ามโหวตตัวเอง)</p>
      {isTieBreak ? <p className="uc-muted uc-tie-hint">โหวตได้เฉพาะผู้ที่คะแนนเท่ากัน</p> : null}

      <div className="uc-vote-grid">
        {targets.map((p) => (
          <Button key={p.id} variant="secondary" onClick={() => onVote(p.id)}>
            {p.name}
          </Button>
        ))}
      </div>
      <p className="uc-progress">
        โหวตแล้ว {voteProgress.done}/{voteProgress.total}
      </p>
    </div>
  );
}
