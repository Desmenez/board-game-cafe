import type { CsFilesKnownInfo, CsFilesRole } from 'shared';
import { Badge } from '../../../components/ui';
import type { GameProgressValue } from '../../../components/game-shell';
import { SecretIdentityReveal } from '../../../components/secret-identity';
import { PlayerIdentity } from '../../../components/player-avatar';
import { ROLE_REVEAL_META, csFilesRoleCardUrl } from '../lib/roleMeta';

type Props = {
  myRole: CsFilesRole;
  knownInfo?: CsFilesKnownInfo[];
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function CsFilesRoleReveal({
  myRole,
  knownInfo = [],
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const meta = ROLE_REVEAL_META[myRole];

  return (
    <SecretIdentityReveal
      imageSrc={csFilesRoleCardUrl(myRole)}
      imageAlt={meta.title}
      title={meta.title}
      affiliation={meta.affiliation}
      tone={meta.tone}
      acknowledged={hasAcknowledged}
      onAcknowledge={onAcknowledge}
      progress={progress}
      acknowledgeLabel="รับทราบ พร้อมเล่น"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      details={
        <>
          <p className="my-2 text-sm leading-relaxed text-ink-2 md:my-4">{meta.hint}</p>
          {knownInfo.length > 0 ? (
            <section className="rounded-input border border-rule bg-paper-3 p-3 sm:p-4">
              <h3 className="font-display text-sm font-bold tracking-wide text-ink-2 uppercase">
                ข้อมูลที่คุณรู้
              </h3>
              <ul className="mt-3 grid gap-2" aria-label="ข้อมูลลับของบทบาท">
                {knownInfo.map((known) => (
                  <li
                    key={`${known.id}-${known.detail}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-rule bg-paper-2 px-3 py-2.5"
                  >
                    <PlayerIdentity
                      playerId={known.id}
                      name={known.name}
                      avatarSize={32}
                      className="flex-1"
                    />
                    <Badge
                      size="sm"
                      variant={
                        known.detail.includes('ร้าย') ||
                        known.detail === 'ฆาตกร' ||
                        known.detail === 'ผู้สมรู้ร่วมคิด'
                          ? 'danger'
                          : 'outline'
                      }
                    >
                      {known.detail}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      }
    />
  );
}
