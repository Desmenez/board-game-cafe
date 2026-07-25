import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkyTeamPlacedDie } from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import {
  DEFAULT_KEROSENE_LAYOUT,
  markerTopForRemaining,
  type SkyTeamKeroseneLayout,
} from '../keroseneLayout';
import {
  APPROACH_BAY_PRE_PUSH_DELAY_MS,
  APPROACH_BAY_SCROLL_SETTLE_FALLBACK_MS,
  scrollElementTowardViewportCenter,
  waitForScrollSettle,
} from '../useApproachBayAnimation';
import { SkyTeamDieFace } from './SkyTeamDice';

const PRE_MARKER_DELAY_MS = APPROACH_BAY_PRE_PUSH_DELAY_MS;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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
  const rootRef = useRef<HTMLDivElement>(null);
  const [displayRemaining, setDisplayRemaining] = useState(remaining);
  const mountedRef = useRef(false);
  const markerTop = markerTopForRemaining(layout, displayRemaining);
  const isLeak = mode === 'leak';
  const canClick = !isLeak && Boolean(selectedDieId && !occupied && canPlace);

  // Scroll into view → pause → then move marker (CSS transition on top).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setDisplayRemaining(remaining);
      return;
    }
    if (remaining === displayRemaining) return;

    let cancelled = false;
    const reduced = prefersReducedMotion();

    const run = async () => {
      const el = rootRef.current;
      if (!reduced && el) {
        const moved = scrollElementTowardViewportCenter(el, 'smooth');
        if (moved.length > 0) {
          await waitForScrollSettle(moved, APPROACH_BAY_SCROLL_SETTLE_FALLBACK_MS);
        }
        if (cancelled) return;
        await wait(PRE_MARKER_DELAY_MS);
      }
      if (cancelled) return;
      setDisplayRemaining(remaining);
    };

    void run();
    return () => {
      cancelled = true;
    };
    // Only re-run when server remaining changes; displayRemaining is held until choreography ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: gate on `remaining` only
  }, [remaining]);

  return (
    <div ref={rootRef} className={cn('st-kerosene', className)} style={style}>
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
        title={`Kerosene ${displayRemaining}`}
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
