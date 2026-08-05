import { useEffect } from 'react';

type SavedScrollLock = {
  scrollY: number;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  bodyTouchAction: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
};

let lockCount = 0;
let saved: SavedScrollLock | null = null;

function applyBodyScrollLock() {
  const body = document.body;
  const html = document.documentElement;
  const scrollY = window.scrollY;

  saved = {
    scrollY,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    bodyTouchAction: body.style.touchAction,
    htmlOverflow: html.style.overflow,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
  };

  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.touchAction = 'none';
  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
}

function releaseBodyScrollLock() {
  if (!saved) return;
  const body = document.body;
  const html = document.documentElement;
  const { scrollY, ...prev } = saved;
  saved = null;

  body.style.overflow = prev.bodyOverflow;
  body.style.position = prev.bodyPosition;
  body.style.top = prev.bodyTop;
  body.style.width = prev.bodyWidth;
  body.style.touchAction = prev.bodyTouchAction;
  html.style.overflow = prev.htmlOverflow;
  html.style.overscrollBehavior = prev.htmlOverscrollBehavior;
  window.scrollTo(0, scrollY);
}

/**
 * Lock page scroll while a dialog, drawer, or drag gesture is active.
 * Nested locks use a ref-count so the page unlocks only when the last lock releases.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) applyBodyScrollLock();
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseBodyScrollLock();
    };
  }, [locked]);
}
