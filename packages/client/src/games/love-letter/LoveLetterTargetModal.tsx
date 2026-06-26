import type { LoveLetterRole } from 'shared';
import { Button } from '../../components/ui';
import { roleLabel } from './cardMeta';

type Target = { id: string; name: string };

type Props = {
  effectRole: LoveLetterRole;
  targets: Target[];
  onSelect: (targetId: string) => void;
  onClose: () => void;
};

export function LoveLetterTargetModal({ effectRole, targets, onSelect, onClose }: Props) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ll-target-title">
      <div className="card ll-modal">
        <h2 id="ll-target-title" className="ll-modal__title">
          เลือกเป้าหมาย — {roleLabel(effectRole)}
        </h2>
        <ul className="ll-modal__targets">
          {targets.map((t) => (
            <li key={t.id}>
              <Button type="button" variant="secondary" onClick={() => onSelect(t.id)}>
                {t.name}
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="ghost" onClick={onClose}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
