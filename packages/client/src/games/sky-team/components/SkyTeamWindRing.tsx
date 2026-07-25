import type { CSSProperties } from 'react';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { DEFAULT_WIND_LAYOUT, type SkyTeamWindLayout } from '../windLayout';

type Props = {
  position: number;
  modifier: number;
  layout?: SkyTeamWindLayout;
  className?: string;
  style?: CSSProperties;
};

/** Wind ring panel — sibling to the RIGHT of the main board (top-aligned). */
export function SkyTeamWindRing({
  position,
  modifier,
  layout = DEFAULT_WIND_LAYOUT,
  className,
  style,
}: Props) {
  const rotation = layout.baseRotation + position * layout.stepDegrees;

  return (
    <div
      className={cn('st-wind', className)}
      style={style}
      title={`Wind ${modifier >= 0 ? '+' : ''}${modifier}`}
    >
      <img
        src={imageMap.skyTeam.windsBoard}
        alt="Wind ring"
        className="st-wind__ring"
        draggable={false}
      />
      <div
        className="st-wind__plane"
        style={{
          width: `${layout.planeSize}%`,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
      >
        <img src={imageMap.skyTeam.windsPlane} alt="" draggable={false} />
      </div>
    </div>
  );
}
