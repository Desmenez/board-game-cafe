import { forwardRef } from 'react';
import type { LoveLetterCard } from 'shared';
import { DeckStack } from '../../../components/deck-stack';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { CARD_BACK_URL } from '../lib/cardMeta';

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
    <section className="card ll-board flex flex-col items-center gap-4 p-4" aria-label="กลางโต๊ะ">
      <div className="flex justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <h3 className="m-0 text-sm text-[var(--text-muted)]">กองจั่ว</h3>
          <DeckStack
            ref={ref}
            backSrc={CARD_BACK_URL}
            className="ll-deck-stack"
            motionClassName="ll-deck-stack-motion"
            layerClassName="ll-deck-layer"
            shuffleTick={shuffleTick}
          />
          <span className="text-sm font-semibold" aria-label={`เหลือ ${drawPileCount} ใบ`}>
            {drawPileCount}
          </span>
        </div>
      </div>

      {setAsideCards.length > 0 ? (
        <div className="w-full text-center">
          <h3 className="mb-2 mt-0 text-sm text-[var(--text-muted)]">การ์ดอ้างอิง (2 คน)</h3>
          <div className="flex justify-center gap-2" role="list">
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
