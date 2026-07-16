import type { SpyfallPendingAccusationView, SpyfallPublicPlayer } from 'shared';
import { PlayerTargetPicker } from '../../components/player-target';

type Props = {
  players: SpyfallPublicPlayer[];
  myId: string;
  pending: SpyfallPendingAccusationView;
  onVote: (suspectId: string) => void;
};

export function SpyfallAccusationPanel({ players, myId, pending, onVote }: Props) {
  const hasVoted = pending.votes[myId] != null;
  const isTimerMode = pending.mode === 'timer_end';

  const hint =
    !isTimerMode && pending.suspectName ? (
      <p style={{ marginBottom: 0 }}>
        {pending.initiatorName} แจ้งสงสัย <strong>{pending.suspectName}</strong> —
        ทุกคนต้องโหวตเห็นพ้อง
      </p>
    ) : (
      <p style={{ marginBottom: 0 }}>เลือกว่าใครคือ Spy</p>
    );

  return (
    <PlayerTargetPicker
      className="sf-panel"
      title={isTimerMode ? 'หมดเวลา — โหวตจับ Spy' : 'โหวตแจ้งสงสัย'}
      hint={hint}
      options={players.map((p) => ({ id: p.id, name: p.name }))}
      onSelect={onVote}
      submitted={hasVoted}
      submittedContent={<p>คุณโหวตแล้ว — รอผู้เล่นอื่น</p>}
      progress={pending.voteProgress}
      progressLabel="โหวตแล้ว"
    />
  );
}
