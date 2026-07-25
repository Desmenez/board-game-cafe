import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SkyTeamApproachSpaceState, SkyTeamPlayerView } from 'shared';
import { ALTITUDE_TRACK } from 'shared';
import { cn } from '../../../utils/cn';
import { approachCardOverlays } from '../approachMarks';
import { AIRPLANE_TOKEN_ADD_MS, AIRPLANE_TOKEN_REMOVE_MS } from './AirplaneToken';
import { ApproachCard } from './ApproachCard';
import { AltitudeCard } from './AltitudeCard';

/** Drawer slide-in (matches SkyTeamTrackDrawer EXIT/enter ~280ms). */
const DRAWER_OPEN_MS = 300;
/** Smooth scroll current → Radio / Traffic target. */
const SCROLL_MS = 1100;
/** Pause after scroll lands, before remove/add anim. */
const PRE_TOKEN_DELAY_MS = 500;
/** AirplaneToken ghost duration. */
const REMOVE_ANIM_MS = AIRPLANE_TOKEN_REMOVE_MS;
const ADD_ANIM_MS = AIRPLANE_TOKEN_ADD_MS;
/** Pause after token anim, before next step / close. */
const POST_TOKEN_DELAY_MS = 500;

type ApproachProps = {
  approach: SkyTeamApproachSpaceState[];
  /** Current plane space — omit in lobby preview (no highlight). */
  approachPosition?: number;
  /** Full-height scroll strip for side drawer. */
  variant?: 'default' | 'drawer';
  /** When true (manual open), scroll current space into view. */
  scrollCurrentIntoView?: boolean;
  /** Radio clear target index. */
  focusIndex?: number | null;
  /** Bumps on each Radio clear so the reveal sequence re-runs. */
  radioRevealNonce?: number;
  /** Fired after remove anim + post delay — close the drawer. */
  onRadioRevealComplete?: () => void;
  /** Traffic Die placement targets (nearest-first). */
  trafficTargets?: number[];
  /** Plane counts before Traffic Die placements this round. */
  trafficPlanesBefore?: number[] | null;
  /** Bumps on each Traffic Die reveal sequence. */
  trafficRevealNonce?: number;
  /** Fired after all Traffic adds finish. */
  onTrafficRevealComplete?: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function centerCardInStrip(strip: HTMLElement, el: HTMLElement): void {
  const stripRect = strip.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  if (stripRect.height < 8) return;
  const delta = elRect.top + elRect.height / 2 - (stripRect.top + stripRect.height / 2);
  strip.scrollTop += delta;
}

function smoothCenterCardInStrip(
  strip: HTMLElement,
  el: HTMLElement,
  durationMs: number,
): Promise<void> {
  const stripRect = strip.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  if (stripRect.height < 8) return Promise.resolve();
  const delta = elRect.top + elRect.height / 2 - (stripRect.top + stripRect.height / 2);
  if (Math.abs(delta) < 2) return Promise.resolve();

  const start = strip.scrollTop;
  const end = start + delta;
  const startAt = performance.now();

  return new Promise((resolve) => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      strip.scrollTop = start + (end - start) * eased;
      if (t < 1) {
        window.requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    window.requestAnimationFrame(tick);
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Approach strip only — airport at top → start at bottom. */
export function SkyTeamApproachTrackPanel({
  approach,
  approachPosition,
  variant = 'default',
  scrollCurrentIntoView = false,
  focusIndex = null,
  radioRevealNonce = 0,
  onRadioRevealComplete,
  trafficTargets = [],
  trafficPlanesBefore = null,
  trafficRevealNonce = 0,
  onTrafficRevealComplete,
}: ApproachProps) {
  const topFirst = [...approach].reverse();
  const stripRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [trafficFocusIndex, setTrafficFocusIndex] = useState<number | null>(null);
  /** Hold pre-Radio plane count so the token stays until the dissolve finishes. */
  const [heldPlanes, setHeldPlanes] = useState<{ index: number; count: number } | null>(null);
  /** Traffic Die: animated plane counts (start from planesBefore, +1 per add). */
  const [trafficDisplay, setTrafficDisplay] = useState<number[] | null>(null);
  const [scrollReady, setScrollReady] = useState(variant !== 'drawer');
  const onRadioCompleteRef = useRef(onRadioRevealComplete);
  onRadioCompleteRef.current = onRadioRevealComplete;
  const onTrafficCompleteRef = useRef(onTrafficRevealComplete);
  onTrafficCompleteRef.current = onTrafficRevealComplete;
  const approachRef = useRef(approach);
  approachRef.current = approach;

  useEffect(() => {
    if (!scrollCurrentIntoView) {
      setScrollReady(variant !== 'drawer');
    }
  }, [scrollCurrentIntoView, variant]);

  // Jump to current position before paint — avoid flashing the airport (top of strip).
  useLayoutEffect(() => {
    if (!scrollCurrentIntoView || approachPosition == null) {
      if (scrollCurrentIntoView) setScrollReady(true);
      return;
    }
    const strip = stripRef.current;
    if (!strip) {
      setScrollReady(true);
      return;
    }
    const el = cardRefs.current.get(approachPosition);
    if (el) centerCardInStrip(strip, el);
    setScrollReady(true);
  }, [
    scrollCurrentIntoView,
    approachPosition,
    approach.length,
    radioRevealNonce,
    trafficRevealNonce,
  ]);

  // Radio: drawer opens already on current → smooth scroll to target → remove → close.
  useEffect(() => {
    if (radioRevealNonce <= 0 || focusIndex == null) return;
    const strip = stripRef.current;
    if (!strip) return;

    let cancelled = false;
    const reduced = prefersReducedMotion();

    const postPlanes = approachRef.current.find((s) => s.index === focusIndex)?.planes ?? 0;
    setHeldPlanes({ index: focusIndex, count: postPlanes + 1 });

    const run = async () => {
      await wait(reduced ? 0 : DRAWER_OPEN_MS);
      if (cancelled) return;

      const fromIndex = approachPosition ?? focusIndex;
      const fromEl = cardRefs.current.get(fromIndex);
      const toEl = cardRefs.current.get(focusIndex);
      if (fromEl) centerCardInStrip(strip, fromEl);

      if (!reduced && toEl && fromIndex !== focusIndex) {
        await wait(40);
        if (cancelled) return;
        await smoothCenterCardInStrip(strip, toEl, SCROLL_MS);
      } else if (toEl) {
        centerCardInStrip(strip, toEl);
      }
      if (cancelled) return;

      await wait(reduced ? 0 : PRE_TOKEN_DELAY_MS);
      if (cancelled) return;

      setRemovingIndex(focusIndex);
      await wait(reduced ? 0 : REMOVE_ANIM_MS);
      if (cancelled) return;

      setRemovingIndex(null);
      setHeldPlanes(null);

      await wait(reduced ? 0 : POST_TOKEN_DELAY_MS);
      if (cancelled) return;
      onRadioCompleteRef.current?.();
    };

    void run();
    return () => {
      cancelled = true;
      setRemovingIndex(null);
      setHeldPlanes(null);
    };
  }, [radioRevealNonce, focusIndex, approachPosition]);

  // Traffic Die: scroll nearest → add → next target → close.
  useEffect(() => {
    if (trafficRevealNonce <= 0 || trafficTargets.length === 0) return;
    const strip = stripRef.current;
    if (!strip) return;

    let cancelled = false;
    const reduced = prefersReducedMotion();
    const baseline = trafficPlanesBefore ?? approachRef.current.map((s) => s.planes);
    setTrafficDisplay([...baseline]);

    const run = async () => {
      await wait(reduced ? 0 : DRAWER_OPEN_MS);
      if (cancelled) return;

      const fromIndex = approachPosition ?? trafficTargets[0]!;
      const fromEl = cardRefs.current.get(fromIndex);
      if (fromEl) centerCardInStrip(strip, fromEl);

      for (const target of trafficTargets) {
        if (cancelled) return;
        setTrafficFocusIndex(target);
        const toEl = cardRefs.current.get(target);
        if (!reduced && toEl && fromIndex !== target) {
          await wait(40);
          if (cancelled) return;
          await smoothCenterCardInStrip(strip, toEl, SCROLL_MS);
        } else if (toEl) {
          centerCardInStrip(strip, toEl);
        }
        if (cancelled) return;

        await wait(reduced ? 0 : PRE_TOKEN_DELAY_MS);
        if (cancelled) return;

        setTrafficDisplay((prev) => {
          const next = [...(prev ?? baseline)];
          next[target] = (next[target] ?? 0) + 1;
          return next;
        });
        setAddingIndex(target);
        await wait(reduced ? 0 : ADD_ANIM_MS);
        if (cancelled) return;
        setAddingIndex(null);

        await wait(reduced ? 0 : POST_TOKEN_DELAY_MS);
      }

      if (cancelled) return;
      setTrafficFocusIndex(null);
      setTrafficDisplay(null);
      onTrafficCompleteRef.current?.();
    };

    void run();
    return () => {
      cancelled = true;
      setAddingIndex(null);
      setTrafficFocusIndex(null);
      setTrafficDisplay(null);
    };
  }, [trafficRevealNonce, trafficTargets.join(','), trafficPlanesBefore, approachPosition]);

  return (
    <div
      ref={stripRef}
      className={cn(
        'st-track-strip',
        variant === 'drawer' && 'st-track-strip--drawer',
        variant === 'drawer' && !scrollReady && 'st-track-strip--pending',
      )}
    >
      {topFirst.map((space) => {
        const here = approachPosition != null && space.index === approachPosition;
        const radioFocus = focusIndex != null && space.index === focusIndex;
        const trafficFocus = trafficFocusIndex === space.index;
        const overlays = approachCardOverlays(space);
        const displayPlanes =
          trafficDisplay != null
            ? (trafficDisplay[space.index] ?? space.planes)
            : heldPlanes?.index === space.index
              ? heldPlanes.count
              : space.planes;
        const axisHint =
          space.allowedAxisPositions && space.allowedAxisPositions.length > 0
            ? `Axis ${space.allowedAxisPositions.join('/')}`
            : undefined;
        const trafficHint =
          displayPlanes > 0 ? `Airplane ×${displayPlanes}` : 'ไม่มี airplane token';
        const labelParts = [
          here ? 'คุณอยู่ที่นี่' : null,
          radioFocus ? 'Radio' : null,
          trafficFocus ? 'Traffic' : null,
          trafficHint,
          axisHint,
        ].filter(Boolean);

        return (
          <div
            key={space.index}
            ref={(node) => {
              if (node) cardRefs.current.set(space.index, node);
              else cardRefs.current.delete(space.index);
            }}
            data-st-track-here={here ? '' : undefined}
            className={cn(
              'w-full shrink-0 overflow-hidden rounded-lg',
              here && !radioFocus && !trafficFocus && 'st-track-here',
              (radioFocus || trafficFocus) && 'st-board-cue',
            )}
          >
            <ApproachCard
              base={space.base}
              printedPlanes={space.printedPlanes}
              planes={displayPlanes}
              playRemove={removingIndex === space.index}
              playAdd={addingIndex === space.index}
              topMarks={overlays.topMarks}
              dieWell={overlays.dieWell}
              strip
              label={labelParts.join(' · ')}
            />
          </div>
        );
      })}
    </div>
  );
}

type AltitudeProps = {
  view: SkyTeamPlayerView;
  variant?: 'default' | 'drawer';
  scrollCurrentIntoView?: boolean;
};

/** Altitude strip only — landing at top → 6000 at bottom. */
export function SkyTeamAltitudeTrackPanel({
  view,
  variant = 'default',
  scrollCurrentIntoView = false,
}: AltitudeProps) {
  const topFirst = [...ALTITUDE_TRACK].reverse();
  const stripRef = useRef<HTMLDivElement>(null);
  const hereRef = useRef<HTMLDivElement>(null);
  const [scrollReady, setScrollReady] = useState(variant !== 'drawer');

  useLayoutEffect(() => {
    if (!scrollCurrentIntoView) {
      setScrollReady(true);
      return;
    }
    const strip = stripRef.current;
    if (!strip) {
      setScrollReady(true);
      return;
    }
    const el = hereRef.current;
    if (el) centerCardInStrip(strip, el);
    setScrollReady(true);
  }, [scrollCurrentIntoView, view.altitudeIndex]);

  return (
    <div
      ref={stripRef}
      className={cn(
        'st-track-strip',
        variant === 'drawer' && 'st-track-strip--drawer',
        variant === 'drawer' && !scrollReady && 'st-track-strip--pending',
      )}
    >
      {topFirst.map((step) => {
        const trackIndex = ALTITUDE_TRACK.findIndex((s) => s.feet === step.feet);
        const here = trackIndex === view.altitudeIndex;
        return (
          <div
            key={step.feet}
            ref={here ? hereRef : undefined}
            data-st-track-here={here ? '' : undefined}
            className={cn(
              'w-full shrink-0 overflow-hidden rounded-lg',
              here && 'st-track-here',
            )}
          >
            <AltitudeCard
              feet={step.feet}
              isAirplane={step.isAirplane}
              firstPlayer={step.firstPlayer}
              strip
            />
          </div>
        );
      })}
    </div>
  );
}
