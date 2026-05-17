import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PlayerHandDrawAnimation } from './types';

function resolveDrawOrigin(
  drawFromRef?: RefObject<HTMLElement | null>,
  drawFromRect?: DOMRect | null,
): DOMRect | null {
  if (drawFromRect) return drawFromRect;
  const el = drawFromRef?.current;
  if (!el) return null;
  return el.getBoundingClientRect();
}

type DrawFlight = {
  cardId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  previewSrc?: string;
};

type Options = {
  drawAnimation?: PlayerHandDrawAnimation;
  getSlotElement: (cardId: string) => HTMLElement | null;
  getPreviewSrc?: (cardId: string) => string | undefined;
};

const FLIGHT_FALLBACK_MS = 520;
const INSTANT_DRAW_MS = 280;

/**
 * Tracks cards mid draw-in animation. Cards in `drawingIds` should render with opacity 0
 * until their flight completes.
 */
export function useHandDrawAnimation({
  drawAnimation,
  getSlotElement,
  getPreviewSrc,
}: Options) {
  const [drawingIds, setDrawingIds] = useState<Set<string>>(() => new Set());
  const [flights, setFlights] = useState<DrawFlight[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  const fallbackTimeoutsRef = useRef<Map<string, number>>(new Map());

  const clearFallback = useCallback((cardId: string) => {
    const timeoutId = fallbackTimeoutsRef.current.get(cardId);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      fallbackTimeoutsRef.current.delete(cardId);
    }
  }, []);

  const finishCard = useCallback(
    (cardId: string) => {
      clearFallback(cardId);
      setDrawingIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      setFlights((prev) => prev.filter((f) => f.cardId !== cardId));
      processedRef.current.add(cardId);
    },
    [clearFallback],
  );

  useEffect(() => {
    const incoming = drawAnimation?.newlyDrawnIds ?? [];
    if (incoming.length === 0) return;

    let cancelled = false;
    let rafInner: number | undefined;
    const scheduledThisEffect: string[] = [];

    const scheduleFallback = (cardId: string, ms: number) => {
      clearFallback(cardId);
      const timeoutId = window.setTimeout(() => {
        fallbackTimeoutsRef.current.delete(cardId);
        if (!cancelled) finishCard(cardId);
      }, ms);
      fallbackTimeoutsRef.current.set(cardId, timeoutId);
    };

    const run = () => {
      if (cancelled) return;

      const origin = resolveDrawOrigin(drawAnimation?.drawFromRef, drawAnimation?.drawFromRect ?? null);
      const originCenter = origin
        ? { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 }
        : null;

      const toSchedule: DrawFlight[] = [];

      for (const cardId of incoming) {
        if (processedRef.current.has(cardId)) continue;

        const slot = getSlotElement(cardId);
        const slotRect = slot?.getBoundingClientRect();
        const to = slotRect
          ? { x: slotRect.left + slotRect.width / 2, y: slotRect.top + slotRect.height / 2 }
          : originCenter
            ? { x: originCenter.x, y: originCenter.y + 80 }
            : null;

        if (!to) {
          processedRef.current.add(cardId);
          continue;
        }

        const from = originCenter ?? { x: to.x, y: to.y - 120 };

        toSchedule.push({
          cardId,
          from,
          to,
          previewSrc: getPreviewSrc?.(cardId),
        });
      }

      if (toSchedule.length === 0) return;

      for (const f of toSchedule) {
        scheduledThisEffect.push(f.cardId);
      }

      setDrawingIds((prev) => {
        const next = new Set(prev);
        for (const f of toSchedule) next.add(f.cardId);
        return next;
      });
      setFlights((prev) => [...prev, ...toSchedule]);

      const fallbackMs = originCenter ? FLIGHT_FALLBACK_MS : INSTANT_DRAW_MS;
      for (const f of toSchedule) {
        scheduleFallback(f.cardId, fallbackMs);
      }
    };

    const rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(run);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafOuter);
      if (rafInner !== undefined) cancelAnimationFrame(rafInner);
      for (const cardId of scheduledThisEffect) {
        finishCard(cardId);
      }
    };
  }, [
    clearFallback,
    drawAnimation?.newlyDrawnIds,
    drawAnimation?.drawFromRef,
    drawAnimation?.drawFromRect,
    finishCard,
    getPreviewSrc,
    getSlotElement,
  ]);

  return { drawingIds, flights, finishCard };
}
