import { useDroppable } from '@dnd-kit/core';
import type { CupTheCrabCard, CupTheCrabPlayerView } from 'shared';
import { cupTheCrabCardImage } from './cardMeta';
import {
  buildPlayColumns,
  partitionStackCards,
  stackCupPoints,
  stackHasBottle,
  type PlayColumnSlot,
} from './playTargets';

function scoreTier(points: number): 'zero' | 'low' | 'mid' | 'high' {
  if (points <= 0) return 'zero';
  if (points <= 5) return 'low';
  if (points <= 10) return 'mid';
  return 'high';
}

function ColumnScoreBadge({ points, bottled = false }: { points: number; bottled?: boolean }) {
  const tier = scoreTier(points);

  return (
    <span
      className={[
        'ctc-stack-score',
        `ctc-stack-score--${tier}`,
        bottled ? 'ctc-stack-score--bottled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${points} แต้ม${bottled ? ' มีขวด' : ''}`}
    >
      <span className="ctc-stack-score__value">{points}</span>
      <span className="ctc-stack-score__unit">แต้ม</span>
      {bottled ? <span className="ctc-stack-score__tag">ขวด</span> : null}
    </span>
  );
}

function StackCardFace({ card }: { card: CupTheCrabCard }) {
  return (
    <img
      src={cupTheCrabCardImage(card)}
      alt=""
      className="ctc-card-img"
      loading="lazy"
      aria-hidden
    />
  );
}

function PlayColumn({
  slot,
  index,
  canDrop,
  isDragging,
}: {
  slot: PlayColumnSlot;
  index: number;
  canDrop: boolean;
  isDragging: boolean;
}) {
  const dropId = slot.type === 'stack' ? `ctc-stack-${slot.stack.id}` : slot.dropId;
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled: !canDrop,
  });

  const showHighlight = isDragging && canDrop && isOver;
  const isStack = slot.type === 'stack';
  const cupPoints = isStack ? stackCupPoints(slot.stack) : 0;
  const bottled = isStack ? stackHasBottle(slot.stack) : false;
  const stackLayout = isStack ? partitionStackCards(slot.stack.cards) : null;

  return (
    <div
      ref={setNodeRef}
      className={[
        'ctc-play-column',
        isStack ? 'ctc-play-column--stack' : 'ctc-play-column--empty',
        showHighlight ? 'ctc-play-column--over' : '',
        isDragging && canDrop ? 'ctc-play-column--droppable' : '',
        isDragging && !canDrop ? 'ctc-play-column--blocked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={
        isStack
          ? `กอง ${index + 1} ${cupPoints} แต้ม${bottled ? ' (มีขวด)' : ''}`
          : `ช่องเปิดกองใหม่ ${index + 1} 0 แต้ม`
      }
    >
      {isStack ? (
        <>
          <div className="ctc-play-column__head">
            <span className="ctc-play-column__label">กอง {index + 1}</span>
            <ColumnScoreBadge points={cupPoints} bottled={bottled} />
          </div>
          <div className="ctc-play-column__pile">
            {stackLayout!.cups.length > 0 ? (
              <div className="ctc-play-column__cups" aria-label="กองถ้วย">
                {stackLayout!.cups.map((c, cupIndex) => (
                  <div key={c.id} className="ctc-play-column__cup" style={{ zIndex: cupIndex + 1 }}>
                    <StackCardFace card={c} />
                  </div>
                ))}
              </div>
            ) : null}
            {stackLayout!.specials.length > 0 ? (
              <div className="ctc-play-column__specials" aria-label="การ์ดพิเศษ">
                {stackLayout!.specials.map((c, specialIndex) => (
                  <div
                    key={c.id}
                    className="ctc-play-column__special"
                    style={{ zIndex: specialIndex + 1 }}
                  >
                    <StackCardFace card={c} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="ctc-play-column__head">
            <span className="ctc-play-column__label">กองใหม่</span>
            <ColumnScoreBadge points={0} />
          </div>
          <p className="ctc-play-column__empty-hint">วางการ์ดที่นี่</p>
        </>
      )}
    </div>
  );
}

type Props = {
  gameState: CupTheCrabPlayerView;
  legalDropIds: Set<string>;
  isDragging: boolean;
};

export function CtcPlayColumns({ gameState, legalDropIds, isDragging }: Props) {
  const columns = buildPlayColumns(gameState);

  return (
    <section className="card ctc-play-board">
      <h2 className="ctc-play-board__title">
        กองบนโต๊ะ ({gameState.stacks.length}/{gameState.maxStacks})
      </h2>
      <p className="ctc-play-board__hint">
        {isDragging ? 'ปล่อยการ์ดบนคอลัมน์ที่ไฮไลต์เพื่อเล่น' : 'ลากการ์ดจากมือไปวางบนคอลัมน์'}
      </p>
      <div
        className="ctc-play-columns"
        style={{ gridTemplateColumns: `repeat(${gameState.maxStacks}, minmax(0, 1fr))` }}
      >
        {columns.map((slot, index) => {
          const dropId = slot.type === 'stack' ? `ctc-stack-${slot.stack.id}` : slot.dropId;
          return (
            <PlayColumn
              key={dropId}
              slot={slot}
              index={index}
              canDrop={legalDropIds.has(dropId)}
              isDragging={isDragging}
            />
          );
        })}
      </div>
    </section>
  );
}
