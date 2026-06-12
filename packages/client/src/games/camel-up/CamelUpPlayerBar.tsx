import type { CamelUpColor, CamelUpPlayerView } from 'shared';
import { camelUpCoinUrl, camelUpLegBetTileUrl, camelUpRaceCardUrl } from './assetMeta';
import { CAMEL_COLOR_LABEL } from './camelMeta';

type Props = {
  players: CamelUpPlayerView['players'];
  myId: string;
  raceCardsInHand: CamelUpColor[];
  activePlayerId: string | null;
};

export function CamelUpPlayerBar({ players, myId, raceCardsInHand, activePlayerId }: Props) {
  return (
    <section className="card camel-up-players" aria-label="ผู้เล่น">
      <h3 className="camel-up-players__title">ผู้เล่น</h3>
      <ul className="camel-up-players__list">
        {players.map((p) => {
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
              <span className="camel-up-players__name">
                {p.name}
                {isMe ? <span className="camel-up-players__you">คุณ</span> : null}
                {isActive ? <span className="camel-up-players__turn">ตาเล่น</span> : null}
              </span>
              <span className="camel-up-players__ep">
                <img src={camelUpCoinUrl(p.ep)} alt="" className="camel-up-players__coin" loading="lazy" />
                {p.ep} EP
              </span>
              <span className="camel-up-players__meta">
                Pyramid: {p.pyramidTiles}
                {p.legBet ? (
                  <>
                    {' · Leg: '}
                    <img
                      src={camelUpLegBetTileUrl(p.legBet.color, p.legBet.value)}
                      alt=""
                      className="camel-up-players__leg-bet-thumb"
                      loading="lazy"
                    />
                    {CAMEL_COLOR_LABEL[p.legBet.color]} ({p.legBet.value})
                  </>
                ) : null}
                {p.overallWinnerBetsPlaced > 0 ? ` · ชนะ: ${p.overallWinnerBetsPlaced}` : ''}
                {p.overallLoserBetsPlaced > 0 ? ` · แพ้: ${p.overallLoserBetsPlaced}` : ''}
              </span>
            </li>
          );
        })}
      </ul>

      {raceCardsInHand.length > 0 ? (
        <div className="camel-up-my-cards">
          <span className="camel-up-my-cards__label">การ์ดเดิมพันของคุณ</span>
          <div className="camel-up-my-cards__hand">
            {raceCardsInHand.map((color) => (
              <img
                key={color}
                src={camelUpRaceCardUrl(color)}
                alt={CAMEL_COLOR_LABEL[color]}
                className="camel-up-my-cards__card-img"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="camel-up-my-cards__empty">วางการ์ดเดิมพันครบแล้ว</p>
      )}
    </section>
  );
}
