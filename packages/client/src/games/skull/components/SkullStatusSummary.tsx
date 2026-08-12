import type { SkullPlayerView } from 'shared';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerRosterStrip } from '../../../components/player-roster';
import { buildSkullRosterSeats } from './skullRosterSeats';

type Props = {
  view: SkullPlayerView;
  myId: string;
};

export function SkullStatusSummary({ view, myId }: Props) {
  const active = view.seats.filter((s) => !s.eliminated).length;
  const titleParts = [`ผู้เล่น · ${active} คน`, `รอบ ${view.round}`];
  if (view.phase === 'bidding' || view.phase === 'challenge') {
    titleParts.push(`บิด ${view.currentBid}`);
  }
  if (view.phase === 'challenge') {
    titleParts.push(`พลิก ${view.flippedCount}/${view.currentBid}`);
  }

  return (
    <GameHistoryDisclosure
      title={titleParts.join(' · ')}
      defaultOpen
      className="skull-roster sticky top-4 z-20"
    >
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        ariaLabel="สถานะผู้เล่น Skull"
        seats={buildSkullRosterSeats(view)}
      />
      {view.lastEvent ? (
        <p className="skull-roster-event" role="status">
          {view.lastEvent}
        </p>
      ) : null}
    </GameHistoryDisclosure>
  );
}
