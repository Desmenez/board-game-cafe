import type { SushiGoPublicPlayer } from 'shared';

type Props = {
  players: SushiGoPublicPlayer[];
  myId: string;
};

export function SushiGoPlayerStrip({ players, myId }: Props) {
  return (
    <div className="sg-strip" aria-label="ผู้เล่น">
      {players.map((p) => (
        <div
          key={p.id}
          className={[
            'sg-strip__player',
            p.id === myId ? 'sg-strip__player--me' : '',
            p.hasPicked ? 'sg-strip__player--picked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <strong>{p.name}</strong>
          {p.id === myId ? ' (คุณ)' : ''}
          <div className="sg-stat-line">
            {p.score} คะแนน · Maki {p.played.makiIcons} · Pudding {p.played.pudding}
          </div>
          <div className="sg-stat-line">{p.hasPicked ? 'เลือกแล้ว' : 'กำลังเลือก…'}</div>
        </div>
      ))}
    </div>
  );
}
