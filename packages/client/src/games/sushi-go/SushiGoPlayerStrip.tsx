import type { SushiGoPublicPlayer } from 'shared';
import { PlayerRosterStrip } from '../../components/player-roster';

type Props = {
  players: SushiGoPublicPlayer[];
  myId: string;
};

export function SushiGoPlayerStrip({ players, myId }: Props) {
  return (
    <PlayerRosterStrip
      className="sg-strip"
      myId={myId}
      seats={players.map((p) => ({
        id: p.id,
        name: p.name,
        className: p.hasPicked ? 'sg-strip__player--picked' : undefined,
        status: (
          <>
            <div className="sg-stat-line">
              {p.score} คะแนน · Maki {p.played.makiIcons} · Pudding {p.played.pudding}
            </div>
            <div className="sg-stat-line">{p.hasPicked ? 'เลือกแล้ว' : 'กำลังเลือก…'}</div>
          </>
        ),
      }))}
    />
  );
}
