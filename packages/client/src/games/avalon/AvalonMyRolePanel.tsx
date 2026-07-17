import { Crown, FlaskConical, Swords, Vote } from 'lucide-react';
import type { AvalonPlayerView, AvalonRole } from 'shared';
import { Badge } from '../../components/ui';
import { GamePhasePanel } from '../../components/game-shell';
import { getAvalonRolePortraitUrl } from '../../imageMap';
import { ROLE_LABEL } from './avalonRoles';

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
};

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
}: Props) {
  const myRoleLabel = ROLE_LABEL[myRole];
  const myRoleArt = getAvalonRolePortraitUrl(myRole, myPortraitVariant);

  return (
    <GamePhasePanel
      className={isLeader ? 'border-pear' : undefined}
      title={myRoleLabel}
      description={`${myName ?? 'ผู้เล่น'} · บทบาทของคุณ`}
      actions={
        <Badge variant={consecutiveRejects >= 3 ? 'danger' : 'warning'}>
          <Vote size={12} aria-hidden />
          ปฏิเสธสะสม {consecutiveRejects}/5
        </Badge>
      }
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start">
        <img
          src={myRoleArt}
          alt={myRoleLabel}
          className="aspect-square w-24 rounded-input border border-rule object-cover"
          loading="lazy"
        />
        <dl className="grid min-w-0 gap-2 text-sm">
          <div className="flex min-w-0 items-start gap-2 rounded-input bg-paper-3 px-3 py-2">
            <Crown size={16} className="mt-0.5 shrink-0 text-pear" aria-hidden />
            <div className="min-w-0">
              <dt className="font-semibold text-ink">Leader</dt>
              <dd className="mt-0.5 text-ink-2">
                {isLeader ? 'คุณเป็น Leader รอบนี้' : (leaderName ?? '—')}
              </dd>
            </div>
          </div>
          {ladyOfTheLakeEnabled ? (
            <div className="flex min-w-0 items-start gap-2 rounded-input bg-paper-3 px-3 py-2">
              <FlaskConical size={16} className="mt-0.5 shrink-0 text-pear" aria-hidden />
              <div className="min-w-0">
                <dt className="font-semibold text-ink">Lady of the Lake</dt>
                <dd className="mt-0.5 text-ink-2">
                  {ladyHolderId === myId
                    ? 'คุณถือ Lady อยู่'
                    : `ผู้ถือ: ${players.find((p) => p.id === ladyHolderId)?.name ?? 'ไม่ทราบ'}`}
                </dd>
              </div>
            </div>
          ) : null}
          {lancelotEnabled ? (
            <div className="flex min-w-0 items-start gap-2 rounded-input bg-paper-3 px-3 py-2">
              <Swords size={16} className="mt-0.5 shrink-0 text-pear" aria-hidden />
              <div className="min-w-0">
                <dt className="font-semibold text-ink">Lancelot</dt>
                <dd className="mt-0.5 text-ink-2">เกมนี้มี Sir Lancelot และ Evil Lancelot</dd>
              </div>
            </div>
          ) : null}
        </dl>
      </div>
    </GamePhasePanel>
  );
}
