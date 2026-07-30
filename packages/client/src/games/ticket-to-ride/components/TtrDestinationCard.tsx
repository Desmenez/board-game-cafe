import type { TtrMapDefinition, TtrMapId } from 'shared';
import { ttrCityName } from 'shared';
import { cn } from '../../../utils/cn';
import { ttrMapPresentation } from '../maps';
import type { TtrDestinationCardLayout } from '../maps/destinationCardLayout';

type Props = {
  map: TtrMapDefinition;
  a: string;
  b: string;
  points: number;
  /** Overridable so the dev lab can drive it live. */
  cardLayout?: TtrDestinationCardLayout;
  /** Override art URL (defaults to the map's destination front template). */
  imageSrc?: string;
  /** Show outline boxes for route/points (dev lab). */
  showOutlines?: boolean;
  className?: string;
};

/** Printed destination ticket front: template art + route text + points. */
export function TtrDestinationCard({
  map,
  a,
  b,
  points,
  cardLayout,
  imageSrc,
  showOutlines = false,
  className,
}: Props) {
  const presentation = ttrMapPresentation(map.id as TtrMapId);
  const layout = cardLayout ?? presentation.destinationCard.layout;
  const src = imageSrc ?? presentation.destinationCard.image;
  const cityA = ttrCityName(map, a);
  const cityB = ttrCityName(map, b);
  const routeLabel = `${cityA} - ${cityB}`;

  return (
    <div
      className={cn('ttr-dest-card', showOutlines && 'ttr-dest-card--outlines', className)}
      style={{ aspectRatio: String(layout.aspectRatio) }}
    >
      <img className="ttr-dest-card__art" src={src} alt="" draggable={false} loading="lazy" />
      <span
        className="ttr-dest-card__route"
        style={{
          left: `${layout.route.left}%`,
          top: `${layout.route.top}%`,
          width: `${layout.route.width}%`,
          fontSize: `${layout.route.fontSize}cqw`,
        }}
        title={routeLabel}
      >
        {routeLabel}
      </span>
      <span
        className="ttr-dest-card__points text-red-900!"
        style={{
          left: `${layout.points.left}%`,
          top: `${layout.points.top}%`,
          fontSize: `${layout.points.fontSize}cqw`,
        }}
      >
        {points}
      </span>
    </div>
  );
}
