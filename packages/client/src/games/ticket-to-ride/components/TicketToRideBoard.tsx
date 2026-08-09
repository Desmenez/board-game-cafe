import { useCallback, useMemo, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import type { TtrMapDefinition, TtrRouteView } from 'shared';
import { ttrCityName } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import {
  buildTtrBoardGeometry,
  ttrLayoutOverlayScale,
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
  /** City id → owning player id for placed stations (Europe). */
  stationsByCity?: Record<string, string>;
  /** Cities the viewer could build a station on right now (server-authoritative). */
  stationEligibleCityIds?: ReadonlySet<string>;
  /** Station build mode: eligible cities glow and take clicks. */
  stationMode?: boolean;
  onStationCitySelect?: (cityId: string) => void;
  selectedStationCityId?: string | null;
  /** Layout lab: outline every car cell and show draggable city handles. */
  showSlotOutlines?: boolean;
  showCityDots?: boolean;
  selectedCityId?: string | null;
  /** Which visual marker is selected when a city has multiple (Japan hubs). */
  selectedCityMarkerIndex?: number | null;
  onCitySelect?: (cityId: string, markerIndex?: number) => void;
  onCityMove?: (cityId: string, point: TtrPoint, markerIndex?: number) => void;
  /** Layout lab: route whose bend handles are editable. */
  waypointRouteId?: string | null;
  onWaypointMove?: (routeId: string, index: number, point: TtrPoint) => void;
  /**
   * Layout lab: when claimed, paint cars by track colour (and special ferry/tunnel
   * swatches) instead of the owning player's seat colour.
   */
  paintClaimedAsTrack?: boolean;
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
  stationsByCity,
  stationEligibleCityIds,
  stationMode = false,
  onStationCitySelect,
  selectedStationCityId = null,
  showSlotOutlines = false,
  showCityDots = false,
  selectedCityId = null,
  selectedCityMarkerIndex = null,
  onCitySelect,
  onCityMove,
  waypointRouteId = null,
  onWaypointMove,
  paintClaimedAsTrack = false,
  className,
}: TicketToRideBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const geometry = useMemo(() => buildTtrBoardGeometry(map, layout), [map, layout]);
  const overlayScale = ttrLayoutOverlayScale(layout);
  const citySize = layout.citySize * overlayScale;

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
        const claimed = route.ownerId != null;
        const sharedBt = Boolean(route.sharedBulletTrain);
        // Shared BT is communal — never paint with a seat color or claimer avatars.
        const showSeatClaim = claimed && !paintClaimedAsTrack && !sharedBt;
        const seat = showSeatClaim ? (seatByPlayerId[route.ownerId!] ?? 0) % 6 : null;
        const claimable = claimableRouteIds?.has(route.id) ?? false;
        // Claimed routes stay selectable so the panel can name their owner.
        const interactive = onRouteSelect != null;
        const marks = [
          route.def.tunnel ? 'อุโมงค์' : null,
          route.def.ferryLocomotives ? `🚂×${route.def.ferryLocomotives}` : null,
          sharedBt ? 'Bullet Train (ใช้ร่วม)' : null,
        ].filter(Boolean);
        const label = [
          `${ttrCityName(map, route.def.a)} – ${ttrCityName(map, route.def.b)} · ${route.def.length}`,
          ...marks,
        ].join(' · ');
        const title =
          route.ownerId != null
            ? sharedBt
              ? `${label} · สร้างโดย ${playerNameById[route.ownerId] ?? route.ownerId}`
              : `${label} · ${playerNameById[route.ownerId] ?? route.ownerId}`
            : label;
        const trackPaintClass =
          claimed && sharedBt
            ? 'ttr-track-paint--bullet'
            : claimed && paintClaimedAsTrack
              ? route.def.ferryLocomotives
                ? 'ttr-track-paint--ferry'
                : route.def.tunnel
                  ? 'ttr-track-paint--tunnel'
                  : `ttr-track-paint--${route.def.color}`
              : null;

        return slots.map((slot, index) => {
          const classes = cn(
            'ttr-slot',
            `ttr-slot--${route.def.color}`,
            seat != null && `ttr-owner-seat-${seat}`,
            trackPaintClass,
            claimed && 'is-claimed',
            claimable && 'is-claimable',
            claimable && route.def.ferryLocomotives != null && 'is-ferry',
            route.def.tunnel && 'is-tunnel',
            (sharedBt || (route.def.bulletTrain && !claimed)) && 'is-bullet-train',
            selectedRouteId === route.id && 'is-selected',
            showSlotOutlines && 'is-outlined',
          );
          const key = `${route.id}-${index}`;
          const ownerId = route.ownerId;
          const avatar: ReactNode =
            showSeatClaim && ownerId != null ? (
              <span
                className="ttr-slot__avatar-wrap"
                style={{ transform: `translate(-50%, -50%) rotate(${-slot.angleDeg}deg)` }}
                aria-hidden
              >
                <PlayerAvatar
                  playerId={ownerId}
                  name={playerNameById[ownerId] ?? ownerId}
                  size={20}
                  decorative
                  className="ttr-slot__avatar"
                />
              </span>
            ) : null;
          if (!interactive) {
            return (
              <div key={key} className={classes} style={slotStyle(slot)} title={title}>
                {avatar}
              </div>
            );
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
            >
              {avatar}
            </button>
          );
        });
      })}

      {map.cities.flatMap((city) => {
        const markers = geometry.cityMarkersById[city.id] ?? [];
        const highlighted = highlightedCityIds?.has(city.id) ?? false;
        const stationEligible = stationMode && (stationEligibleCityIds?.has(city.id) ?? false);
        const stationTarget = selectedStationCityId === city.id;
        if (!showCityDots && !highlighted && !stationEligible && !stationTarget) return [];
        return markers.map((point, markerIndex) => {
          const selected =
            selectedCityId === city.id &&
            (selectedCityMarkerIndex == null
              ? markerIndex === 0
              : selectedCityMarkerIndex === markerIndex);
          const classes = cn(
            'ttr-city',
            highlighted && 'is-highlight',
            stationEligible && 'is-station-eligible',
            stationTarget && 'is-station-target',
            selected && 'is-selected',
            onCityMove && 'is-draggable',
          );
          const style = pointStyle(point, citySize);
          const multi = markers.length > 1;
          const label = stationEligible
            ? `สร้างสถานีที่ ${city.name}`
            : multi
              ? `${city.name} (${markerIndex})`
              : city.name;
          const interactive = onCityMove != null || onCitySelect != null || stationEligible;
          const key = `${city.id}#${markerIndex}`;
          if (!interactive) {
            return <div key={key} className={classes} style={style} title={label} />;
          }
          return (
            <button
              key={key}
              type="button"
              className={classes}
              style={style}
              title={label}
              aria-label={label}
              onClick={() => {
                if (stationEligible) {
                  onStationCitySelect?.(city.id);
                  return;
                }
                onCitySelect?.(city.id, markerIndex);
              }}
              {...(onCityMove
                ? dragHandlers((next) => {
                    onCitySelect?.(city.id, markerIndex);
                    onCityMove(city.id, next, markerIndex);
                  })
                : {})}
            />
          );
        });
      })}

      {stationsByCity
        ? Object.entries(stationsByCity).map(([cityId, ownerId]) => {
            const point = geometry.cityPoints[cityId];
            if (!point) return null;
            const seat = (seatByPlayerId[ownerId] ?? 0) % 6;
            const ownerName = playerNameById[ownerId] ?? ownerId;
            const cityName = ttrCityName(map, cityId);
            return (
              <div
                key={`station-${cityId}`}
                className={cn('ttr-station', `ttr-owner-seat-${seat}`)}
                style={pointStyle(point, citySize * 1.25)}
                title={`สถานีของ ${ownerName} · ${cityName}`}
                aria-label={`สถานีของ ${ownerName} ที่ ${cityName}`}
                role="img"
              >
                <span className="ttr-station__avatar-wrap" aria-hidden>
                  <PlayerAvatar
                    playerId={ownerId}
                    name={ownerName}
                    size={18}
                    decorative
                    className="ttr-station__avatar"
                  />
                </span>
              </div>
            );
          })
        : null}

      {waypointRouteId && onWaypointMove
        ? waypoints.map((point, index) => (
            <button
              key={`${waypointRouteId}-wp-${index}`}
              type="button"
              className="ttr-waypoint"
              style={pointStyle(point, citySize * 0.8)}
              aria-label={`bend ${index + 1}`}
              {...dragHandlers((next) => onWaypointMove(waypointRouteId, index, next))}
            />
          ))
        : null}
    </div>
  );
}
