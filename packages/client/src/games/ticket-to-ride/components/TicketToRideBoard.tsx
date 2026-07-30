import { useCallback, useMemo, useRef, type CSSProperties, type PointerEvent } from 'react';
import type { TtrMapDefinition, TtrRouteView } from 'shared';
import { ttrCityName } from 'shared';
import { cn } from '../../../utils/cn';
import {
  buildTtrBoardGeometry,
  type TtrBoardLayout,
  type TtrPoint,
  type TtrRouteSlot,
} from '../boardGeometry';
import './board.css';

export type TicketToRideBoardProps = {
  map: TtrMapDefinition;
  /** Printed board art the layout is calibrated against. */
  image: string;
  layout: TtrBoardLayout;
  routes: TtrRouteView[];
  seatByPlayerId?: Record<string, number>;
  playerNameById?: Record<string, string>;
  /** Routes the viewer could pay for right now (server-authoritative). */
  claimableRouteIds?: ReadonlySet<string>;
  selectedRouteId?: string | null;
  onRouteSelect?: (routeId: string) => void;
  highlightedCityIds?: ReadonlySet<string>;
  /** Layout lab: outline every car cell and show draggable city handles. */
  showSlotOutlines?: boolean;
  showCityDots?: boolean;
  selectedCityId?: string | null;
  onCitySelect?: (cityId: string) => void;
  onCityMove?: (cityId: string, point: TtrPoint) => void;
  /** Layout lab: route whose bend handles are editable. */
  waypointRouteId?: string | null;
  onWaypointMove?: (routeId: string, index: number, point: TtrPoint) => void;
  className?: string;
};

function slotStyle(slot: TtrRouteSlot): CSSProperties {
  return {
    left: `${slot.left}%`,
    top: `${slot.top}%`,
    width: `${slot.length}%`,
    aspectRatio: `${slot.length} / ${slot.width}`,
    transform: `translate(-50%, -50%) rotate(${slot.angleDeg}deg)`,
  };
}

function pointStyle(point: TtrPoint, size: number): CSSProperties {
  return {
    left: `${point.left}%`,
    top: `${point.top}%`,
    width: `${size}%`,
    aspectRatio: '1 / 1',
  };
}

export function TicketToRideBoard({
  map,
  image,
  layout,
  routes,
  seatByPlayerId = {},
  playerNameById = {},
  claimableRouteIds,
  selectedRouteId = null,
  onRouteSelect,
  highlightedCityIds,
  showSlotOutlines = false,
  showCityDots = false,
  selectedCityId = null,
  onCitySelect,
  onCityMove,
  waypointRouteId = null,
  onWaypointMove,
  className,
}: TicketToRideBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const geometry = useMemo(() => buildTtrBoardGeometry(map, layout), [map, layout]);

  const pointFromEvent = useCallback((event: PointerEvent<HTMLElement>): TtrPoint | null => {
    const box = boardRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return null;
    return {
      left: Math.round(((event.clientX - box.left) / box.width) * 1000) / 10,
      top: Math.round(((event.clientY - box.top) / box.height) * 1000) / 10,
    };
  }, []);

  const dragHandlers = useCallback(
    (onMove: (point: TtrPoint) => void) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const point = pointFromEvent(event);
        if (point) onMove(point);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
      },
    }),
    [pointFromEvent],
  );

  const waypoints = waypointRouteId ? (layout.routes[waypointRouteId]?.waypoints ?? []) : [];

  return (
    <div
      ref={boardRef}
      className={cn('ttr-board-art', className)}
      style={{ aspectRatio: layout.aspectRatio }}
    >
      <img className="ttr-board-art__img" src={image} alt={`${map.name} board`} draggable={false} />

      {routes.map((route) => {
        const slots = geometry.slotsByRouteId[route.id] ?? [];
        const seat = route.ownerId != null ? (seatByPlayerId[route.ownerId] ?? 0) % 6 : null;
        const claimable = claimableRouteIds?.has(route.id) ?? false;
        // Claimed routes stay selectable so the panel can name their owner.
        const interactive = onRouteSelect != null;
        const label = `${ttrCityName(map, route.def.a)} – ${ttrCityName(map, route.def.b)} · ${route.def.length}`;
        const title =
          route.ownerId != null
            ? `${label} · ${playerNameById[route.ownerId] ?? route.ownerId}`
            : label;

        return slots.map((slot, index) => {
          const classes = cn(
            'ttr-slot',
            `ttr-slot--${route.def.color}`,
            seat != null && `ttr-owner-seat-${seat}`,
            route.ownerId != null && 'is-claimed',
            claimable && 'is-claimable',
            selectedRouteId === route.id && 'is-selected',
            showSlotOutlines && 'is-outlined',
          );
          const key = `${route.id}-${index}`;
          if (!interactive) {
            return <div key={key} className={classes} style={slotStyle(slot)} title={title} />;
          }
          return (
            <button
              key={key}
              type="button"
              className={classes}
              style={slotStyle(slot)}
              title={title}
              aria-label={title}
              onClick={() => onRouteSelect?.(route.id)}
            />
          );
        });
      })}

      {map.cities.map((city) => {
        const point = geometry.cityPoints[city.id];
        if (!point) return null;
        const highlighted = highlightedCityIds?.has(city.id) ?? false;
        if (!showCityDots && !highlighted) return null;
        const classes = cn(
          'ttr-city',
          highlighted && 'is-highlight',
          selectedCityId === city.id && 'is-selected',
          onCityMove && 'is-draggable',
        );
        const style = pointStyle(point, layout.citySize);
        if (!onCityMove && !onCitySelect) {
          return <div key={city.id} className={classes} style={style} title={city.name} />;
        }
        return (
          <button
            key={city.id}
            type="button"
            className={classes}
            style={style}
            title={city.name}
            aria-label={city.name}
            onClick={() => onCitySelect?.(city.id)}
            {...(onCityMove
              ? dragHandlers((next) => {
                  onCitySelect?.(city.id);
                  onCityMove(city.id, next);
                })
              : {})}
          />
        );
      })}

      {waypointRouteId && onWaypointMove
        ? waypoints.map((point, index) => (
            <button
              key={`${waypointRouteId}-wp-${index}`}
              type="button"
              className="ttr-waypoint"
              style={pointStyle(point, layout.citySize * 0.8)}
              aria-label={`bend ${index + 1}`}
              {...dragHandlers((next) => onWaypointMove(waypointRouteId, index, next))}
            />
          ))
        : null}
    </div>
  );
}
