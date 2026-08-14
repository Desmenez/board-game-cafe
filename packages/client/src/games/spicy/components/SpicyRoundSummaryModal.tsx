import { useMemo } from 'react';
import {
  spicyRoundSummaryHintTh,
  spicyRoundSummaryTitleTh,
  type SpicyPublicSeat,
  type SpicyRoundSummary,
} from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { spicyCardBackUrl, spicyTrophyUrl } from '../art';

type Props = {
  summary: SpicyRoundSummary;
  seats: SpicyPublicSeat[];
  myId: string;
  canAck: boolean;
  onAck: () => void;
};

export function SpicyRoundSummaryModal({ summary, seats, myId, canAck, onAck }: Props) {
  const rows = useMemo(() => {
    return [...summary.rows]
      .map((row) => ({
        ...row,
        name: seats.find((s) => s.id === row.playerId)?.name ?? row.name,
        isMe: row.playerId === myId,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.name.localeCompare(b.name, 'th');
      });
  }, [myId, seats, summary.rows]);

  const hasTrophy = rows.some((r) => r.trophies > 0);
  const top = rows[0];

  return (
    <GameCardActionModal
      open
      onOpenChange={() => undefined}
      dismissible={false}
      titleId="spicy-round-summary-title"
      descriptionId="spicy-round-summary-desc"
      title={spicyRoundSummaryTitleTh(summary.reason)}
      description={spicyRoundSummaryHintTh(summary.reason)}
      cardSrc={hasTrophy ? spicyTrophyUrl() : spicyCardBackUrl()}
      cardAlt={hasTrophy ? 'ถ้วยรางวัล' : 'กองเผ็ด'}
      cardAspectRatio="331 / 514"
      meta={hasTrophy ? 'ถ้วย +10 แต้ม' : 'การ์ดจากกองนับเป็นแต้ม'}
      actors={
        top ? (
          <PlayerIdentity
            playerId={top.playerId}
            name={`${top.name}${top.isMe ? ' (คุณ)' : ''}`}
            avatarSize={36}
            secondary={top.points > 0 ? `ได้ +${top.points} รอบนี้` : 'ไม่ได้แต้มรอบนี้'}
          />
        ) : null
      }
      footer={
        canAck ? (
          <Button type="button" className="w-full min-h-[2.65rem] font-bold" onClick={onAck}>
            ต่อไป
          </Button>
        ) : (
          <p className="m-0 w-full text-center text-sm text-[var(--text-secondary)]">
            รอผู้เล่นกดต่อไป…
          </p>
        )
      }
    >
      <ul className="spicy-round-list" aria-label="แต้มที่ได้รอบนี้">
        {rows.map((row) => {
          const parts: string[] = [];
          if (row.wonCards > 0) parts.push(`กอง ${row.wonCards}`);
          if (row.trophies > 0) parts.push('ถ้วย +10');
          const secondary = parts.length > 0 ? parts.join(' · ') : '—';

          return (
            <li
              key={row.playerId}
              className={cn('spicy-round-row', row.points > 0 && 'spicy-round-row--scored')}
            >
              <PlayerIdentity
                playerId={row.playerId}
                name={row.name}
                avatarSize={32}
                secondary={
                  <span>
                    {secondary}
                    {row.isMe ? ' · คุณ' : ''}
                  </span>
                }
              />
              <span
                className={cn(
                  'spicy-round-row__pts tabular-nums',
                  row.points > 0 && 'spicy-round-row__pts--plus',
                )}
              >
                {row.points > 0 ? `+${row.points}` : '0'}
              </span>
            </li>
          );
        })}
      </ul>
    </GameCardActionModal>
  );
}
