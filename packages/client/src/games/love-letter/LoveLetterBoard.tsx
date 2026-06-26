import { forwardRef } from 'react';
import type { LoveLetterCard } from 'shared';
import { DeckStack } from '../../components/deck-stack';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { CARD_BACK_URL } from './cardMeta';

type Props = {
  drawPileCount: number;
  setAsideCards: LoveLetterCard[];
  shuffleTick: number;
};

export const LoveLetterBoard = forwardRef<HTMLDivElement, Props>(function LoveLetterBoard(
  { drawPileCount, setAsideCards, shuffleTick },
  ref,
) {
  return (
    <section className="card ll-board" aria-label="กลางโต๊ะ">
      <div className="ll-board__piles">
        <div className="ll-board__pile ll-board__pile--draw">
          <h3 className="ll-board__pile-title">กองจั่ว</h3>
          <DeckStack
            ref={ref}
            backSrc={CARD_BACK_URL}
            className="ll-deck-stack"
            motionClassName="ll-deck-stack-motion"
            layerClassName="ll-deck-layer"
            shuffleTick={shuffleTick}
          />
          <span className="ll-board__count" aria-label={`เหลือ ${drawPileCount} ใบ`}>
            {drawPileCount}
          </span>
        </div>
      </div>

      {setAsideCards.length > 0 ? (
        <div className="ll-board__set-aside">
          <h3 className="ll-board__set-aside-title">การ์ดอ้างอิง (2 คน)</h3>
          <div className="ll-board__set-aside-cards" role="list">
            {setAsideCards.map((card) => (
              <div key={card.id} role="listitem">
                <LoveLetterCardFace card={card} size="tiny" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
});
