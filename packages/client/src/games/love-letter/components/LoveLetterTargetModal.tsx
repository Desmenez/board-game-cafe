import type { LoveLetterRole } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { CARD_IMAGE, ROLE_EFFECT_HINT, roleLabel } from '../lib/cardMeta';

type Target = { id: string; name: string };

type Props = {
  effectRole: LoveLetterRole;
  targets: Target[];
  onSelect: (targetId: string) => void;
};

export function LoveLetterTargetModal({ effectRole, targets, onSelect }: Props) {
  const title = `เลือกเป้าหมาย — ${roleLabel(effectRole)}`;
  const hint = ROLE_EFFECT_HINT[effectRole] ?? 'เลือกผู้เล่นหนึ่งคน';
  const art = CARD_IMAGE[effectRole];

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ll-target-title"
    >
      <div className="modal ll-modal-shell ll-select-modal ll-modal-shell--wide">
        <div className="ll-select-modal__hero">
          <div className="ll-select-modal__card-wrap">
            <img
              src={art}
              alt={roleLabel(effectRole)}
              className="ll-select-modal__card"
              width={440}
              height={600}
            />
          </div>
          <div className="ll-select-modal__copy">
            <h2 id="ll-target-title" className="ll-modal-shell__title">
              {title}
            </h2>
            <p className="ll-select-modal__hint">{hint}</p>
            <p className="ll-select-modal__meta">{targets.length} คนให้เลือก</p>
          </div>
        </div>

        {targets.length === 0 ? (
          <p className="ll-select-modal__empty">ไม่มีเป้าหมายให้เลือก</p>
        ) : (
          <ul className="ll-select-modal__targets" aria-label="เป้าหมาย">
            {targets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="ll-select-modal__target"
                  onClick={() => onSelect(t.id)}
                >
                  <PlayerIdentity playerId={t.id} name={t.name} avatarSize={44} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
