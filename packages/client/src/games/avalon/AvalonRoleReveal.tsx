import type { AvalonRole, AvalonTeam } from 'shared';
import { Badge } from '../../components/ui';
import { type GameProgressValue } from '../../components/game-shell';
import { SecretIdentityReveal } from '../../components/secret-identity';
import { getAvalonRolePortraitUrl } from '../../imageMap';
import { ROLE_LABEL, knownInfoPresentation } from './avalonRoles';

type Props = {
  role: AvalonRole;
  team: AvalonTeam;
  myPortraitVariant?: number;
  knownInfo: { id: string; name: string; detail: string }[];
  hasAcknowledged: boolean;
  progress?: GameProgressValue;
  onAcknowledge: () => void;
};

export function AvalonRoleReveal({
  role,
  team,
  knownInfo,
  hasAcknowledged,
  progress,
  onAcknowledge,
  myPortraitVariant,
}: Props) {
  const roleLabel = ROLE_LABEL[role];
  const roleArt = getAvalonRolePortraitUrl(role, myPortraitVariant);
  const p = progress ?? { current: 0, total: 1 };

  return (
    <SecretIdentityReveal
      imageSrc={roleArt}
      imageAlt={roleLabel}
      title={roleLabel}
      affiliation={team === 'good' ? 'Arthur & Knights' : 'Minions of Mordred'}
      tone={team}
      acknowledged={hasAcknowledged}
      onAcknowledge={onAcknowledge}
      progress={p}
      details={
        knownInfo.length > 0 ? (
          <section className="rounded-input border border-rule bg-paper-3 p-3 sm:p-4">
            <h3 className="font-display text-sm font-bold tracking-wide text-ink-2 uppercase">
              ข้อมูลที่คุณรู้
            </h3>
            <ul className="mt-3 grid gap-2" aria-label="ข้อมูลลับของบทบาท">
              {knownInfo.map((known) => {
                const { label, tone } = knownInfoPresentation(known.detail);
                return (
                  <li
                    key={known.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-rule bg-paper-2 px-3 py-2.5"
                  >
                    <strong className="min-w-0 text-base font-semibold text-ink">{known.name}</strong>
                    <Badge
                      size="sm"
                      variant={
                        tone === 'good'
                          ? 'success'
                          : tone === 'evil' || tone === 'evil_ally'
                            ? 'danger'
                            : 'outline'
                      }
                    >
                      {label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
