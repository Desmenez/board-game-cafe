import type { CSSProperties } from 'react';
import type { SkyTeamPlacedDie } from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import {
  DEFAULT_KEROSENE_LAYOUT,
  markerTopForRemaining,
  type SkyTeamKeroseneLayout,
} from '../keroseneLayout';
import { SkyTeamDieFace } from './SkyTeamDice';

type Props = {
  remaining: number;
  occupied: SkyTeamPlacedDie | null;
  canPlace: boolean;
  selectedDieId: string | null;
  onSlotClick: () => void;
  layout?: SkyTeamKeroseneLayout;
  /** `leak` blocks the die slot and shows the X marker. */
  mode?: 'kerosene' | 'leak';
  /** Always show die slot outline (layout lab). */
  forceShowSlot?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function SkyTeamKeroseneTrack({
  remaining,
  occupied,
  canPlace,
  selectedDieId,
  onSlotClick,
  layout = DEFAULT_KEROSENE_LAYOUT,
  mode = 'kerosene',
  forceShowSlot = false,
  className,
  style,
}: Props) {
  const markerTop = markerTopForRemaining(layout, remaining);
  const isLeak = mode === 'leak';
  const canClick = !isLeak && Boolean(selectedDieId && !occupied && canPlace);

  return (
    <div className={cn('st-kerosene', className)} style={style}>
      <img
        src={imageMap.skyTeam.keroseneBoard}
        alt={isLeak ? 'Kerosene leak track' : 'Kerosene track'}
        className="st-kerosene__art"
        draggable={false}
      />

      <div
        className="st-kerosene__marker"
        style={{
          left: `${layout.markerLeft}%`,
          top: `${markerTop}%`,
          width: `${layout.markerWidth}%`,
        }}
        title={`Kerosene ${remaining}`}
      >
        <img src={imageMap.skyTeam.keroseneMarker} alt="" draggable={false} />
      </div>

      {isLeak ? (
        <div
          className="st-kerosene__leak"
          style={{
            left: `${layout.leakMarker.left}%`,
            top: `${layout.leakMarker.top}%`,
            width: `${layout.leakMarkerWidth}%`,
          }}
          title="Kerosene action blocked"
        >
          <img src={imageMap.skyTeam.keroseneLeakMarker} alt="" draggable={false} />
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            'st-slot st-kerosene__slot',
            canPlace && !occupied ? 'st-slot--legal' : '',
            occupied ? 'st-slot--filled' : '',
            canClick ? 'st-slot--active' : '',
            forceShowSlot ? 'st-slot--demo' : '',
          )}
          style={{
            left: `${layout.dieSlot.left}%`,
            top: `${layout.dieSlot.top}%`,
            width: `${layout.dieSlotSize}%`,
          }}
          disabled={!canClick && !forceShowSlot}
          onClick={onSlotClick}
          title="Kerosene"
        >
          {occupied && <SkyTeamDieFace value={occupied.value} color={occupied.color} size="sm" />}
        </button>
      )}
    </div>
  );
}
