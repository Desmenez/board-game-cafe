import type { SkyTeamPlacedDie, SkyTeamSlotId } from 'shared';
import {
  ICE_BRAKE_LEVELS,
  iceBrakeCopilotSlot,
  iceBrakePilotSlot,
  type IceBrakeLevel,
} from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { DEFAULT_ICE_BRAKES_LAYOUT, type SkyTeamIceBrakesLayout } from '../iceBrakesLayout';
import { SkyTeamDieFace } from './SkyTeamDice';
import { SkyTeamTrackMark } from './SkyTeamMarks';

type Props = {
  markerPosition: number;
  occupiedBySlot: Partial<Record<SkyTeamSlotId, SkyTeamPlacedDie | null>>;
  canPlaceBySlot: Partial<Record<SkyTeamSlotId, boolean>>;
  selectedDieId: string | null;
  onSlotClick: (slotId: SkyTeamSlotId) => void;
  layout?: SkyTeamIceBrakesLayout;
  /** Lab: render without main-board overlay positioning. */
  standalone?: boolean;
  forceShowSlots?: boolean;
  className?: string;
};

export function SkyTeamIceBrakesBoard({
  markerPosition,
  occupiedBySlot,
  canPlaceBySlot,
  selectedDieId,
  onSlotClick,
  layout = DEFAULT_ICE_BRAKES_LAYOUT,
  standalone = false,
  forceShowSlots = false,
  className,
}: Props) {
  const markerPos =
    layout.markerTrack[Math.max(0, Math.min(layout.markerTrack.length - 1, markerPosition))]!;

  const renderDieSlot = (
    slotId: SkyTeamSlotId,
    pos: { left: number; top: number },
    title: string,
  ) => {
    const occupied = occupiedBySlot[slotId] ?? null;
    const canPlace = Boolean(canPlaceBySlot[slotId]);
    const canClick = Boolean(selectedDieId && !occupied && canPlace);
    return (
      <button
        key={slotId}
        type="button"
        className={cn(
          'st-slot st-ice-brakes__slot',
          canPlace && !occupied ? 'st-slot--legal' : '',
          occupied ? 'st-slot--filled' : '',
          canClick ? 'st-slot--active' : '',
          forceShowSlots ? 'st-slot--demo' : '',
        )}
        style={{
          left: `${pos.left}%`,
          top: `${pos.top}%`,
          width: `${layout.dieSlotSize}%`,
        }}
        disabled={!canClick && !forceShowSlots}
        onClick={() => onSlotClick(slotId)}
        title={title}
      >
        {occupied && <SkyTeamDieFace value={occupied.value} color={occupied.color} size="sm" />}
      </button>
    );
  };

  const board = (
    <div className={cn('st-ice-brakes', standalone && 'st-ice-brakes--standalone', className)}>
      <img
        src={imageMap.skyTeam.iceBrakesBoard}
        alt="Ice Brakes"
        className="st-ice-brakes__art"
        draggable={false}
      />

      <SkyTeamTrackMark
        tone="red"
        className="st-ice-brakes__marker"
        title={`Ice brake marker ${markerPosition}`}
        style={{
          left: `${markerPos.left}%`,
          top: `${markerPos.top}%`,
          width: `${layout.markerWidth}%`,
        }}
      />

      {ICE_BRAKE_LEVELS.map((level: IceBrakeLevel) =>
        renderDieSlot(
          iceBrakePilotSlot(level),
          layout.pilotSlots[level],
          `Ice Brakes ${level} (Pilot)`,
        ),
      )}
      {ICE_BRAKE_LEVELS.map((level: IceBrakeLevel) =>
        renderDieSlot(
          iceBrakeCopilotSlot(level),
          layout.copilotSlots[level],
          `Ice Brakes ${level} (Co-Pilot)`,
        ),
      )}
    </div>
  );

  if (standalone) return board;

  return (
    <div
      className="st-ice-brakes-overlay"
      style={{
        left: `${layout.overlay.left}%`,
        top: `${layout.overlay.top}%`,
        width: `${layout.overlay.width}%`,
      }}
    >
      {board}
    </div>
  );
}
