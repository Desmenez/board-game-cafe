import type { OnuwRole } from 'shared';
import { ONUW_ROLE_DESCRIPTION_TH, onuwTeamForRole } from 'shared';
import type { GameProgressValue } from '../../components/game-shell';
import { SecretIdentityReveal } from '../../components/secret-identity';
import { onuwRoleCardUrl } from '../../imageMap';
import { ROLE_LABEL_EN, ROLE_LABEL_TH, TEAM_LABEL_TH, teamTone } from './onuwRoles';

type Props = {
  myRole: OnuwRole;
  myRoleArtKey: string;
  descriptionTh?: string | null;
  hasAcknowledged: boolean;
  progress?: GameProgressValue;
  onAcknowledge: () => void;
};

export function OnuwRoleReveal({
  myRole,
  myRoleArtKey,
  descriptionTh,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const team = onuwTeamForRole(myRole);
  const labelTh = ROLE_LABEL_TH[myRole];
  const desc = descriptionTh ?? ONUW_ROLE_DESCRIPTION_TH[myRole];
  const p = progress ?? { current: 0, total: 1 };

  return (
    <SecretIdentityReveal
      imageSrc={onuwRoleCardUrl(myRoleArtKey)}
      imageAlt={labelTh}
      title={labelTh}
      affiliation={TEAM_LABEL_TH[team]}
      tone={teamTone(team)}
      acknowledged={hasAcknowledged}
      onAcknowledge={onAcknowledge}
      progress={p}
      acknowledgeLabel="รับทราบ — จำบทบาทแล้ว"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      details={
        <section className="rounded-input border border-rule bg-paper-3 p-3 sm:p-4">
          <p className="m-0 font-label text-xs font-bold tracking-wide text-ink-2 uppercase">
            {ROLE_LABEL_EN[myRole]}
          </p>
          <p className="mt-2 mb-0 text-sm leading-relaxed text-ink">{desc}</p>
        </section>
      }
    />
  );
}
