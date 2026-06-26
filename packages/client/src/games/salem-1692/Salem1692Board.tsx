import { forwardRef } from 'react';
import { DeckStack } from '../../components/deck-stack';
import { CARD_BACK_URL } from './cardMeta';

type Props = {
  drawPileCount: number;
  discardPileCount: number;
  shuffleTick: number;
};

export const Salem1692Board = forwardRef<HTMLDivElement, Props>(function Salem1692Board(
  { drawPileCount, discardPileCount, shuffleTick },
  ref,
) {
  return (
    <section className="s1692-panel s1692-board" aria-label="กลางโต๊ะ">
      <div>
        <h3 style={{ marginTop: 0 }}>กองจั่ว</h3>
        <DeckStack
          ref={ref}
          backSrc={CARD_BACK_URL}
          className="s1692-deck-stack"
          motionClassName="s1692-deck-stack-motion"
          layerClassName="s1692-deck-layer"
          shuffleTick={shuffleTick}
        />
        <span className="s1692-board__count">{drawPileCount} ใบ</span>
      </div>
      <div>
        <h3 style={{ marginTop: 0 }}>กองทิ้ง</h3>
        <div className="s1692-card">
          <img src={CARD_BACK_URL} alt="" className="s1692-card__img" />
        </div>
        <span className="s1692-board__count">{discardPileCount} ใบ</span>
      </div>
      <div>
        <h3 style={{ marginTop: 0 }}>Witch Tryal</h3>
        <p style={{ margin: 0, fontWeight: 700 }}>เปิดเผยแล้ว / ทั้งหมด</p>
      </div>
    </section>
  );
});
