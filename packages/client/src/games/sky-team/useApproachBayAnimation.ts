import { useEffect, useRef, useState, type RefObject } from 'react';
import type { SkyTeamApproachSpaceState, SkyTeamPlayerView } from 'shared';

/** Pause after the bay is centered, before the push starts. */
export const APPROACH_BAY_PRE_PUSH_DELAY_MS = 500;
/** Fallback wait for smooth scroll to finish (scrollend may be missing). */
export const APPROACH_BAY_SCROLL_SETTLE_FALLBACK_MS = 450;

const STEP_MS = 550;
/** Pause after the bay is centered, before the push starts. */
const PRE_PUSH_DELAY_MS = APPROACH_BAY_PRE_PUSH_DELAY_MS;
/** Pause after the last push before releasing the lose modal. */
const POST_LOSE_HOLD_MS = 500;
/** Fallback wait for smooth scroll to finish (scrollend may be missing). */
const SCROLL_SETTLE_FALLBACK_MS = APPROACH_BAY_SCROLL_SETTLE_FALLBACK_MS;
/** Board axis CSS transition is 0.45s — wait a beat before lose modal on spin. */
const AXIS_SPIN_SETTLE_MS = 520;
/** Ignore sub-pixel / tiny centering deltas. */
const CENTER_EPS_PX = 4;

export type ApproachBayPush = {
  fromIndex: number;
  toIndex: number;
};

type AnimState = {
  /** Index currently settled in the bay (may differ from server during multi-step push). */
  displayIndex: number;
  /** Active top→bottom push, or null when idle. */
  push: ApproachBayPush | null;
  /** Further target indices to animate after the current push. */
  queue: number[];
};

type Staging = {
  fromIndex: number;
  targets: number[];
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function rangeInclusive(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

function isApproachLose(view: SkyTeamPlayerView): boolean {
  return (
    view.phase === 'game_over' &&
    (view.loseReason === 'collision' || view.loseReason === 'overshoot')
  );
}

function canScrollAxis(el: HTMLElement, axis: 'x' | 'y'): boolean {
  const style = getComputedStyle(el);
  if (axis === 'x') {
    const ox = style.overflowX;
    return (
      (ox === 'auto' || ox === 'scroll' || ox === 'overlay') && el.scrollWidth > el.clientWidth + 1
    );
  }
  const oy = style.overflowY;
  return (
    (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight + 1
  );
}

function collectScrollParents(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.documentElement) {
    if (canScrollAxis(node, 'x') || canScrollAxis(node, 'y')) out.push(node);
    node = node.parentElement;
  }
  return out;
}

function clampScrollDelta(scroller: HTMLElement, axis: 'x' | 'y', delta: number): number {
  if (axis === 'x') {
    const max = scroller.scrollWidth - scroller.clientWidth;
    const next = Math.min(max, Math.max(0, scroller.scrollLeft + delta));
    return next - scroller.scrollLeft;
  }
  const max = scroller.scrollHeight - scroller.clientHeight;
  const next = Math.min(max, Math.max(0, scroller.scrollTop + delta));
  return next - scroller.scrollTop;
}

/**
 * Scroll so `el` sits as close to the viewport center as bounds allow —
 * first the nearest horizontal scroller (e.g. `.st-board-row` when gear is
 * open), then the window for any remaining offset.
 */
export function scrollElementTowardViewportCenter(
  el: HTMLElement,
  behavior: ScrollBehavior,
): EventTarget[] {
  const moved: EventTarget[] = [];
  const parents = collectScrollParents(el);
  const rect = el.getBoundingClientRect();
  const elCx = rect.left + rect.width / 2;
  const elCy = rect.top + rect.height / 2;

  let plannedShiftX = 0;
  let plannedShiftY = 0;

  const xScroller = parents.find((s) => canScrollAxis(s, 'x'));
  if (xScroller) {
    const s = xScroller.getBoundingClientRect();
    const raw = elCx - (s.left + s.width / 2);
    const dx = clampScrollDelta(xScroller, 'x', raw);
    if (Math.abs(dx) > CENTER_EPS_PX) {
      xScroller.scrollBy({ left: dx, behavior });
      plannedShiftX += dx;
      moved.push(xScroller);
    }
  }

  const yScroller = parents.find((s) => canScrollAxis(s, 'y') && s !== xScroller);
  if (yScroller) {
    const s = yScroller.getBoundingClientRect();
    const raw = elCy - (s.top + s.height / 2);
    const dy = clampScrollDelta(yScroller, 'y', raw);
    if (Math.abs(dy) > CENTER_EPS_PX) {
      yScroller.scrollBy({ top: dy, behavior });
      plannedShiftY += dy;
      moved.push(yScroller);
    }
  }

  // Predict viewport position after ancestor scrolls, then nudge the window.
  const predictedCx = elCx - plannedShiftX;
  const predictedCy = elCy - plannedShiftY;
  const winDx = predictedCx - window.innerWidth / 2;
  const winDy = predictedCy - window.innerHeight / 2;
  if (Math.abs(winDx) > CENTER_EPS_PX || Math.abs(winDy) > CENTER_EPS_PX) {
    window.scrollBy({ left: winDx, top: winDy, behavior });
    moved.push(window);
  }

  return moved;
}

export function waitForScrollSettle(targets: EventTarget[], fallbackMs: number): Promise<void> {
  if (targets.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    let pending = targets.length;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      for (const t of targets) t.removeEventListener('scrollend', onEnd);
      resolve();
    };
    const onEnd = () => {
      pending -= 1;
      if (pending <= 0) finish();
    };
    const fallbackTimer = window.setTimeout(finish, fallbackMs);
    for (const t of targets) t.addEventListener('scrollend', onEnd);
  });
}

