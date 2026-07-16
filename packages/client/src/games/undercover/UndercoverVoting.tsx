import type { UndercoverPublicPlayer } from 'shared';
import { PlayerTargetPicker } from '../../components/player-target';

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

  return (
    <PlayerTargetPicker
      className="card uc-panel"
      title={isTieBreak ? 'โหวตซ้ำ (เสมอ)' : 'โหวตลับ'}
      hint={
        <>
          <p className="uc-muted">เลือกคนที่จะคัดออก (ห้ามโหวตตัวเอง)</p>
          {isTieBreak ? (
            <p className="uc-muted uc-tie-hint">โหวตได้เฉพาะผู้ที่คะแนนเท่ากัน</p>
          ) : null}
        </>
      }
      options={targets.map((p) => ({ id: p.id, name: p.name }))}
      onSelect={onVote}
      submitted={yourVoteSubmitted}
      submittedContent={<p className="uc-muted">คุณโหวตแล้ว — รอผู้เล่นคนอื่น…</p>}
      progress={voteProgress}
      progressLabel="โหวตแล้ว"
    />
  );
}
