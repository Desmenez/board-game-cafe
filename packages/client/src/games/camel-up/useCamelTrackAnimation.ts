import { useEffect, useMemo, useRef, useState } from 'react';
import type { CamelUpDesertTileOnTrack, CamelUpLastRoll, CamelUpPlayerView } from 'shared';
import {
  buildCamelMovePath,
  extractMovingStack,
  isInitialLegTrack,
  trackWithoutMovingStack,
  tracksEqual,
  type CamelTrackView,
} from './camelUpTrackMove';

const STEP_MS = 340;

export type MovingStackState = {
  colors: CamelUpPlayerView['track'][number]['colors'];
  space: number;
  pathIndex: number;
  path: number[];
  finalTrack: CamelTrackView;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function rollAnimationKey(lastRoll: CamelUpLastRoll | null, track: CamelTrackView): string {
  const rollPart = lastRoll
    ? `${lastRoll.color}:${lastRoll.value}:${lastRoll.legEnded ? 1 : 0}`
    : 'none';
  return `${rollPart}|${JSON.stringify(track)}`;
}

function wouldAnimateTrack(
  prevTrack: CamelTrackView,
  track: CamelTrackView,
  lastRoll: CamelUpLastRoll | null,
  desertTiles: CamelUpDesertTileOnTrack[],
): boolean {
  if (prefersReducedMotion()) return false;
  if (isInitialLegTrack(track)) return false;
  if (!lastRoll || tracksEqual(prevTrack, track)) return false;

  const extracted = extractMovingStack(prevTrack, lastRoll.color);
  if (!extracted) return false;

  const path = buildCamelMovePath(extracted.fromSpace, lastRoll.value, desertTiles);
  return path.length > 1;
}

export function useCamelTrackAnimation(
  track: CamelTrackView,
  lastRoll: CamelUpLastRoll | null,
  desertTiles: CamelUpDesertTileOnTrack[],
): {
  displayTrack: CamelTrackView;
  movingStack: MovingStackState | null;
  isAnimating: boolean;
} {
  const [displayTrack, setDisplayTrack] = useState(track);
  const [movingStack, setMovingStack] = useState<MovingStackState | null>(null);
  const prevTrackRef = useRef(track);
  const animKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = rollAnimationKey(lastRoll, track);

    if (animKeyRef.current === key) return;

    const prevTrack = prevTrackRef.current;

    if (
      isInitialLegTrack(track) ||
      !lastRoll ||
      tracksEqual(prevTrack, track) ||
      prefersReducedMotion()
    ) {
      setMovingStack(null);
      setDisplayTrack(track);
      prevTrackRef.current = track;
      animKeyRef.current = key;
      return;
    }

    const extracted = extractMovingStack(prevTrack, lastRoll.color);
    if (!extracted) {
      setMovingStack(null);
      setDisplayTrack(track);
      prevTrackRef.current = track;
      animKeyRef.current = key;
      return;
    }

    const path = buildCamelMovePath(extracted.fromSpace, lastRoll.value, desertTiles);
    if (path.length <= 1) {
      setMovingStack(null);
      setDisplayTrack(track);
      prevTrackRef.current = track;
      animKeyRef.current = key;
      return;
    }

    animKeyRef.current = key;
    setDisplayTrack(trackWithoutMovingStack(prevTrack, extracted.fromSpace, extracted.staying));
    setMovingStack({
      colors: extracted.moving,
      space: path[0]!,
      pathIndex: 0,
      path,
      finalTrack: track,
    });
  }, [track, lastRoll, desertTiles]);

  useEffect(() => {
    if (!movingStack) return undefined;

    const { path, pathIndex, finalTrack } = movingStack;

    if (pathIndex >= path.length - 1) {
      const finalizeTimer = window.setTimeout(() => {
        setDisplayTrack(finalTrack);
        setMovingStack(null);
        prevTrackRef.current = finalTrack;
      }, STEP_MS);
      return () => window.clearTimeout(finalizeTimer);
    }

    const stepTimer = window.setTimeout(() => {
      setMovingStack((current) => {
        if (!current) return null;
        const nextIndex = current.pathIndex + 1;
        return {
          ...current,
          pathIndex: nextIndex,
          space: current.path[nextIndex]!,
        };
      });
    }, STEP_MS);

    return () => window.clearTimeout(stepTimer);
  }, [movingStack?.pathIndex, movingStack?.path, movingStack?.finalTrack]);

  const isAnimating = useMemo(
    () =>
      movingStack !== null || wouldAnimateTrack(prevTrackRef.current, track, lastRoll, desertTiles),
    [movingStack, track, lastRoll, desertTiles],
  );

  return { displayTrack, movingStack, isAnimating };
}
