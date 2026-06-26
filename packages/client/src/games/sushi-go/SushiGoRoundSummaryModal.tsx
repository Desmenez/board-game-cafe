import type { SushiGoRoundSummary } from 'shared';
import { Button } from '../../components/ui';

type Props = {
  summary: SushiGoRoundSummary;
  playerNames: Record<string, string>;
  onContinue: () => void;
  isFinalRound: boolean;
};

export function SushiGoRoundSummaryModal({
  summary,
  playerNames,
  onContinue,
  isFinalRound,
}: Props) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sg-round-summary-title"
    >
      <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 id="sg-round-summary-title">สรุปรอบ {summary.roundNo}</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>{summary.reason}</p>
        <ul style={{ margin: '0 0 1rem', paddingLeft: '1.25rem' }}>
          {Object.entries(summary.roundPoints).map(([pid, pts]) => {
            const b = summary.breakdownByPlayer[pid];
            return (
              <li key={pid} style={{ marginBottom: '0.5rem' }}>
                <strong>{playerNames[pid] ?? pid}</strong>: +{pts}
                {b ? (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {' '}
                    (maki {b.maki}, tempura {b.tempura}, sashimi {b.sashimi}, dumpling {b.dumpling},
                    nigiri {b.nigiri})
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <Button variant="primary" onClick={onContinue}>
          {isFinalRound ? 'ดูผลเกม' : 'รอบถัดไป'}
        </Button>
      </div>
    </div>
  );
}
