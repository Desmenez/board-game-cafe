import { useDroppable } from '@dnd-kit/core';
import { sprintValue } from 'shared';
import {
  FUGITIVE_DROP_HIDEOUT,
  FUGITIVE_DROP_SPRINT,
  type StagingState,
  tryStageHideout,
} from '../lib/fugitivePlacement';
import { FugitiveCardFace } from './FugitiveCardFace';

type DragHighlight = 'valid' | 'invalid' | null;

type Props = {
  lastHideoutValue: number;
  staging: StagingState;
  isDragging: boolean;
  dragCard: number | null;
  onZoneClick: (zone: 'hideout' | 'sprint') => void;
  onUnstageCard: (card: number) => void;
};

function TrackHideoutDrop({
  staging,
  isDragging,
  dragHighlight,
  onZoneClick,
  onUnstageCard,
}: {
  staging: StagingState;
  isDragging: boolean;
  dragHighlight: DragHighlight;
  onZoneClick: () => void;
  onUnstageCard: (card: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: FUGITIVE_DROP_HIDEOUT });
  const showOver = isOver && isDragging;

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={[
        'fugitive-track-hideout-drop',
        isDragging ? 'fugitive-track-hideout-drop--active' : '',
        showOver && dragHighlight === 'valid' ? 'fugitive-track-hideout-drop--over-valid' : '',
        showOver && dragHighlight === 'invalid' ? 'fugitive-track-hideout-drop--over-invalid' : '',
        showOver && dragHighlight === null ? 'fugitive-track-hideout-drop--over' : '',
        staging.hideout !== null ? 'fugitive-track-hideout-drop--filled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => {
        if (staging.hideout !== null) return;
        onZoneClick();
      }}
      aria-label="วาง hideout ใหม่บนเส้นทาง"
    >
      {staging.hideout !== null ? (
        <span
          className="fugitive-track-hideout-drop__card"
          onClick={(e) => {
            e.stopPropagation();
            onUnstageCard(staging.hideout!);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onUnstageCard(staging.hideout!);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`คืนการ์ด hideout ${staging.hideout} เข้ามือ`}
        >
          <FugitiveCardFace value={staging.hideout} />
        </span>
      ) : (
        <span className="fugitive-track-hideout-drop__placeholder" aria-hidden>
          {showOver && dragHighlight === 'invalid' ? 'วางไม่ได้' : '+'}
        </span>
      )}
    </button>
  );
}

function TrackSprintZone({
  staging,
  isDragging,
  onZoneClick,
  onUnstageCard,
}: {
  staging: StagingState;
  isDragging: boolean;
  onZoneClick: () => void;
  onUnstageCard: (card: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: FUGITIVE_DROP_SPRINT });
  const showOver = isOver && isDragging;
  const hasSprints = staging.sprints.length > 0;

  return (
    <div className="fugitive-staging-column__sprint">
      {hasSprints && (
        <div
          className={[
            'fugitive-hideout-slot__sprint-stack',
            'fugitive-sprint-stack--cards',
            'fugitive-staging-column__sprint-stack',
          ].join(' ')}
          aria-label={`Sprint ${staging.sprints.length} ใบ`}
        >
          {staging.sprints.map((card, index) => (
            <button
              key={`${card}-${index}`}
              type="button"
              className="fugitive-staging-column__sprint-card"
              onClick={() => onUnstageCard(card)}
              aria-label={`คืน sprint ${card} (+${sprintValue(card)}) เข้ามือ`}
            >
              <FugitiveCardFace value={card} />
              <span className="fugitive-zone__sprint-badge">+{sprintValue(card)}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        ref={setNodeRef}
        className={[
          'fugitive-track-sprint-drop',
          isDragging ? 'fugitive-track-sprint-drop--active' : '',
          showOver ? 'fugitive-track-sprint-drop--over' : '',
          hasSprints ? 'fugitive-track-sprint-drop--compact' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onZoneClick}
        aria-label="วาง sprint"
      >
        <span className="fugitive-track-sprint-drop__label">
          {showOver ? 'ปล่อย' : hasSprints ? '+' : 'Sprint'}
        </span>
      </button>
    </div>
  );
}

export function FugitiveStagingColumn({
  lastHideoutValue,
  staging,
  isDragging,
  dragCard,
  onZoneClick,
  onUnstageCard,
}: Props) {
  const dragHighlight: DragHighlight =
    dragCard !== null
      ? tryStageHideout(lastHideoutValue, dragCard, staging.sprints).ok
        ? 'valid'
        : 'invalid'
      : null;

  return (
    <div className="fugitive-hideout-slot fugitive-staging-column">
      <TrackSprintZone
        staging={staging}
        isDragging={isDragging}
        onZoneClick={() => onZoneClick('sprint')}
        onUnstageCard={onUnstageCard}
      />
      <TrackHideoutDrop
        staging={staging}
        isDragging={isDragging}
        dragHighlight={dragHighlight}
        onZoneClick={() => onZoneClick('hideout')}
        onUnstageCard={onUnstageCard}
      />
    </div>
  );
}
