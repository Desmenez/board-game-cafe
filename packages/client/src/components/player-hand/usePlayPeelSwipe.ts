import { useCallback, useRef } from 'react';

const SWIPE_COMMIT_PX = 40;
const AXIS_LOCK_PX = 8;
/** Vertical swipe must dominate clearly — otherwise treat as horizontal hand scroll */
const VERTICAL_DOMINANCE = 1.35;

type SwipeTrack = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: 'none' | 'vertical' | 'horizontal';
};

type UsePlayPeelSwipeOptions = {
  enabled: boolean;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
};

export function usePlayPeelSwipe({ enabled, onSwipeUp, onSwipeDown }: UsePlayPeelSwipeOptions) {
  const trackRef = useRef<SwipeTrack | null>(null);

  const resetTrack = useCallback(() => {
    trackRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.pointerType === 'mouse') return;
      trackRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: 'none',
      };
      // Do not setPointerCapture — it steals touch from overflow-x scroll on the fan
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      if (!track || track.pointerId !== event.pointerId) return;

      const dx = event.clientX - track.startX;
      const dy = event.clientY - track.startY;

      if (track.axis === 'none') {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        if (Math.abs(dx) >= Math.abs(dy)) {
          resetTrack();
          return;
        }
        if (Math.abs(dy) < Math.abs(dx) * VERTICAL_DOMINANCE) {
          resetTrack();
          return;
        }
        track.axis = 'vertical';
      }

      if (track.axis === 'horizontal') {
        resetTrack();
        return;
      }

      if (track.axis === 'vertical' && event.cancelable) {
        event.preventDefault();
      }
    },
    [resetTrack],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      if (!track || track.pointerId !== event.pointerId) {
        resetTrack();
        return;
      }

      const dy = event.clientY - track.startY;
      const axis = track.axis;
      resetTrack();

      if (axis !== 'vertical') return;
      if (dy <= -SWIPE_COMMIT_PX) onSwipeUp();
      else if (dy >= SWIPE_COMMIT_PX) onSwipeDown();
    },
    [onSwipeDown, onSwipeUp, resetTrack],
  );

  const onPointerCancel = useCallback(() => {
    resetTrack();
  }, [resetTrack]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
