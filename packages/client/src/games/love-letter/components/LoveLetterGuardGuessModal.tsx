import type { LoveLetterRole } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { CARD_IMAGE, CARD_LABEL, roleLabel } from '../lib/cardMeta';

const GUESS_OPTIONS: { rank: number; role: LoveLetterRole }[] = [
  { rank: 2, role: 'priest' },
  { rank: 3, role: 'baron' },
  { rank: 4, role: 'handmaid' },
  { rank: 5, role: 'prince' },
  { rank: 6, role: 'king' },
  { rank: 7, role: 'countess' },
  { rank: 8, role: 'princess' },
];

type Props = {
  targetName: string;
  targetId?: string;
  onGuess: (rank: number) => void;
};

export function LoveLetterGuardGuessModal({ targetName, targetId, onGuess }: Props) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ll-guard-title"
    >
      <div className="modal ll-modal-shell ll-select-modal ll-modal-shell--wide">
        <div className="ll-select-modal__hero">
          <div className="ll-select-modal__card-wrap">
            <img
              src={CARD_IMAGE.guard}
              alt={roleLabel('guard')}
              className="ll-select-modal__card"
              width={440}
              height={600}
            />
          </div>
          <div className="ll-select-modal__copy">
            <h2 id="ll-guard-title" className="ll-modal-shell__title">
              Guard — ทายเลขการ์ด
            </h2>
            <p className="ll-select-modal__hint">
              ทายว่า {targetName} ถือการ์ดเลขอะไร (ห้ามทาย 1)
            </p>
            {targetId ? (
              <div className="ll-select-modal__actor">
                <PlayerIdentity playerId={targetId} name={targetName} avatarSize={36} />
              </div>
            ) : (
              <p className="ll-select-modal__meta">เป้าหมาย: {targetName}</p>
            )}
          </div>
        </div>

        <ul className="ll-guard-guess__grid" aria-label="ทายเลขการ์ด">
          {GUESS_OPTIONS.map(({ rank, role }) => (
            <li key={rank}>
              <button
                type="button"
                className="ll-guard-guess__opt"
                onClick={() => onGuess(rank)}
                aria-label={`ทาย ${CARD_LABEL[role]}`}
              >
                <img src={CARD_IMAGE[role]} alt="" className="ll-guard-guess__art" />
                <span className="ll-guard-guess__rank">{rank}</span>
                <span className="ll-guard-guess__name">{CARD_LABEL[role].replace(/ \(\d+\)$/, '')}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
