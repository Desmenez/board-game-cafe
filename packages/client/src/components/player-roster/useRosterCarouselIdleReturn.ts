import { useCallback, useEffect, useRef } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';

const IDLE_RETURN_MS = 3000;

/** After the user stops browsing, scroll back to the active seat. */
export function useRosterCarouselIdleReturn(
  emblaApi: EmblaCarouselType | undefined,
  /** Resolve snap index to return to (may pick nearest duplicate). */
  resolveReturnIndex: () => number,
  preferReducedMotion: boolean,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveringRef = useRef(false);
  const pointerDownRef = useRef(false);
  const resolveRef = useRef(resolveReturnIndex);
  resolveRef.current = resolveReturnIndex;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scrollToActive = useCallback(() => {
    if (!emblaApi) return;
    const index = resolveRef.current();
    if (index < 0) return;
    emblaApi.scrollTo(index, preferReducedMotion);
  }, [emblaApi, preferReducedMotion]);

  const scheduleReturn = useCallback(() => {
    clearTimer();
    if (hoveringRef.current || pointerDownRef.current) return;
    if (!emblaApi) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (hoveringRef.current || pointerDownRef.current) return;
      scrollToActive();
    }, IDLE_RETURN_MS);
  }, [clearTimer, emblaApi, scrollToActive]);

  const onPointerEnter = useCallback(() => {
    hoveringRef.current = true;
    clearTimer();
  }, [clearTimer]);

  const onPointerLeave = useCallback(() => {
    hoveringRef.current = false;
    scheduleReturn();
  }, [scheduleReturn]);

  useEffect(() => {
    if (!emblaApi) return;

    const onPointerDown = () => {
      pointerDownRef.current = true;
      clearTimer();
    };
    const onPointerUp = () => {
      pointerDownRef.current = false;
      scheduleReturn();
    };

    emblaApi.on('pointerDown', onPointerDown);
    emblaApi.on('pointerUp', onPointerUp);

    return () => {
      emblaApi.off('pointerDown', onPointerDown);
      emblaApi.off('pointerUp', onPointerUp);
      clearTimer();
    };
  }, [emblaApi, clearTimer, scheduleReturn]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { onPointerEnter, onPointerLeave };
}
