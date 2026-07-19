import type { InsiderRole } from 'shared';
import type { GameProgressValue } from '../../../components/game-shell';
import { SecretIdentityReveal } from '../../../components/secret-identity';
import { ROLE_REVEAL_META, insiderRoleCardUrl } from '../lib/roleMeta';

type Props = {
  myRole: InsiderRole;
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function InsiderRoleReveal({ myRole, hasAcknowledged, progress, onAcknowledge }: Props) {
  const meta = ROLE_REVEAL_META[myRole];
  const p = progress ?? { current: 0, total: 1 };

  return (
    <SecretIdentityReveal
      imageSrc={insiderRoleCardUrl(myRole)}
      imageAlt={meta.title}
      imageClassName="aspect-[317/746]"
      title={meta.title}
      affiliation={meta.affiliation}
      tone={meta.tone}
      acknowledged={hasAcknowledged}
      onAcknowledge={onAcknowledge}
      progress={p}
      acknowledgeLabel="รับทราบ พร้อมเล่น"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      details={<p className="text-sm leading-relaxed text-ink-2 my-2 md:my-4">{meta.hint}</p>}
    />
  );
}
