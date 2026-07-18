import { PlayerAvatar } from '../../../components/player-avatar';
import {
  cardBackSrc,
  cardImage,
  cardLabel,
  F7_FORCED_FLIP_DURATION_SEC,
  F7_FORCED_FLIP_EASE,
  F7_FORCED_FLIP_INTRO_MS,
  type Flip7FlipCardItem,
} from '../lib/flip7Ui';

type Props = {
  card: Flip7FlipCardItem;
};

export function Flip7FlipRevealModal({ card }: Props) {
  return (
    <div className="modal-overlay f7-flip-reveal-overlay" role="dialog" aria-modal>
      <div className="modal f7-flip-reveal-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center">Flip บังคับจั่ว</h2>
        <p className="f7-flip-reveal__sub">
          <span className="f7-flip-reveal__who">
            <PlayerAvatar
              playerId={card.sourcePlayerId}
              name={card.sourceName}
              size={22}
              decorative
              className="f7-player-avatar"
            />
            {card.sourceName}
          </span>
          <span className="f7-flip-reveal__arrow" aria-hidden>
            →
          </span>
          <span className="f7-flip-reveal__who">
            <PlayerAvatar
              playerId={card.targetPlayerId}
              name={card.targetName}
              size={22}
              decorative
              className="f7-player-avatar"
            />
            {card.targetName}
          </span>
          <span className="f7-flip-reveal__flip-count">
            (ใบที่ {card.flipIndex + 1}/{card.flipTotal})
          </span>
        </p>
        <div className="f7-flip-reveal__row">
          <div key={card.id} className="f7-flip-reveal__slot">
            <div className="f7-card-flip-perspective">
              <div
                className="f7-card-flip-inner f7-card-flip-inner--revealed"
                style={{
                  transformStyle: 'preserve-3d',
                  animationDelay: `${F7_FORCED_FLIP_INTRO_MS}ms`,
                  animationDuration: `${F7_FORCED_FLIP_DURATION_SEC}s`,
                  animationTimingFunction: `cubic-bezier(${F7_FORCED_FLIP_EASE.join(',')})`,
                }}
              >
                <div className="f7-card-flip-face f7-card-flip-face--back" aria-hidden>
                  <img
                    src={cardBackSrc()}
                    alt=""
                    className="f7-card-flip-img"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <div className="f7-card-flip-face f7-card-flip-face--front">
                  <img
                    src={cardImage(card.card)}
                    alt={cardLabel(card.card)}
                    className="f7-card-flip-img"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
