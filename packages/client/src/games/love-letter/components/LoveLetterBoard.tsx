import { forwardRef } from 'react';
import type { LoveLetterCard } from 'shared';
import { DeckStack } from '../../../components/deck-stack';
import { cn } from '../../../utils/cn';
import { CARD_BACK_URL } from '../lib/cardMeta';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { LoveLetterPlayDropzone } from './LoveLetterPlayDropzone';

type Props = {
  drawPileCount: number;
  setAsideCards: LoveLetterCard[];
  shuffleTick: number;
  playActive: boolean;
  isDragging: boolean;
};

export const LoveLetterBoard = forwardRef<HTMLDivElement, Props>(function LoveLetterBoard(
  { drawPileCount, setAsideCards, shuffleTick, playActive, isDragging },
  ref,
) {
  const hasSetAside = setAsideCards.length > 0;

  return (
    <section
      className={cn(
        'card ll-board',
        hasSetAside && 'll-board--with-ref',
        isDragging && 'll-board--dragging',
      )}
      aria-label="กลางโต๊ะ"
    >
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

      <LoveLetterPlayDropzone
        disabled={!playActive}
        active={playActive}
        className="ll-board__pile ll-board__pile--play"
      >
        <h3 className="ll-board__pile-title">{playActive ? 'โซนเล่น' : 'ทิ้งการ์ด'}</h3>
        <div className="ll-play-zone__slot" aria-hidden>
          {playActive ? (
            <p className="ll-play-zone__hint">
              {isDragging ? 'วางที่นี่' : 'ลากการ์ดจากมือมาวาง'}
            </p>
          ) : (
            <p className="ll-play-zone__hint ll-play-zone__hint--idle">รอตาเล่น</p>
          )}
        </div>
      </LoveLetterPlayDropzone>

      {hasSetAside ? (
        <div className="ll-board__pile ll-board__pile--ref ll-board__set-aside">
          <h3 className="ll-board__pile-title">การ์ดอ้างอิง</h3>
          <div className="ll-board__set-aside-cards" role="list">
            {setAsideCards.map((card) => (
              <div key={card.id} role="listitem">
                <LoveLetterCardFace card={card} size="ref" />
              </div>
            ))}
          </div>
          <span className="ll-board__ref-note">2 คน</span>
        </div>
      ) : null}
    </section>
  );
});
