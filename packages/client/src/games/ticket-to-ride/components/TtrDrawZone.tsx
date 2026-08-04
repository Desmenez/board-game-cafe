import type { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { TtrTrainColor } from 'shared';
import { DeckStack } from '../../../components/deck-stack';
import { Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

function DrawDraggable({
  dragId,
  children,
  className,
  disabled = false,
}: {
  dragId: string;
  children: ReactNode;
  className: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={className}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.55 : 1 }}
      {...attributes}
      {...listeners}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

type Props = {
  faceUpTrainCards: TtrTrainColor[];
  canAct: boolean;
  mustDrawSecondTrainCard: boolean;
  deckRegularTicketsRemaining: number;
  onDrawTickets: () => void;
};

export function TtrDrawZone({
  faceUpTrainCards,
  canAct,
  mustDrawSecondTrainCard,
  deckRegularTicketsRemaining,
  onDrawTickets,
}: Props) {
  return (
    <section className="card ttr-panel ttr-draw-row">
      <h3>โซนจั่วการ์ด</h3>
      <div className="ttr-draw-grid">
        <div className="ttr-draw-block ttr-draw-block--destination">
          <h4>จั่วการ์ดรถไฟ</h4>
          <p className="muted">ลากการ์ดมาวางที่มือด้านล่าง</p>
          {mustDrawSecondTrainCard ? (
            <p className="muted">จั่วใบแรกแล้ว: ใบที่สองห้ามเลือก locomotive จากไพ่หงาย</p>
          ) : null}
          <div className="ttr-train-draw-area">
            <DrawDraggable dragId="draw:deck" className="ttr-train-back-deck" disabled={!canAct}>
              <DeckStack
                backSrc={imageMap.ticketToRide.trainCardBack}
                className="ttr-deck-stack"
                layerClassName="ttr-deck-stack__layer"
                offset={{ x: 7, y: 5 }}
              />
            </DrawDraggable>
            <div className="ttr-faceup-row">
              {faceUpTrainCards.map((c, i) => (
                <DrawDraggable
                  key={`${c}-${i}`}
                  dragId={`draw:faceup:${i}`}
                  className={`ttr-faceup-card ${c}`}
                  disabled={!canAct || (mustDrawSecondTrainCard && c === 'locomotive')}
                >
                  <img
                    src={imageMap.ticketToRide.trainCards[c]}
                    alt={TTR_TRAIN_COLOR_LABEL[c]}
                    loading="lazy"
                  />
                </DrawDraggable>
              ))}
            </div>
          </div>
        </div>

        <div className="ttr-draw-block">
          <h4>จั่วการ์ดเส้นทาง</h4>
          <div className="flex flex-col items-center">
            <div className="ttr-destination-draw-deck" aria-hidden>
              <DeckStack
                backSrc={imageMap.ticketToRide.destinationCardBack}
                className="ttr-deck-stack"
                layerClassName="ttr-deck-stack__layer"
                offset={{ x: 7, y: 5 }}
              />
            </div>
            <Button
              type="button"
              className="ttr-destination-draw-action"
              disabled={!canAct || mustDrawSecondTrainCard || deckRegularTicketsRemaining === 0}
              onClick={onDrawTickets}
            >
              จั่วการ์ดเส้นทาง
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
