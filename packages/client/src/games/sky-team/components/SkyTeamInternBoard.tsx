import type { CSSProperties } from 'react';
import type { SkyTeamInternToken, SkyTeamPlacedDie, SkyTeamSlotId } from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { DEFAULT_INTERN_LAYOUT, type SkyTeamInternLayout } from '../internLayout';
import { SkyTeamDieFace } from './SkyTeamDice';

type Props = {
  wells: Array<SkyTeamInternToken | null>;
  pilotOccupied: SkyTeamPlacedDie | null;
  copilotOccupied: SkyTeamPlacedDie | null;
  pilotCanPlace: boolean;
  copilotCanPlace: boolean;
  selectedDieId: string | null;
  onSlotClick: (slotId: SkyTeamSlotId) => void;
  layout?: SkyTeamInternLayout;
  forceShowSlots?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function SkyTeamInternBoard({
  wells,
  pilotOccupied,
  copilotOccupied,
  pilotCanPlace,
  copilotCanPlace,
  selectedDieId,
  onSlotClick,
  layout = DEFAULT_INTERN_LAYOUT,
  forceShowSlots = false,
  className,
  style,
}: Props) {
  const renderDieSlot = (
    slotId: SkyTeamSlotId,
    pos: { left: number; top: number },
    occupied: SkyTeamPlacedDie | null,
    canPlace: boolean,
    title: string,
  ) => {
    const canClick = Boolean(selectedDieId && !occupied && canPlace);
    return (
      <button
        type="button"
        className={cn(
          'st-slot st-intern__slot',
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

  return (
    <div className={cn('st-intern', className)} style={style}>
      <img
        src={imageMap.skyTeam.internBoard}
        alt="Intern board"
        className="st-intern__art"
        draggable={false}
      />

      {layout.tokenSlots.map((pos, index) => {
        const token = wells[index] ?? null;
        return (
          <div
            key={`intern-token-slot-${index}`}
            className="st-intern__token"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              width: `${layout.tokenWidth}%`,
            }}
            title={token ? `Intern ${token.value}` : undefined}
          >
            {token && (
              <>
                <img src={imageMap.skyTeam.internToken} alt="" draggable={false} />
                <span className="st-intern__token-value">{token.value}</span>
              </>
            )}
          </div>
        );
      })}

      {renderDieSlot(
        'intern_pilot',
        layout.pilotDieSlot,
        pilotOccupied,
        pilotCanPlace,
        'Intern (Pilot)',
      )}
      {renderDieSlot(
        'intern_copilot',
        layout.copilotDieSlot,
        copilotOccupied,
        copilotCanPlace,
        'Intern (Co-Pilot)',
      )}
    </div>
  );
}
