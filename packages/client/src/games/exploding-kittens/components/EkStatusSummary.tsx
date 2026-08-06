import type { ExplodingKittensPlayerView } from 'shared';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerRosterStrip } from '../../../components/player-roster';
import { buildEkPlayerRosterSeats } from './ekPlayerRosterSeats';

export function EkStatusSummary({ gs, myId }: { gs: ExplodingKittensPlayerView; myId: string }) {
  return (
    <GameHistoryDisclosure
      title={`ลำดับการเล่น · ${gs.players.length} คน`}
      defaultOpen
      className="ek-roster sticky top-4 z-20"
    >
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        ariaLabel="ลำดับผู้เล่นรอบโต๊ะ"
        seats={buildEkPlayerRosterSeats(gs)}
      />
    </GameHistoryDisclosure>
  );
}
