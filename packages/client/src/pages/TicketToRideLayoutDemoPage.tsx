import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TtrMapId, TtrRouteView } from 'shared';
import { getTtrMap, ttrCityName } from 'shared';
import { Button, Slider } from '../components/ui';
import { TicketToRideBoard } from '../games/ticket-to-ride/components/TicketToRideBoard';
import type { TtrBoardLayout, TtrPoint } from '../games/ticket-to-ride/boardGeometry';
import {
  cityMarkers,
  primaryCityPoint,
  resolveRouteEndpoints,
} from '../games/ticket-to-ride/boardGeometry';
import { ttrMapPresentation } from '../games/ticket-to-ride/maps';

function citySelectValue(cityId: string, markerIndex: number): string {
  return `${cityId}#${markerIndex}`;
}

function parseCitySelectValue(value: string): { cityId: string; markerIndex: number } | null {
  if (!value) return null;
  const hash = value.lastIndexOf('#');
  if (hash <= 0) return { cityId: value, markerIndex: 0 };
  const cityId = value.slice(0, hash);
  const markerIndex = Number(value.slice(hash + 1));
  if (!cityId || !Number.isFinite(markerIndex)) return null;
  return { cityId, markerIndex };
}

const MAP_IDS: readonly TtrMapId[] = ['united-states', 'europe', 'india', 'japan'];

const TRAIN_PREVIEW_PLAYERS = [
  { id: 'p0', name: 'Red', seat: 0 },
  { id: 'p1', name: 'Blue', seat: 1 },
  { id: 'p2', name: 'Green', seat: 2 },
  { id: 'p3', name: 'Yellow', seat: 3 },
  { id: 'p4', name: 'Purple', seat: 4 },
] as const;

/** Sentinel owner for “paint by track colour” QA fills. */
const TRACK_QA_OWNER = '__track_qa__';

const DEMO_SEATS: Record<string, number> = Object.fromEntries(
  TRAIN_PREVIEW_PLAYERS.map((player) => [player.id, player.seat]),
);
const DEMO_NAMES: Record<string, string> = {
  ...Object.fromEntries(TRAIN_PREVIEW_PLAYERS.map((player) => [player.id, player.name])),
  [TRACK_QA_OWNER]: 'Track colour',
};

const SLOT_KNOBS = [
  { id: 'length', label: 'Car length %', min: 0.5, max: 8 },
  { id: 'width', label: 'Car width %', min: 0.3, max: 4 },
  { id: 'gap', label: 'Car gap %', min: 0, max: 3 },
  { id: 'endPad', label: 'City padding %', min: 0, max: 6 },
] as const;

