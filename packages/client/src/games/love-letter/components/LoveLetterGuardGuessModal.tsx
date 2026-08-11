import { Button } from '../../../components/ui';
import { LlModalShell } from './LlModalShell';

const GUESS_RANKS = [2, 3, 4, 5, 6, 7, 8] as const;

type Props = {
  targetName: string;
  onGuess: (rank: number) => void;
};

export function LoveLetterGuardGuessModal({ targetName, onGuess }: Props) {
  return (
    <LlModalShell
      title={`Guard — ทายเลขการ์ดของ ${targetName}`}
      titleId="ll-guard-title"
      kicker="เลือกเลข 2–8 (ไม่ใช่ 1)"
    >
      <div className="grid grid-cols-4 gap-2">
        {GUESS_RANKS.map((rank) => (
          <Button key={rank} type="button" variant="secondary" onClick={() => onGuess(rank)}>
            {rank}
          </Button>
        ))}
      </div>
    </LlModalShell>
  );
}
