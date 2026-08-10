import type { HuesAndCuesPlayerView } from 'shared';
import { GameHistoryDisclosure } from '../../../components/game-shell';
import { PlayerRosterStrip } from '../../../components/player-roster';
import { buildHuesRosterSeats } from './huesRosterSeats';

type Props = {
  gs: HuesAndCuesPlayerView;
  myId: string;
};

/** ลำดับผู้เล่น — GameHistoryDisclosure + looping grid roster (Marrakech / Camel Up) */
export function HuesPlayerOrderStrip({ gs, myId }: Props) {
  const n = gs.playerOrder.length;
  return (
    <GameHistoryDisclosure
      title={`ลำดับผู้เล่น · ${n} คน`}
      note="เรียงตามรอบโต๊ะ · ผู้ใบ้ = ผู้ให้คำใบ้ในรอบนี้"
      defaultOpen
      className="hac-roster sticky top-4 z-20"
    >
      <PlayerRosterStrip
        layout="grid"
        myId={myId}
        className="hac-roster__strip"
        ariaLabel="ลำดับผู้เล่น Hues and Cues"
        seats={buildHuesRosterSeats(gs)}
      />
    </GameHistoryDisclosure>
  );
}