type SlotKnob = (typeof SLOT_KNOBS)[number]['id'];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function TicketToRideLayoutDemoPage() {
  const [mapId, setMapId] = useState<TtrMapId>('united-states');
  const map = useMemo(() => getTtrMap(mapId), [mapId]);
  const presentation = useMemo(() => ttrMapPresentation(mapId), [mapId]);
  const [layout, setLayout] = useState<TtrBoardLayout>(() =>
    structuredClone(ttrMapPresentation('united-states').layout),
  );
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedCityMarkerIndex, setSelectedCityMarkerIndex] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeQuery, setRouteQuery] = useState('');
  const [zoom, setZoom] = useState(100);
  const [showOutlines, setShowOutlines] = useState(true);
  const [showCityDots, setShowCityDots] = useState(true);
  const [trainPreviewMode, setTrainPreviewMode] = useState(false);
  const [trainPreviewPlayerId, setTrainPreviewPlayerId] = useState('p0');
  const [trainOwners, setTrainOwners] = useState<Record<string, string>>({});
  const [paintClaimedAsTrack, setPaintClaimedAsTrack] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const routes: TtrRouteView[] = useMemo(
    () =>
      map.routes.map((def) => ({
        id: def.id,
        ownerId: trainOwners[def.id] ?? null,
        def,
      })),
    [map, trainOwners],
  );

  const routeMatches = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    const labelled = map.routes.map((def) => ({
      def,
      label: `${ttrCityName(map, def.a)} – ${ttrCityName(map, def.b)}`,
    }));
    if (!q) return labelled.slice(0, 24);
    return labelled
      .filter((r) => r.label.toLowerCase().includes(q) || r.def.id.includes(q))
      .slice(0, 24);
  }, [map, routeQuery]);

  const selectedRoute = selectedRouteId
    ? (map.routes.find((r) => r.id === selectedRouteId) ?? null)
    : null;

  const selectMap = useCallback((nextMapId: TtrMapId) => {
    setMapId(nextMapId);
    setLayout(structuredClone(ttrMapPresentation(nextMapId).layout));
    setSelectedCityId(null);
    setSelectedCityMarkerIndex(0);
    setSelectedRouteId(null);
    setTrainOwners({});
    setPaintClaimedAsTrack(false);
    setRouteQuery('');
  }, []);
  const selectedRouteLayout = selectedRouteId ? layout.routes[selectedRouteId] : undefined;

  const selectCityMarker = useCallback((cityId: string, markerIndex = 0) => {
    setSelectedCityId(cityId);
    setSelectedCityMarkerIndex(markerIndex);
  }, []);

  const moveCity = useCallback((cityId: string, point: TtrPoint, markerIndex = 0) => {
    setLayout((prev) => {
      const markers = [...cityMarkers(prev, cityId)];
      const idx = Math.max(0, Math.min(markerIndex, markers.length - 1));
      markers[idx] = point;
      const next: TtrPoint | TtrPoint[] = markers.length === 1 ? markers[0]! : markers;
      return { ...prev, cities: { ...prev.cities, [cityId]: next } };
    });
  }, []);

  const nudgeCity = useCallback((cityId: string, markerIndex: number, dx: number, dy: number) => {
    setLayout((prev) => {
      const markers = [...cityMarkers(prev, cityId)];
      const idx = Math.max(0, Math.min(markerIndex, markers.length - 1));
      const cur = markers[idx];
      if (!cur) return prev;
      markers[idx] = { left: round(cur.left + dx), top: round(cur.top + dy) };
      const next: TtrPoint | TtrPoint[] = markers.length === 1 ? markers[0]! : markers;
      return { ...prev, cities: { ...prev.cities, [cityId]: next } };
    });
  }, []);

  const patchRoute = useCallback(
    (routeId: string, patch: Partial<TtrBoardLayout['routes'][string]>) => {
      setLayout((prev) => {
        const next = { ...(prev.routes[routeId] ?? {}), ...patch };
        for (const key of Object.keys(next) as (keyof typeof next)[]) {
          if (next[key] === undefined) delete next[key];
        }
        const routesNext = { ...prev.routes };
        if (Object.keys(next).length === 0) delete routesNext[routeId];
        else routesNext[routeId] = next;
        return { ...prev, routes: routesNext };
      });
    },
    [],
  );

  const moveWaypoint = useCallback((routeId: string, index: number, point: TtrPoint) => {
    setLayout((prev) => {
      const waypoints = [...(prev.routes[routeId]?.waypoints ?? [])];
      if (index >= waypoints.length) return prev;
      waypoints[index] = point;
      return {
        ...prev,
        routes: { ...prev.routes, [routeId]: { ...prev.routes[routeId], waypoints } },
      };
    });
  }, []);

  const addWaypoint = useCallback(() => {
    if (!selectedRoute) return;
    const ends = resolveRouteEndpoints(layout, selectedRoute);
    const existing = layout.routes[selectedRoute.id]?.waypoints ?? [];
    const mid: TtrPoint = {
      left: round((ends.a.left + ends.b.left) / 2),
      top: round((ends.a.top + ends.b.top) / 2),
    };
    patchRoute(selectedRoute.id, { waypoints: [...existing, mid] });
  }, [layout, patchRoute, selectedRoute]);

  const removeWaypoint = useCallback(
    (index: number) => {
      if (!selectedRoute) return;
      const existing = layout.routes[selectedRoute.id]?.waypoints ?? [];
      const next = existing.filter((_, i) => i !== index);
      patchRoute(selectedRoute.id, { waypoints: next.length > 0 ? next : undefined });
    },
    [layout.routes, patchRoute, selectedRoute],
  );

  const copy = useCallback(async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  }, []);

  useEffect(() => {
    if (!selectedCityId) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const step = event.shiftKey ? 0.5 : 0.1;
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = delta[event.key];
      if (!move) return;
      event.preventDefault();
      nudgeCity(selectedCityId, selectedCityMarkerIndex, move[0], move[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudgeCity, selectedCityId, selectedCityMarkerIndex]);

  const selectedCity =
    selectedCityId != null
      ? (cityMarkers(layout, selectedCityId)[selectedCityMarkerIndex] ??
        primaryCityPoint(layout, selectedCityId))
      : undefined;

  const citySelectOptions = useMemo(
    () =>
      map.cities.flatMap((c) => {
        const markers = cityMarkers(layout, c.id);
        return markers.map((_, markerIndex) => ({
          value: citySelectValue(c.id, markerIndex),
          label: markers.length > 1 ? `${c.name} (${markerIndex})` : c.name,
        }));
      }),
    [layout, map.cities],
  );
  const selectedTrainOwnerId = selectedRouteId ? trainOwners[selectedRouteId] : undefined;

  const selectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    if (!trainPreviewMode) return;
    setPaintClaimedAsTrack(false);
    setTrainOwners((prev) => ({ ...prev, [routeId]: trainPreviewPlayerId }));
  };

  const removeTrainPreview = (routeId: string) => {
    setTrainOwners((prev) => {
      const next = { ...prev };
      delete next[routeId];
      return next;
    });
  };

  const placeAllByTrackColor = () => {
    setPaintClaimedAsTrack(true);
    setTrainOwners(Object.fromEntries(map.routes.map((route) => [route.id, TRACK_QA_OWNER])));
  };

  return (
    <div className="page app-night-page ttr-layout-lab min-h-dvh p-4 md:p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs opacity-60">
              <Link to="/" className="underline">
                Home
              </Link>{' '}
              · /dev/ticket-to-ride-layout ·{' '}
              <Link to="/dev/ticket-to-ride-destination-card" className="underline">
                Destination card lab
              </Link>
            </p>
            <h1 className="text-xl font-bold">Ticket to Ride layout lab — {map.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input"
              aria-label="Map"
              value={mapId}
              onChange={(e) => selectMap(e.target.value as TtrMapId)}
            >
              {MAP_IDS.map((id) => (
                <option key={id} value={id}>
                  {getTtrMap(id).name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={() => copy('layout', JSON.stringify(layout, null, 2))}
            >
              {copied === 'layout' ? 'Copied!' : 'Copy layout JSON'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copy('cities', JSON.stringify(layout.cities, null, 2))}
            >
              {copied === 'cities' ? 'Copied!' : 'Copy cities'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setLayout(structuredClone(presentation.layout))}
            >
              Reset
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
          <div className="card overflow-auto p-2 sticky top-0">
            <div style={{ width: `${zoom}%`, minWidth: '100%' }}>
              <TicketToRideBoard
                map={map}
                image={presentation.image}
                layout={layout}
                routes={routes}
                seatByPlayerId={DEMO_SEATS}
                playerNameById={DEMO_NAMES}
                selectedRouteId={selectedRouteId}
                onRouteSelect={selectRoute}
                showSlotOutlines={showOutlines}
                showCityDots={showCityDots}
                selectedCityId={selectedCityId}
                selectedCityMarkerIndex={selectedCityMarkerIndex}
                onCitySelect={selectCityMarker}
                onCityMove={moveCity}
                waypointRouteId={selectedRouteId}
                onWaypointMove={moveWaypoint}
                paintClaimedAsTrack={paintClaimedAsTrack}
              />
            </div>
          </div>

          <aside className="card space-y-4 p-3 text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold">Route</h2>
              <p className="text-xs opacity-60">
                Click a track on the board or search here. Bends let a track follow curved art.
              </p>
              <input
                className="input w-full"
                placeholder="search route…"
                value={routeQuery}
                onChange={(e) => setRouteQuery(e.target.value)}
              />
              <div className="max-h-40 space-y-1 overflow-auto">
                {routeMatches.map(({ def, label }) => (
                  <button
                    key={def.id}
                    type="button"
                    className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${
                      selectedRouteId === def.id ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedRouteId(def.id)}
                  >
                    {label} · {def.length} {def.color}
                  </button>
                ))}
              </div>

              {selectedRoute ? (
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <p className="text-xs font-semibold">
                    {ttrCityName(map, selectedRoute.a)} – {ttrCityName(map, selectedRoute.b)}{' '}
                    <span className="opacity-60">({selectedRoute.id})</span>
                  </p>
                  <Slider
                    label="Offset %"
                    valueLabel={`${selectedRouteLayout?.offset ?? 'auto'}`}
                    min={-6}
                    max={6}
                    step={0.05}
                    value={selectedRouteLayout?.offset ?? 0}
                    onChange={(e) =>
                      patchRoute(selectedRoute.id, { offset: Number(e.target.value) })
                    }
                  />
                  <Slider
                    label="Car length override %"
                    valueLabel={`${selectedRouteLayout?.slotLength ?? 'auto'}`}
                    min={0.5}
                    max={8}
                    step={0.05}
                    value={selectedRouteLayout?.slotLength ?? layout.slot.length}
                    onChange={(e) =>
                      patchRoute(selectedRoute.id, { slotLength: Number(e.target.value) })
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="xs" onClick={addWaypoint}>
                      Add bend
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        patchRoute(selectedRoute.id, {
                          offset: undefined,
                          slotLength: undefined,
                          slotWidth: undefined,
                        })
                      }
                    >
                      Clear overrides
                    </Button>
                  </div>
                  {(selectedRouteLayout?.waypoints ?? []).map((wp, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="opacity-70">bend {i + 1}</span>
                      <span className="tabular-nums opacity-60">
                        {wp.left}, {wp.top}
                      </span>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => removeWaypoint(i)}
                      >
                        remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold">View</h2>
              <Slider
                label="Zoom"
                valueLabel={`${zoom}%`}
                min={100}
                max={400}
                step={10}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showOutlines}
                    onChange={(e) => setShowOutlines(e.target.checked)}
                  />
                  Car outlines
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showCityDots}
                    onChange={(e) => setShowCityDots(e.target.checked)}
                  />
                  City dots
                </label>
              </div>
            </section>

            <section className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Train preview</h2>
                <span className="text-xs opacity-60">
                  {Object.keys(trainOwners).length} claimed
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={trainPreviewMode}
                  onChange={(e) => setTrainPreviewMode(e.target.checked)}
                />
                Click routes to place trains
              </label>
              <div className="flex flex-wrap gap-1">
                {TRAIN_PREVIEW_PLAYERS.map((player) => (
                  <Button
                    key={player.id}
                    type="button"
                    size="xs"
                    variant={trainPreviewPlayerId === player.id ? 'primary' : 'ghost'}
                    onClick={() => {
                      setPaintClaimedAsTrack(false);
                      setTrainPreviewPlayerId(player.id);
                    }}
                  >
                    <span
                      className={`ttr-player-swatch ttr-owner-seat-${player.seat}`}
                      aria-hidden
                    />
                    {player.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs opacity-60">
                เปิดโหมดแล้วคลิกเส้นทางเพื่อวางโบกี้สีผู้เล่น · หรือใช้ปุ่มด้านล่างทาสีตาม track
                เพื่อ QA สีเส้นทาง (เฟอร์รี = ฟ้าลายทแยง, อุโมงค์ = น้ำตาลเส้นประ)
              </p>
              {selectedRouteId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => {
                      setPaintClaimedAsTrack(false);
                      setTrainOwners((prev) => ({
                        ...prev,
                        [selectedRouteId]: trainPreviewPlayerId,
                      }));
                    }}
                  >
                    Place on selected
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    disabled={!selectedTrainOwnerId}
                    onClick={() => removeTrainPreview(selectedRouteId)}
                  >
                    Remove selected
                  </Button>
                  {selectedTrainOwnerId ? (
                    <span className="text-xs opacity-70">
                      Owner: {DEMO_NAMES[selectedTrainOwnerId] ?? selectedTrainOwnerId}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="xs" variant="secondary" onClick={placeAllByTrackColor}>
                  Paint all by track color
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={Object.keys(trainOwners).length === 0}
                  onClick={() => {
                    setTrainOwners({});
                    setPaintClaimedAsTrack(false);
                  }}
                >
                  Clear all trains
                </Button>
              </div>
              {paintClaimedAsTrack ? (
                <p className="text-xs opacity-70">
                  QA paint on · สีตาม track · เฟอร์รี cyan hatch · อุโมงค์ brown dashed ·
                  Bullet Train steel chevron (≠ gray)
                </p>
              ) : null}
            </section>

            <section className="space-y-2 border-t border-white/10 pt-3">
              <h2 className="font-semibold">Cities</h2>
              <p className="text-xs opacity-60">
                Drag a dot on the board, or select one and nudge with arrow keys (Shift = 0.5%).
              </p>
              <select
                className="input w-full"
                value={
                  selectedCityId != null
                    ? citySelectValue(selectedCityId, selectedCityMarkerIndex)
                    : ''
                }
                onChange={(e) => {
                  const parsed = parseCitySelectValue(e.target.value);
                  if (!parsed) {
                    setSelectedCityId(null);
                    setSelectedCityMarkerIndex(0);
                    return;
                  }
                  selectCityMarker(parsed.cityId, parsed.markerIndex);
                }}
              >
                <option value="">— select city —</option>
                {citySelectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {selectedCityId && selectedCity ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex items-center gap-1">
                    left
                    <input
                      type="number"
                      step={0.1}
                      className="input w-20"
                      value={selectedCity.left}
                      onChange={(e) =>
                        moveCity(
                          selectedCityId,
                          {
                            ...selectedCity,
                            left: Number(e.target.value),
                          },
                          selectedCityMarkerIndex,
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    top
                    <input
                      type="number"
                      step={0.1}
                      className="input w-20"
                      value={selectedCity.top}
                      onChange={(e) =>
                        moveCity(
                          selectedCityId,
                          { ...selectedCity, top: Number(e.target.value) },
                          selectedCityMarkerIndex,
                        )
                      }
                    />
                  </label>
                </div>
              ) : null}
              <Slider
                label="City dot size"
                valueLabel={`${layout.citySize}%`}
                min={0.4}
                max={5}
                step={0.1}
                value={layout.citySize}
                onChange={(e) =>
                  setLayout((prev) => ({ ...prev, citySize: Number(e.target.value) }))
                }
              />
              <Slider
                label="Overlay scale"
                valueLabel={`×${layout.overlayScale ?? 1}`}
                min={1}
                max={3}
                step={0.05}
                value={layout.overlayScale ?? 1}
                onChange={(e) =>
                  setLayout((prev) => ({
                    ...prev,
                    overlayScale: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs opacity-60">
                Portrait maps (India) bump this so cars / cities stay readable when height-fitted.
                Landscape maps leave it at 1.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold">Car cells</h2>
              {SLOT_KNOBS.map((knob) => (
                <Slider
                  key={knob.id}
                  label={knob.label}
                  valueLabel={`${layout.slot[knob.id as SlotKnob]}%`}
                  min={knob.min}
                  max={knob.max}
                  step={0.05}
                  value={layout.slot[knob.id as SlotKnob]}
                  onChange={(e) =>
                    setLayout((prev) => ({
                      ...prev,
                      slot: { ...prev.slot, [knob.id]: Number(e.target.value) },
                    }))
                  }
                />
              ))}
              <Slider
                label="Parallel spacing %"
                valueLabel={`${layout.parallelSpacing}%`}
                min={0}
                max={6}
                step={0.05}
                value={layout.parallelSpacing}
                onChange={(e) =>
                  setLayout((prev) => ({ ...prev, parallelSpacing: Number(e.target.value) }))
                }
              />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
