import type { LoveLetterRole } from 'shared';
import { PlayerTargetPicker } from '../../../components/player-target';
import { roleLabel } from '../lib/cardMeta';
import { LlModalShell } from './LlModalShell';

type Target = { id: string; name: string };

type Props = {
  effectRole: LoveLetterRole;
  targets: Target[];
  onSelect: (targetId: string) => void;
};

export function LoveLetterTargetModal({ effectRole, targets, onSelect }: Props) {
  return (
    <LlModalShell title={`เลือกเป้าหมาย — ${roleLabel(effectRole)}`} titleId="ll-target-title">
      <PlayerTargetPicker
        options={targets}
        onSelect={onSelect}
        emptyMessage="ไม่มีเป้าหมายให้เลือก"
      />
    </LlModalShell>
  );
}
