import type { CamelUpPlayerView } from 'shared';

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

      <ol className="camel-up-players__list" aria-label="ลำดับผู้เล่น">
        {players.map((p, index) => {
          const isMe = p.id === myId;
          const isActive = p.id === activePlayerId;

          return (
            <li
              key={p.id}
              className={[
                'camel-up-players__row',
                isMe ? 'camel-up-players__row--me' : '',
                isActive ? 'camel-up-players__row--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="camel-up-players__order" aria-label={`ลำดับที่ ${index + 1}`}>
                {index + 1}
              </span>

              <div className="camel-up-players__main">
                <span className="camel-up-players__name">{p.name}</span>
                {isMe ? (
                  <span className="camel-up-players__badge camel-up-players__badge--you">คุณ</span>
                ) : null}
                {isActive ? (
                  <span className="camel-up-players__badge camel-up-players__badge--turn">ตา</span>
                ) : null}
              </div>

              <span className="camel-up-players__score" aria-label={`${p.ep} EP`}>
                <strong>{p.ep}</strong>
                <span>EP</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
