import { Crown, FlaskConical, Swords, Vote } from 'lucide-react';
import type { AvalonPlayerView, AvalonRole } from 'shared';
import { Badge } from '../../components/ui';
import { PlayerIdentity } from '../../components/player-avatar';
import { getAvalonRolePortraitUrl } from '../../imageMap';
import { cn } from '../../utils/cn';
import { ROLE_LABEL, knownInfoPresentation } from './avalonRoles';

type KnownEntry = { id: string; name: string; detail: string };

type Props = {
  myRole: AvalonRole;
  myPortraitVariant?: number;
  myName?: string;
  isLeader: boolean;
  leaderName?: string;
  consecutiveRejects: number;
  ladyOfTheLakeEnabled?: boolean;
  ladyHolderId?: string;
  lancelotEnabled?: boolean;
  players: AvalonPlayerView['players'];
  myId: string;
  knownInfo: KnownEntry[];
};

function knownBadgeVariant(tone: ReturnType<typeof knownInfoPresentation>['tone']) {
  if (tone === 'good') return 'success' as const;
  if (tone === 'evil' || tone === 'evil_ally') return 'danger' as const;
  return 'outline' as const;
}

export function AvalonMyRolePanel({
  myRole,
  myPortraitVariant,
  myName,
  isLeader,
  leaderName,
  consecutiveRejects,
  ladyOfTheLakeEnabled,
  ladyHolderId,
  lancelotEnabled,
  players,
  myId,
  knownInfo,
}: Props) {
  const myRoleLabel = ROLE_LABEL[myRole];
  const myRoleArt = getAvalonRolePortraitUrl(myRole, myPortraitVariant);
  const ladyHolderName = players.find((p) => p.id === ladyHolderId)?.name;

  return (
    <section
      className={cn(
        'rounded-card border bg-paper-2 px-3 py-2.5 text-ink sm:px-4',
        isLeader ? 'border-pear' : 'border-rule',
      )}
      aria-label="บทบาทและสถานะของคุณ"
    >
      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <img
          src={myRoleArt}
          alt={myRoleLabel}
          className="size-14 shrink-0 rounded-input border border-rule object-cover sm:size-16"
          loading="lazy"
        />

        <div className="min-w-0 grow basis-[10rem] sm:max-w-[13rem] sm:grow-0 sm:basis-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" size="sm">
              <Crown size={12} className="text-pear" aria-hidden />
              {isLeader ? 'คุณเป็น Leader' : `Leader · ${leaderName ?? '—'}`}
            </Badge>
            {ladyOfTheLakeEnabled ? (
              <Badge variant="outline" size="sm">
                <FlaskConical size={12} className="text-pear" aria-hidden />
                {ladyHolderId === myId ? 'คุณถือ Lady' : `Lady · ${ladyHolderName ?? 'ไม่ทราบ'}`}
              </Badge>
            ) : null}
            {lancelotEnabled ? (
              <Badge variant="outline" size="sm">
                <Swords size={12} className="text-pear" aria-hidden />
                มี Lancelot
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-1.5 font-display text-base leading-tight font-extrabold tracking-[-0.025em] text-ink wrap-anywhere sm:text-lg">
            {myRoleLabel}
          </h2>
          <p className="mt-0.5 text-sm leading-snug text-ink-2">
            {myName ?? 'ผู้เล่น'} · บทบาทของคุณ
          </p>
        </div>

        {knownInfo.length > 0 ? (
          <div className="min-w-0 grow basis-full border-t border-rule pt-2 sm:basis-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
            <p className="font-label text-[0.65rem] font-bold tracking-[0.06em] text-ink-2 uppercase">
              ข้อมูลที่คุณรู้
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="ข้อมูลลับของบทบาท">
              {knownInfo.map((known) => {
                const { label, tone } = knownInfoPresentation(known.detail);
                return (
                  <li
                    key={known.id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-input border border-rule bg-paper-3 py-1 pr-1.5 pl-1"
                  >
                    <PlayerIdentity
                      playerId={known.id}
                      name={known.name}
                      avatarSize={22}
                      nameClassName="text-xs"
                      className="min-w-0"
                    />
                    <Badge size="sm" variant={knownBadgeVariant(tone)}>
                      {label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <Badge
          variant={consecutiveRejects >= 3 ? 'danger' : 'warning'}
          size="sm"
          className="ml-auto shrink-0"
        >
          <Vote size={12} aria-hidden />
          ปฏิเสธ {consecutiveRejects}/5
        </Badge>
      </div>
    </section>
  );
}
