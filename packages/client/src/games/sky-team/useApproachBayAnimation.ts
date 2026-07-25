import { useEffect, useRef, useState } from 'react';
import type { SkyTeamApproachSpaceState, SkyTeamPlayerView } from 'shared';

const STEP_MS = 550;
/** Board axis CSS transition is 0.45s — wait a beat before lose modal on spin. */
const AXIS_SPIN_SETTLE_MS = 520;

export type ApproachBayPush = {
  fromIndex: number;
  toIndex: number;
};

type AnimState = {
  /** Index currently settled in the bay (may differ from server during collision reveal). */
  displayIndex: number;
  /** Active top→bottom push, or null when idle. */
  push: ApproachBayPush | null;
  /** Further target indices to animate after the current push. */
  queue: number[];
  /**
   * True once we've queued/finished the collision-card reveal for this lose.
   * Kept in React state (not a ref) so Strict Mode remounts can re-queue correctly.
   */
  collisionRevealDone: boolean;
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

/** Next approach index to flash into the bay when a collision lose has no server advance past it. */
function collisionRevealIndex(view: SkyTeamPlayerView, afterIndex: number): number | null {
  if (view.phase !== 'game_over' || view.loseReason !== 'collision') return null;
  const next = afterIndex + 1;
  if (next >= view.approach.length) return null;
  return next;
}

/**
 * Approach bay card-push animation when engines advance the track.
 * Also reveals the colliding space on a failed advance, and reports
 * `isAnimating` so the lose modal can wait until the push finishes.
 */
export function useApproachBayAnimation(view: SkyTeamPlayerView): {
  displayIndex: number;
  push: ApproachBayPush | null;
  isAnimating: boolean;
  spaceAt: (index: number) => SkyTeamApproachSpaceState | undefined;
  onPushComplete: () => void;
} {
  const [anim, setAnim] = useState<AnimState>(() => ({
    displayIndex: view.approachPosition,
    push: null,
    queue: [],
    collisionRevealDone: false,
  }));

  const animRef = useRef(anim);
  animRef.current = anim;

  /** Last server approachPosition we fully reconciled. */
  const syncedServerPosRef = useRef(view.approachPosition);
  /** Prevents Motion firing onAnimationComplete twice for the same push. */
  const completeLockRef = useRef<string | null>(null);

  const spaceAt = (index: number) => view.approach[index];

  const beginQueue = (fromIndex: number, targets: number[], collisionRevealDone: boolean) => {
    if (targets.length === 0) return;
    completeLockRef.current = null;
    if (prefersReducedMotion()) {
      const last = targets[targets.length - 1]!;
      setAnim({
        displayIndex: last,
        push: null,
        queue: [],
        collisionRevealDone,
      });
      return;
    }
    setAnim({
      displayIndex: fromIndex,
      push: { fromIndex, toIndex: targets[0]! },
      queue: targets.slice(1),
      collisionRevealDone,
    });
  };

  // Leaving a collision lose clears the reveal latch for the next match.
  useEffect(() => {
    if (view.phase !== 'game_over' || view.loseReason !== 'collision') {
      setAnim((prev) => (prev.collisionRevealDone ? { ...prev, collisionRevealDone: false } : prev));
    }
  }, [view.phase, view.loseReason]);

  useEffect(() => {
    const current = animRef.current;
    if (current.push) return;

    const serverPos = view.approachPosition;
    const serverMoved = serverPos !== syncedServerPosRef.current;

    if (serverMoved) {
      const from = current.displayIndex;
      if (serverPos > from) {
        const targets = rangeInclusive(from + 1, serverPos);
        let collisionRevealDone = current.collisionRevealDone;
        const reveal = collisionRevealIndex(view, serverPos);
        if (reveal != null && !collisionRevealDone) {
          targets.push(reveal);
          collisionRevealDone = true;
        }
        beginQueue(from, targets, collisionRevealDone);
        syncedServerPosRef.current = serverPos;
        return;
      }
      // Rewind / new match — snap.
      setAnim({
        displayIndex: serverPos,
        push: null,
        queue: [],
        collisionRevealDone: false,
      });
      syncedServerPosRef.current = serverPos;
      return;
    }

    // Collision with no server advance: push the dangerous next card into the bay.
    if (!current.collisionRevealDone) {
      const reveal = collisionRevealIndex(view, serverPos);
      if (reveal != null && serverPos === current.displayIndex) {
        beginQueue(current.displayIndex, [reveal], true);
      }
    }
  }, [view.approachPosition, view.loseReason, view.phase, view.approach.length, anim.push]);

  const onPushComplete = () => {
    const current = animRef.current.push;
    if (!current) return;
    const key = `${current.fromIndex}->${current.toIndex}`;
    if (completeLockRef.current === key) return;
    completeLockRef.current = key;

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
            collisionRevealDone: prev.collisionRevealDone,
          };
        }
        return {
          displayIndex: settled,
          push: { fromIndex: settled, toIndex: next! },
          queue: rest,
          collisionRevealDone: prev.collisionRevealDone,
        };
      }
      return {
        displayIndex: settled,
        push: null,
        queue: [],
        collisionRevealDone: prev.collisionRevealDone,
      };
    });
  };

  const needsServerAdvance = view.approachPosition > anim.displayIndex;
  const needsCollisionReveal =
    !anim.collisionRevealDone &&
    collisionRevealIndex(view, view.approachPosition) != null &&
    anim.displayIndex === view.approachPosition;

  const isAnimating =
    anim.push != null ||
    (!prefersReducedMotion() && (needsServerAdvance || needsCollisionReveal));

  return {
    displayIndex: anim.displayIndex,
    push: anim.push,
    isAnimating,
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