/**
 * Approach bay card-push animation when engines advance the track.
 * Choreography: center bay in viewport → 0.5s → push → (on lose) 0.5s → release modal hold.
 */
export function useApproachBayAnimation(view: SkyTeamPlayerView): {
  displayIndex: number;
  push: ApproachBayPush | null;
  isAnimating: boolean;
  bayAnchorRef: RefObject<HTMLButtonElement | null>;
  spaceAt: (index: number) => SkyTeamApproachSpaceState | undefined;
  onPushComplete: () => void;
} {
  const [anim, setAnim] = useState<AnimState>(() => ({
    displayIndex: view.approachPosition,
    push: null,
    queue: [],
  }));
  const [staging, setStaging] = useState<Staging | null>(null);
  const [postLoseHold, setPostLoseHold] = useState(false);

  const animRef = useRef(anim);
  animRef.current = anim;

  const viewRef = useRef(view);
  viewRef.current = view;

  const bayAnchorRef = useRef<HTMLButtonElement | null>(null);

  /** Last server approachPosition we fully reconciled (or staged). */
  const syncedServerPosRef = useRef(view.approachPosition);
  /** Prevents Motion firing onAnimationComplete twice for the same push. */
  const completeLockRef = useRef<string | null>(null);
  const postHoldTimerRef = useRef<number | null>(null);

  const spaceAt = (index: number) => view.approach[index];

  const clearPostHoldTimer = () => {
    if (postHoldTimerRef.current != null) {
      window.clearTimeout(postHoldTimerRef.current);
      postHoldTimerRef.current = null;
    }
  };

  const armPostLoseHoldIfNeeded = () => {
    if (!isApproachLose(viewRef.current)) return;
    clearPostHoldTimer();
    setPostLoseHold(true);
    postHoldTimerRef.current = window.setTimeout(() => {
      setPostLoseHold(false);
      postHoldTimerRef.current = null;
    }, POST_LOSE_HOLD_MS);
  };

  const beginQueue = (fromIndex: number, targets: number[]) => {
    if (targets.length === 0) return;
    completeLockRef.current = null;
    if (prefersReducedMotion()) {
      const last = targets[targets.length - 1]!;
      setAnim({
        displayIndex: last,
        push: null,
        queue: [],
      });
      armPostLoseHoldIfNeeded();
      return;
    }
    setAnim({
      displayIndex: fromIndex,
      push: { fromIndex, toIndex: targets[0]! },
      queue: targets.slice(1),
    });
  };

  useEffect(() => {
    return () => clearPostHoldTimer();
  }, []);

  useEffect(() => {
    if (view.phase !== 'game_over') {
      clearPostHoldTimer();
      setPostLoseHold(false);
    }
  }, [view.phase, view.loseReason]);

  // Detect advance → enter staging (do not beginQueue yet).
  useEffect(() => {
    const current = animRef.current;
    if (current.push || staging) return;

    const serverPos = view.approachPosition;
    const serverMoved = serverPos !== syncedServerPosRef.current;

    if (serverMoved) {
      const from = current.displayIndex;
      if (serverPos > from) {
        const targets = rangeInclusive(from + 1, serverPos);
        syncedServerPosRef.current = serverPos;
        setStaging({ fromIndex: from, targets });
        return;
      }
      // Rewind / new match — snap.
      setStaging(null);
      setAnim({
        displayIndex: serverPos,
        push: null,
        queue: [],
      });
      syncedServerPosRef.current = serverPos;
    }
  }, [view.approachPosition, view.loseReason, view.phase, view.approach.length, anim.push, staging]);

  // Staging: center bay in viewport → settle → pre-delay → beginQueue.
  useEffect(() => {
    if (!staging) return;

    let cancelled = false;
    const { fromIndex, targets } = staging;
    const reduced = prefersReducedMotion();
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
    const bay = bayAnchorRef.current;

    const run = async () => {
      if (bay) {
        const moved = scrollElementTowardViewportCenter(bay, behavior);
        if (!reduced && moved.length > 0) {
          await waitForScrollSettle(moved, SCROLL_SETTLE_FALLBACK_MS);
        }
      }
      if (cancelled) return;
      const pause = reduced ? 0 : PRE_PUSH_DELAY_MS;
      if (pause > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, pause);
        });
      }
      if (cancelled) return;
      setStaging(null);
      beginQueue(fromIndex, targets);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [staging]);

  const onPushComplete = () => {
    const current = animRef.current.push;
    if (!current) return;
    const key = `${current.fromIndex}->${current.toIndex}`;
    if (completeLockRef.current === key) return;
    completeLockRef.current = key;

    const remaining = animRef.current.queue.length;
    const finishesNow = remaining === 0 || prefersReducedMotion();

    setAnim((prev) => {
      if (!prev.push) return prev;
      const settled = prev.push.toIndex;
      if (prev.queue.length > 0) {
        const [next, ...rest] = prev.queue;
        completeLockRef.current = null;
        if (prefersReducedMotion()) {
          const last = rest.length > 0 ? rest[rest.length - 1]! : next!;
          return {
            displayIndex: last,
            push: null,
            queue: [],
          };
        }
        return {
          displayIndex: settled,
          push: { fromIndex: settled, toIndex: next! },
          queue: rest,
        };
      }
      return {
        displayIndex: settled,
        push: null,
        queue: [],
      };
    });

    if (finishesNow) armPostLoseHoldIfNeeded();
  };

  const needsServerAdvance = view.approachPosition > anim.displayIndex;

  const isAnimating =
    staging != null ||
    postLoseHold ||
    anim.push != null ||
    (!prefersReducedMotion() && needsServerAdvance);

  return {
    displayIndex: anim.displayIndex,
    push: anim.push,
    isAnimating,
    bayAnchorRef,
    spaceAt,
    onPushComplete,
  };
}

/**
 * True while the board should finish playing (approach push / axis spin) before
 * the game-over modal appears.
 */
export function useSkyTeamGameOverHold(view: SkyTeamPlayerView, approachAnimating: boolean): boolean {
  const [axisHold, setAxisHold] = useState(false);
  const armedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (view.phase !== 'game_over') {
      armedKeyRef.current = null;
      setAxisHold(false);
      return;
    }
    if (view.loseReason !== 'axis_spin' || prefersReducedMotion()) {
      setAxisHold(false);
      return;
    }
    const key = `axis:${view.axisPosition}:${view.loseReason}`;
    if (armedKeyRef.current === key) return;
    armedKeyRef.current = key;
    setAxisHold(true);
    const timer = window.setTimeout(() => setAxisHold(false), AXIS_SPIN_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [view.phase, view.loseReason, view.axisPosition]);

  return approachAnimating || axisHold;
}

/** Duration used by the bay motion tween — keep in sync with STEP_MS intent. */
export const APPROACH_BAY_PUSH_SECONDS = STEP_MS / 1000;
