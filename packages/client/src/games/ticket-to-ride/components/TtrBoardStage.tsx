import { useRef } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { TicketToRideBoard, type TicketToRideBoardProps } from './TicketToRideBoard';

type Props = TicketToRideBoardProps & { hint: string };

/** Pan/zoom viewport around the printed board. Track and city hits are excluded from panning. */
export function TtrBoardStage({ hint, ...boardProps }: Props) {
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const india = boardProps.map.id === 'india';

  return (
    <div className={cn('card ttr-board-stage p-3', india && 'ttr-board-stage--india')}>
      <div className="ttr-board-stage__toolbar">
        <p className="ttr-board-stage__hint">{hint}</p>
        <div className="ttr-board-stage__zoom">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => transformRef.current?.zoomOut(0.15)}
            aria-label="ซูมออก"
          >
            −
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => transformRef.current?.resetTransform()}
          >
            รีเซ็ตมุมมอง
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => transformRef.current?.zoomIn(0.15)}
            aria-label="ซูมเข้า"
          >
            +
          </Button>
        </div>
      </div>
      <div
        className="ttr-board-stage__viewport"
        style={{ aspectRatio: boardProps.layout.aspectRatio }}
      >
        <TransformWrapper
          ref={transformRef}
          minScale={1}
          maxScale={4}
          initialScale={1}
          centerOnInit
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.12, activationKeys: ['Control'] }}
          panning={{ allowLeftClickPan: true, excluded: ['ttr-slot', 'ttr-city'] }}
        >
          <TransformComponent
            wrapperClass="ttr-board-stage__rz-wrapper"
            contentClass="ttr-board-stage__rz-content"
          >
            <TicketToRideBoard {...boardProps} />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}
