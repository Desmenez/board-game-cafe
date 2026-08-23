import { Crown, Gem } from 'lucide-react';
import type { SplendorCardView, SplendorPlayerRowView } from 'shared';
import { GameHistoryDisclosure } from '../../components/game-shell';
import { PlayerRosterStrip } from '../../components/player-roster';
import { Badge } from '../../components/ui';
import { SplendorCardFace } from './SplendorCardFace';
import { SplendorChip } from './SplendorChip';
import { GEM_SHORT, SPLENDOR_GEMS } from './splendorUtils';

type Props = {
  players: SplendorPlayerRowView[];
  myId: string;
  currentPlayerId: string;
  lastEvent?: string;
  finalRoundNotice?: boolean;
};

function opponentReserves(p: SplendorPlayerRowView) {
  return p.reservedSlots.filter(
    (entry): entry is SplendorCardView | { hidden: true } => entry !== null,
  );
}

function SplendorRosterStats({ player }: { player: SplendorPlayerRowView }) {
  const reserveCount = player.reservedSlots.filter(Boolean).length;

  return (
    <span className="splendor-roster-stats">
      <span
        className="splendor-roster-stat-pill splendor-roster-stat-pill--prestige"
        aria-label={`${player.prestige} แต้ม`}
      >
        <Crown size={13} aria-hidden />
        <span className="splendor-roster-stat-pill__value">{player.prestige}</span>
      </span>
      {player.nobles.length > 0 ? (
        <span className="splendor-roster-stat-pill" aria-label={`โนเบิล ${player.nobles.length} คน`}>
          <Gem size={13} aria-hidden />
          <span className="splendor-roster-stat-pill__value">{player.nobles.length}</span>
        </span>
      ) : null}
      {SPLENDOR_GEMS.map((g) =>
        player.bonuses[g] > 0 ? (
          <span
            key={g}
            className={`splendor-roster-stat-pill splendor-roster-stat-pill--bonus splendor-bonus-${g}`}
            aria-label={`โบนัส${GEM_SHORT[g]} ${player.bonuses[g]}`}
          >
            <span className="splendor-roster-bonus-dot" aria-hidden />
            <span className="splendor-roster-stat-pill__value">{player.bonuses[g]}</span>
          </span>
        ) : null,
      )}
      {reserveCount > 0 ? (
        <span className="splendor-roster-stat-pill" aria-label={`จอง ${reserveCount} ใบ`}>
          <span className="splendor-roster-stat-pill__label">จอง</span>
          <span className="splendor-roster-stat-pill__value">{reserveCount}</span>
        </span>
      ) : null}
    </span>
  );
}

function SplendorRosterSeatExtra({ player }: { player: SplendorPlayerRowView }) {
  const reserves = opponentReserves(player);
  const hasTokens =
    player.gold > 0 || SPLENDOR_GEMS.some((g) => player.gems[g] > 0);

  if (!hasTokens && reserves.length === 0) return null;

  return (
    <div className="splendor-roster-extra">
      {hasTokens ? (
        <div className="splendor-token-row splendor-roster-extra__tokens" aria-label="เม็ดที่ถือ">
          {SPLENDOR_GEMS.map((g) =>
            player.gems[g] > 0 ? (
              <SplendorChip key={g} kind={g} count={player.gems[g]} size="xs" />
            ) : null,
          )}
          {player.gold > 0 ? <SplendorChip kind="gold" count={player.gold} size="xs" /> : null}
        </div>
      ) : null}
      {reserves.length > 0 ? (
        <div className="splendor-reserve-hidden splendor-roster-extra__reserves" aria-label="การ์ดจอง">
          {reserves.map((entry, i) =>
            'hidden' in entry ? (
              <SplendorCardFace key={`hidden-${i}`} level={1} faceDown size="tiny" />
            ) : (
              <SplendorCardFace key={entry.id} card={entry} size="tiny" />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SplendorPlayerBar({
  players,
  myId,
  currentPlayerId,
  lastEvent,
  finalRoundNotice,
}: Props) {
  return (
    <GameHistoryDisclosure
      title={`ผู้เล่น · ${players.length} คน`}
      defaultOpen
      className="splendor-player-bar sticky top-4 z-20"
      meta={
        <span className="splendor-player-bar__meta">
          {finalRoundNotice ? (
            <Badge size="sm" variant="danger">
              รอบสุดท้าย
            </Badge>
          ) : null}
          {lastEvent ? <span className="splendor-player-bar__event">{lastEvent}</span> : null}
        </span>
      }
    >
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        ariaLabel="สถานะผู้เล่น"
        seats={players.map((p, index) => ({
          id: p.id,
          name: p.name,
          active: p.id === currentPlayerId,
          className: 'splendor-roster-seat',
          leading: <span aria-label={`ลำดับที่ ${index + 1}`}>{index + 1}</span>,
          status: <SplendorRosterStats player={p} />,
          extra: <SplendorRosterSeatExtra player={p} />,
        }))}
      />
    </GameHistoryDisclosure>
  );
}
