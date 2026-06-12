import type { CamelUpColor, CamelUpPlayerView } from 'shared';
import {
  camelUpFaceDownBetUrl,
  camelUpLegBetTileUrl,
  camelUpRaceCardUrl,
} from './assetMeta';
import { CAMEL_COLOR_LABEL, camelColorClass } from './camelMeta';

type Props = {
  legBetStacks: CamelUpPlayerView['legBetStacks'];
  overallWinnerPiles: CamelUpPlayerView['overallWinnerPiles'];
  overallLoserPiles: CamelUpPlayerView['overallLoserPiles'];
  players: CamelUpPlayerView['players'];
  revealed: boolean;
};

function BetPile({
  color,
  bets,
  players,
  revealed,
}: {
  color: CamelUpColor;
  bets: CamelUpPlayerView['overallWinnerPiles'][0]['bets'];
  players: CamelUpPlayerView['players'];
  revealed: boolean;
}) {
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  return (
    <div className={['camel-up-bet-pile', camelColorClass(color)].join(' ')}>
      <img
        src={camelUpRaceCardUrl(color)}
        alt=""
        className="camel-up-bet-pile__header-img"
        loading="lazy"
      />
      <span className="camel-up-bet-pile__label">{CAMEL_COLOR_LABEL[color]}</span>
      <ul className="camel-up-bet-pile__bets">
        {bets.length === 0 ? (
          <li className="camel-up-bet-pile__empty">—</li>
        ) : (
          bets.map((bet, idx) => (
            <li key={`${bet.playerId}-${idx}`} className="camel-up-bet-pile__bet">
              <img
                src={revealed && bet.color ? camelUpRaceCardUrl(bet.color) : camelUpFaceDownBetUrl()}
                alt=""
                className="camel-up-bet-pile__bet-img"
                loading="lazy"
              />
              <span className="camel-up-bet-pile__who">{name(bet.playerId)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function CamelUpBettingArea({
  legBetStacks,
  overallWinnerPiles,
  overallLoserPiles,
  players,
  revealed,
}: Props) {
  return (
    <section className="card camel-up-betting" aria-label="กองเดิมพัน">
      <h3 className="camel-up-betting__title">Leg Betting Tiles</h3>
      <div className="camel-up-leg-stacks">
        {legBetStacks.map((stack) => (
          <div key={stack.color} className={['camel-up-leg-stack', camelColorClass(stack.color)].join(' ')}>
            <span className="camel-up-leg-stack__color">{CAMEL_COLOR_LABEL[stack.color]}</span>
            <div className="camel-up-leg-stack__tiles">
              {stack.values.length === 0 ? (
                <span className="camel-up-leg-stack__empty">ว่าง</span>
              ) : (
                stack.values.map((value, idx) => (
                  <figure key={`${stack.color}-${idx}`} className="camel-up-leg-stack__tile-wrap">
                    <img
                      src={camelUpLegBetTileUrl(stack.color, value)}
                      alt=""
                      className="camel-up-leg-stack__tile-img"
                      loading="lazy"
                    />
                    {value !== 2 && value !== 3 && value !== 5 ? (
                      <figcaption className="camel-up-leg-stack__tile-value">{value}</figcaption>
                    ) : null}
                  </figure>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <h3 className="camel-up-betting__title">เดิมพันผู้ชนะทั้งเกม</h3>
      <div className="camel-up-overall-piles">
        {overallWinnerPiles.map((pile) => (
          <BetPile
            key={`w-${pile.color}`}
            color={pile.color}
            bets={pile.bets}
            players={players}
            revealed={revealed}
          />
        ))}
      </div>

      <h3 className="camel-up-betting__title">เดิมพันผู้แพ้ทั้งเกม</h3>
      <div className="camel-up-overall-piles">
        {overallLoserPiles.map((pile) => (
          <BetPile
            key={`l-${pile.color}`}
            color={pile.color}
            bets={pile.bets}
            players={players}
            revealed={revealed}
          />
        ))}
      </div>
    </section>
  );
}
