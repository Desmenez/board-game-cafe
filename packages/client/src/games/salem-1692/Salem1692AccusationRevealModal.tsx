import type { Salem1692TryalCard } from 'shared';
import { Button } from '../../components/ui';

type Props = {
  targetName: string;
  tryals: Salem1692TryalCard[];
  onReveal: (tryalId: string) => void;
};

export function Salem1692AccusationRevealModal({ targetName, tryals, onReveal }: Props) {
  const unrevealed = tryals.filter((t) => !t.revealed);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1692-accusation-title"
    >
      <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 id="s1692-accusation-title">Accusation ครบ 7</h2>
        <p>เลือก Tryal ของ {targetName} ที่จะเปิด</p>
        <div className="s1692-modal-grid">
          {unrevealed.map((t) => (
            <Button key={t.id} type="button" onClick={() => onReveal(t.id)}>
              เปิด Tryal
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
