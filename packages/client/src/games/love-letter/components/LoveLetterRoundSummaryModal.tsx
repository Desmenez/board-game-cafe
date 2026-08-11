import type { LoveLetterRoundSummary } from 'shared';
import { Button } from '../../../components/ui';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { LlModalShell } from './LlModalShell';

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
    <LlModalShell
      layout="wide"
      title={`สรุปรอบ ${summary.roundNo}`}
      titleId="ll-round-title"
      kicker={`${summary.winnerNames.join(', ')} ชนะรอบ (${reasonLabel})`}
      footer={
        <Button type="button" onClick={onContinue}>
          เริ่มรอบถัดไป
        </Button>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {summary.revealedHands.map((row) => (
          <li key={row.playerId} className="flex items-center justify-between gap-2">
            <span className="font-medium">{row.playerName}</span>
            {row.card ? (
              <LoveLetterCardFace card={row.card} size="tiny" />
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </li>
        ))}
      </ul>
    </LlModalShell>
  );
}
