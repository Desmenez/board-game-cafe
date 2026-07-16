import type { CamelUpPlayerView } from 'shared';
import { PlayerRosterStrip } from '../../components/player-roster';

type Props = {
  players: CamelUpPlayerView['players'];
  myId: string;
  activePlayerId: string | null;
};

export function CamelUpPlayerBar({ players, myId, activePlayerId }: Props) {
  return (
    <section className="card camel-up-players" aria-label="ลำดับผู้เล่นและคะแนน">
      <div className="camel-up-players__head">
        <h3 className="camel-up-players__title">ลำดับ &amp; คะแนน</h3>
        <span className="camel-up-players__hint">เรียงตามที่นั่ง · EP ปัจจุบัน</span>
      </div>

      <PlayerRosterStrip
        className="camel-up-players__roster"
        myId={myId}
        ariaLabel="ลำดับผู้เล่น"
        seats={players.map((p, index) => ({
          id: p.id,
          name: p.name,
          active: p.id === activePlayerId,
          leading: (
            <span className="camel-up-players__order" aria-label={`ลำดับที่ ${index + 1}`}>
              {index + 1}
            </span>
          ),
          badges:
            p.id === activePlayerId ? (
              <span className="camel-up-players__badge camel-up-players__badge--turn">ตา</span>
            ) : null,
          trailing: (
            <span className="camel-up-players__score" aria-label={`${p.ep} EP`}>
              <strong>{p.ep}</strong>
              <span>EP</span>
            </span>
          ),
        }))}
      />
    </section>
  );
}
