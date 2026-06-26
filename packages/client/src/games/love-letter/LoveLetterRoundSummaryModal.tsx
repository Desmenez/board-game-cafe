import type { LoveLetterRoundSummary } from 'shared';
import { Button } from '../../components/ui';
import { LoveLetterCardFace } from './LoveLetterCardFace';

type Props = {
  summary: LoveLetterRoundSummary;
  onContinue: () => void;
};

export function LoveLetterRoundSummaryModal({ summary, onContinue }: Props) {
  const reasonLabel =
    summary.reason === 'last_standing'
      ? 'เหลือผู้เล่นคนสุดท้าย'
      : summary.reason === 'deck_empty'
        ? 'กองจั่วหมด'
        : 'เปรียบเลขในมือ';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ll-round-title">
      <div className="card ll-modal ll-modal--wide">
        <h2 id="ll-round-title" className="ll-modal__title">
          สรุปรอบ {summary.roundNo}
        </h2>
        <p className="ll-modal__subtitle">
          {summary.winnerNames.join(', ')} ชนะรอบ ({reasonLabel})
        </p>

        <ul className="ll-round-reveal">
          {summary.revealedHands.map((row) => (
            <li key={row.playerId} className="ll-round-reveal__row">
              <span className="ll-round-reveal__name">{row.playerName}</span>
              {row.card ? (
                <LoveLetterCardFace card={row.card} size="tiny" />
              ) : (
                <span className="ll-round-reveal__empty">—</span>
              )}
            </li>
          ))}
        </ul>

        <Button type="button" onClick={onContinue}>
          เริ่มรอบถัดไป
        </Button>
      </div>
    </div>
  );
}
