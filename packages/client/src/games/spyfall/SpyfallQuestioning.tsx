import type { SpyfallPublicPlayer } from 'shared';
import { Button } from '../../components/ui';

type Props = {
  players: SpyfallPublicPlayer[];
  myId: string;
  currentAskerId: string | null;
  lastAskerId: string | null;
  canAccuse: boolean;
  accusationUsedByMe: boolean;
  canSpyReveal: boolean;
  onAsk: (targetId: string) => void;
  onAccuse: (suspectId: string) => void;
  onSpyReveal: () => void;
};

export function SpyfallQuestioning({
  players,
  myId,
  currentAskerId,
  lastAskerId,
  canAccuse,
  accusationUsedByMe,
  canSpyReveal,
  onAsk,
  onAccuse,
  onSpyReveal,
}: Props) {
  const isMyTurn = currentAskerId === myId;
  const currentAsker = players.find((p) => p.id === currentAskerId);

  return (
    <div className="sf-panel">
      <h2>ถาม-ตอบ</h2>
      <p style={{ marginBottom: '0.75rem' }}>
        ผู้ถามปัจจุบัน:{' '}
        <strong>{currentAsker?.name ?? '—'}</strong>
        {isMyTurn ? ' (คุณ)' : ''}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        เลือกผู้เล่นเพื่อส่งเทิร์นถาม — พูดคำถามนอกแอป
      </p>

      <div className="sf-player-grid">
        {players.map((p) => {
          const isSelf = p.id === myId;
          const isLastAsker = p.id === lastAskerId;
          const canAsk = isMyTurn && !isSelf && !isLastAsker;
          const canAccuseThis = canAccuse && !accusationUsedByMe && !isSelf;

          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <button
                type="button"
                className={[
                  'sf-player-chip',
                  p.id === currentAskerId ? 'sf-player-chip--active' : '',
                  p.isDealer ? 'sf-player-chip--dealer' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!canAsk}
                onClick={() => onAsk(p.id)}
              >
                <span className="sf-player-chip__name">{p.name}</span>
                <span className="sf-player-chip__meta">
                  {p.isDealer ? 'Dealer · ' : ''}
                  {p.id === currentAskerId ? 'กำลังถาม' : canAsk ? 'ส่งเทิร์น' : ''}
                </span>
              </button>
              {canAccuseThis ? (
                <Button variant="secondary" size="sm" onClick={() => onAccuse(p.id)}>
                  แจ้งสงสัย
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {canSpyReveal ? (
        <div className="sf-actions">
          <Button variant="danger" onClick={onSpyReveal}>
            เปิดตัว Spy — ทายสถานที่
          </Button>
        </div>
      ) : null}
    </div>
  );
}
