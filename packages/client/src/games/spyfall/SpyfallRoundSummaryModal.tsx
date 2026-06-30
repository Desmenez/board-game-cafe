import type { SpyfallPlayerView } from 'shared';
import { Button } from '../../components/ui';

type Props = {
  view: SpyfallPlayerView;
  onAck: () => void;
};

export function SpyfallRoundSummaryModal({ view, onAck }: Props) {
  const summary = view.lastRoundSummary;
  const reveal = view.roundReveal;

  if (!summary) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spyfall-round-summary-title"
    >
      <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 id="spyfall-round-summary-title">สรุปรอบ {summary.roundNo}</h2>
        <p style={{ marginBottom: '0.75rem' }}>{summary.reason}</p>
        <p style={{ marginBottom: '0.5rem' }}>
          Spy: <strong>{summary.spyName}</strong> · สถานที่: <strong>{summary.locationName}</strong>
        </p>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          {summary.spyWon ? 'Spy ชนะรอบนี้' : 'ทีมรู้สถานที่ชนะรอบนี้'}
        </p>

        {reveal ? (
          <div className="sf-reveal-grid" style={{ marginBottom: '1rem' }}>
            {view.players.map((p) => {
              const a = reveal.assignments[p.id];
              const isSpy = a?.isSpy ?? false;
              return (
                <div
                  key={p.id}
                  className={['sf-reveal-item', isSpy ? 'sf-reveal-item--spy' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <strong>{p.name}</strong>
                  <br />
                  {isSpy ? 'Spy' : reveal.locationName}
                  {!isSpy && a?.roleName && view.useRoles ? ` · ${a.roleName}` : ''}
                </div>
              );
            })}
          </div>
        ) : null}

        <div style={{ marginBottom: '1rem' }}>
          <strong>คะแนนรอบนี้</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            {Object.entries(summary.roundPoints).map(([pid, pts]) => {
              const name = view.players.find((p) => p.id === pid)?.name ?? pid;
              return (
                <li key={pid}>
                  {name}: +{pts}
                </li>
              );
            })}
          </ul>
        </div>

        <Button variant="primary" onClick={onAck}>
          {view.phase === 'game_over' ? 'ดูผลเกม' : 'รอบถัดไป'}
        </Button>
      </div>
    </div>
  );
}
