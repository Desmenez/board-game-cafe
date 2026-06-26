import type { SpyfallPendingAccusationView, SpyfallPublicPlayer } from 'shared';

type Props = {
  players: SpyfallPublicPlayer[];
  myId: string;
  pending: SpyfallPendingAccusationView;
  onVote: (suspectId: string) => void;
};

export function SpyfallAccusationPanel({ players, myId, pending, onVote }: Props) {
  const hasVoted = pending.votes[myId] != null;
  const isTimerMode = pending.mode === 'timer_end';

  return (
    <div className="sf-panel">
      <h2>{isTimerMode ? 'หมดเวลา — โหวตจับ Spy' : 'โหวตแจ้งสงสัย'}</h2>
      {!isTimerMode && pending.suspectName ? (
        <p style={{ marginBottom: '0.75rem' }}>
          {pending.initiatorName} แจ้งสงสัย <strong>{pending.suspectName}</strong> — ทุกคนต้องโหวตเห็นพ้อง
        </p>
      ) : (
        <p style={{ marginBottom: '0.75rem' }}>เลือกว่าใครคือ Spy</p>
      )}
      <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', marginBottom: '1rem' }}>
        โหวตแล้ว {pending.voteProgress.done}/{pending.voteProgress.total}
      </p>

      {!hasVoted ? (
        <div className="sf-player-grid">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              className="sf-player-chip"
              onClick={() => onVote(p.id)}
            >
              <span className="sf-player-chip__name">{p.name}</span>
              <span className="sf-player-chip__meta">โหวตว่าเป็น Spy</span>
            </button>
          ))}
        </div>
      ) : (
        <p>คุณโหวตแล้ว — รอผู้เล่นอื่น</p>
      )}
    </div>
  );
}
