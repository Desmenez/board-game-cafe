import { Button } from '../../components/ui';

const GUESS_RANKS = [2, 3, 4, 5, 6, 7, 8] as const;

type Props = {
  targetName: string;
  onGuess: (rank: number) => void;
  onClose: () => void;
};

export function LoveLetterGuardGuessModal({ targetName, onGuess, onClose }: Props) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ll-guard-title">
      <div className="card ll-modal">
        <h2 id="ll-guard-title" className="ll-modal__title">
          Guard — ทายเลขการ์ดของ {targetName}
        </h2>
        <p className="ll-modal__hint">เลือกเลข 2–8 (ไม่ใช่ 1)</p>
        <div className="ll-modal__rank-grid">
          {GUESS_RANKS.map((rank) => (
            <Button key={rank} type="button" variant="secondary" onClick={() => onGuess(rank)}>
              {rank}
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
