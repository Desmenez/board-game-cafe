import type { Salem1692SecretRole, Salem1692TryalCard } from 'shared';
import { Badge } from '../../../components/ui';
import { type GameProgressValue } from '../../../components/game-shell';
import { SecretIdentityReveal } from '../../../components/secret-identity';
import { PlayerIdentity } from '../../../components/player-avatar';
import { salem1692TryalImage, salem1692TryalLabelTh } from '../lib/cardMeta';
import { Salem1692TryalRow } from './Salem1692TryalRow';

type Props = {
  secretRole: Salem1692SecretRole;
  tryals: Salem1692TryalCard[];
  witchAllies: { id: string; name: string }[] | null;
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

const ROLE_META: Record<
  Salem1692SecretRole,
  {
    title: string;
    affiliation: string;
    tone: 'good' | 'evil' | 'default';
    tryalKind: 'witch' | 'constable' | 'not_witch';
  }
> = {
  witch: {
    title: 'Witch',
    affiliation: 'ทีม Witch',
    tone: 'evil',
    tryalKind: 'witch',
  },
  constable: {
    title: 'Constable',
    affiliation: 'เมือง Salem',
    tone: 'good',
    tryalKind: 'constable',
  },
  townsfolk: {
    title: 'Townsfolk',
    affiliation: 'เมือง Salem',
    tone: 'good',
    tryalKind: 'not_witch',
  },
};

export function Salem1692RoleReveal({
  secretRole,
  tryals,
  witchAllies,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const meta = ROLE_META[secretRole];
  const p = progress ?? { current: 0, total: 1 };

  return (
    <SecretIdentityReveal
      imageSrc={salem1692TryalImage(meta.tryalKind)}
      imageAlt={meta.title}
      imageClassName="aspect-[722/1130]"
      title={meta.title}
      affiliation={meta.affiliation}
      tone={meta.tone}
      acknowledged={hasAcknowledged}
      onAcknowledge={onAcknowledge}
      progress={p}
      acknowledgeLabel="รับทราบ พร้อมเล่น"
      acknowledgedLabel="รับทราบแล้ว — รอผู้เล่นคนอื่น"
      details={
        <>
          <Salem1692TryalRow
            tryals={tryals}
            title="Tryal ของคุณ (ดูได้เฉพาะคุณ)"
            ownerView
            size="sm"
          />

          {witchAllies && witchAllies.length > 0 ? (
            <section className="rounded-input border border-rule bg-paper-3 p-3 sm:p-4">
              <h3 className="font-display text-sm font-bold tracking-wide text-ink-2 uppercase">
                พันธมิตร Witch
              </h3>
              <ul className="mt-3 grid gap-2" aria-label="สมาชิกทีม Witch">
                {witchAllies.map((ally) => (
                  <li
                    key={ally.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-rule bg-paper-2 px-3 py-2.5"
                  >
                    <PlayerIdentity
                      playerId={ally.id}
                      name={ally.name}
                      avatarSize={32}
                      className="flex-1"
                    />
                    <Badge size="sm" variant="danger">
                      Witch
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {secretRole === 'townsfolk' ? (
            <p className="text-sm text-ink-2 my-2 md:my-4">
              คุณไม่มี Witch หรือ Constable Tryal — ช่วยเมืองหา Witch ให้ครบก่อนถูกกำจัด
            </p>
          ) : null}

          {secretRole === 'constable' ? (
            <p className="text-sm text-ink-2 my-2 md:my-4">
              คุณถือ {salem1692TryalLabelTh('constable')} — คืน Night สามารถใช้ Gavel
              ปกป้องผู้เล่นได้
            </p>
          ) : null}
        </>
      }
    />
  );
}
