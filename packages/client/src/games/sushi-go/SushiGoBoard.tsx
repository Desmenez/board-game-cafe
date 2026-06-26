import { forwardRef } from 'react';
import { DeckStack } from '../../components/deck-stack';
import { CARD_BACK_URL } from './cardMeta';

type Props = {
  drawPileCount: number;
  discardPileCount: number;
  passDirection: 'left' | 'right';
  shuffleTick: number;
};

export const SushiGoBoard = forwardRef<HTMLDivElement, Props>(function SushiGoBoard(
  { drawPileCount, discardPileCount, passDirection, shuffleTick },
  ref,
) {
  const passLabel = passDirection === 'left' ? 'ส่งซ้าย ←' : 'ส่งขวา →';

  return (
    <section className="sg-panel sg-board" aria-label="กลางโต๊ะ">
      <div>
        <h3 className="sg-board__pile-title">กองจั่ว</h3>
        <DeckStack
          ref={ref}
          backSrc={CARD_BACK_URL}
          className="sg-deck-stack"
          motionClassName="sg-deck-stack-motion"
          layerClassName="sg-deck-layer"
          shuffleTick={shuffleTick}
        />
        <span className="sg-board__count">{drawPileCount} ใบ</span>
      </div>
      <div>
        <h3 className="sg-board__pile-title">กองทิ้ง</h3>
        <div className="sg-card sg-card--board">
          <img src={CARD_BACK_URL} alt="" className="sg-card__img" />
        </div>
        <span className="sg-board__count">{discardPileCount} ใบ</span>
      </div>
      <div>
        <h3 className="sg-board__pile-title">ทิศส่งมือ</h3>
        <p style={{ margin: 0, fontWeight: 700 }}>{passLabel}</p>
      </div>
    </section>
  );
});
