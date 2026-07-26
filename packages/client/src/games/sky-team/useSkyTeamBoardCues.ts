import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ALTITUDE_TRACK, type SkyTeamApproachSpaceState, type SkyTeamPlayerView } from 'shared';
import { rollsKey, trafficDieTargets } from './trafficDieTargets';
import './sky-team-board-cue.css';

export type SkyTeamBoardSpotlight = 'approachBay' | 'approachTrackBtn' | 'altitudeBay';

export type SkyTeamRadioReveal = {
  index: number;
  nonce: number;
};

export type SkyTeamTrafficReveal = {
  rolls: number[];
  fromIndex: number;
  /** Target approach indices, nearest to `fromIndex` first. */
  targets: number[];
  /** Plane counts before this round's Traffic Die placements. */
  planesBefore: number[];
  nonce: number;
};

/** Round descend — animate altitude bay on the main board (not the sidebar). */
export type SkyTeamAltitudeDescend = {
  fromIndex: number;
  toIndex: number;
  grantsReroll: boolean;
  nonce: number;
};

export const SKY_TEAM_BOARD_CUE_TOAST_ID = 'sky-team-board-cue';

const CUE_MS = 1100;
const CUE_MS_REDUCED = 400;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function latestLogMatching(log: string[], prefixes: string[]): string | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const line = log[i];
    if (!line) continue;
    if (prefixes.some((p) => line.startsWith(p) || line.includes(p))) return line;
  }
  return null;
}

/** Placement resolved but had no board effect (die still spent). */
function isNoopEffectLog(line: string): boolean {
  return (
    line.includes('ไม่มีเครื่องบิน') ||
    line.includes('เต็มแล้ว') ||
    line.includes('ไม่มีผล') ||
    line.includes('No airplane token remained')
  );
}

function findPlaneDrop(
  prev: SkyTeamApproachSpaceState[],
  next: SkyTeamApproachSpaceState[],
): { index: number; dropped: number } | null {
  const len = Math.max(prev.length, next.length);
  for (let i = 0; i < len; i++) {
    const before = prev[i]?.planes ?? 0;
    const after = next[i]?.planes ?? 0;
    if (after < before) return { index: i, dropped: before - after };
  }
  return null;
}

type Snapshot = {
  approachPosition: number;
  axisPosition: number;
  altitudeIndex: number;
  planesKey: string;
  loseReason: SkyTeamPlayerView['loseReason'];
  phase: SkyTeamPlayerView['phase'];
  approach: SkyTeamApproachSpaceState[];
  eventLog: string[];
  lastRollsKey: string;
};

function planesKey(approach: SkyTeamApproachSpaceState[]): string {
  return approach.map((s) => s.planes).join(',');
}

function snapshotOf(view: SkyTeamPlayerView): Snapshot {
  const lastRolls = view.moduleState.trafficDie?.lastRolls ?? [];
  return {
    approachPosition: view.approachPosition,
    axisPosition: view.axisPosition,
    altitudeIndex: view.altitudeIndex,
    planesKey: planesKey(view.approach),
    loseReason: view.loseReason,
    phase: view.phase,
    approach: view.approach,
    eventLog: view.eventLog,
    lastRollsKey: rollsKey(lastRolls),
  };
}

export function showSkyTeamBoardCueToast(message: string): void {
  toast(message, {
    id: SKY_TEAM_BOARD_CUE_TOAST_ID,
    duration: 3200,
    position: 'top-center',
    className: 'st-board-cue-toast',
  });
}

function showBoardCueToast(message: string): void {
  showSkyTeamBoardCueToast(message);
}

function armCue(
  setSpotlight: (s: SkyTeamBoardSpotlight | null) => void,
  setCueActive: (v: boolean) => void,
  timerRef: { current: number | null },
  spotlight: SkyTeamBoardSpotlight | null,
  toastMsg: string | null,
  withToast: boolean,
  durationMs?: number,
): void {
  const reduced = prefersReducedMotion();
  const shownSpotlight = reduced ? null : spotlight;
  if (timerRef.current != null) window.clearTimeout(timerRef.current);
  setSpotlight(shownSpotlight);
  setCueActive(shownSpotlight != null || (withToast && toastMsg != null));
  if (withToast && toastMsg) showBoardCueToast(toastMsg);
  const duration = durationMs ?? (reduced ? CUE_MS_REDUCED : CUE_MS);
  timerRef.current = window.setTimeout(
    () => {
      setSpotlight(null);
      setCueActive(false);
      timerRef.current = null;
    },
    reduced && durationMs == null ? CUE_MS_REDUCED : duration,
  );
}

/**
 * Detect meaningful board changes after dice resolve and surface a short
 * spotlight (+ toast when the change is off the player's focus).
 */
export function useSkyTeamBoardCues(
  view: SkyTeamPlayerView,
  approachAnimating: boolean,
): {
  spotlight: SkyTeamBoardSpotlight | null;
  boardBusy: boolean;
  radioReveal: SkyTeamRadioReveal | null;
  trafficReveal: SkyTeamTrafficReveal | null;
  /** Round 2+: altitude descended — bay anim on main board. */
  altitudeDescend: SkyTeamAltitudeDescend | null;
} {
  const prevRef = useRef<Snapshot | null>(null);
  const prevAnimatingRef = useRef(false);
  const radioNonceRef = useRef(0);
  const trafficNonceRef = useRef(0);
  const altitudeNonceRef = useRef(0);
  const [spotlight, setSpotlight] = useState<SkyTeamBoardSpotlight | null>(null);
  const [cueActive, setCueActive] = useState(false);
  const [radioReveal, setRadioReveal] = useState<SkyTeamRadioReveal | null>(null);
  const [trafficReveal, setTrafficReveal] = useState<SkyTeamTrafficReveal | null>(null);
  const [altitudeDescend, setAltitudeDescend] = useState<SkyTeamAltitudeDescend | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const prev = prevRef.current;
    const next = snapshotOf(view);
    const animStarted = !prevAnimatingRef.current && approachAnimating;
    prevAnimatingRef.current = approachAnimating;
    prevRef.current = next;
    if (!prev) return;

    const advanced = next.approachPosition > prev.approachPosition;
    const planeDrop =
      next.planesKey !== prev.planesKey ? findPlaneDrop(prev.approach, next.approach) : null;
    const approachLose =
      next.phase === 'game_over' &&
      prev.phase !== 'game_over' &&
      (next.loseReason === 'collision' || next.loseReason === 'overshoot');

    const nextRolls = view.moduleState.trafficDie?.lastRolls ?? [];
    const trafficRolled = nextRolls.length > 0 && next.lastRollsKey !== prev.lastRollsKey;

    // Detect only — Game gates release; Board owns toast / scroll / push.
    const altitudeDescended = next.altitudeIndex > prev.altitudeIndex;
    if (altitudeDescended && (next.phase === 'strategy' || next.phase === 'dice_placement')) {
      const toIndex = next.altitudeIndex;
      const fromIndex = prev.altitudeIndex;
      const grantsReroll = Boolean(ALTITUDE_TRACK[toIndex]?.grantsReroll);
      altitudeNonceRef.current += 1;
      setAltitudeDescend({
        fromIndex,
        toIndex,
        grantsReroll,
        nonce: altitudeNonceRef.current,
      });
    }

    let nextSpotlight: SkyTeamBoardSpotlight | null = null;
    let toastMsg: string | null = null;
    let withToast = false;

    if (advanced || animStarted) {
      nextSpotlight = 'approachBay';
      withToast = true;
      const steps = advanced ? next.approachPosition - prev.approachPosition : 0;
      toastMsg =
        latestLogMatching(next.eventLog, ['Engine:', 'Engine ']) ??
        (steps > 0 ? `Approach เดินหน้า ${steps} ช่อง` : 'Approach กำลังขยับ');
    }

    if (planeDrop) {
      nextSpotlight = null;
      withToast = true;
      toastMsg =
        latestLogMatching(next.eventLog, ['Radio']) ?? `ลบเครื่องบิน ${planeDrop.dropped} ลำ`;
      radioNonceRef.current += 1;
      setRadioReveal({ index: planeDrop.index, nonce: radioNonceRef.current });
    }

    if (trafficRolled) {
      const fromIndex = next.approachPosition;
      const targets = trafficDieTargets(fromIndex, nextRolls, next.approach.length);
      trafficNonceRef.current += 1;
      setTrafficReveal({
        rolls: [...nextRolls],
        fromIndex,
        targets,
        planesBefore: prev.approach.map((s) => s.planes),
        nonce: trafficNonceRef.current,
      });
      nextSpotlight = 'approachBay';
      withToast = true;
      toastMsg =
        latestLogMatching(next.eventLog, ['Traffic Die']) ?? `Traffic Die: ${nextRolls.join(', ')}`;
    }

    if (approachLose) {
      nextSpotlight = 'approachBay';
      withToast = true;
      toastMsg =
        latestLogMatching(next.eventLog, ['ชน', 'เลย', 'Holding', 'Engine']) ??
        (next.loseReason === 'collision' ? 'ชนเครื่องบินบน Approach' : 'เลยสนามบิน');
    }

    // Action placed but nothing changed (e.g. Radio on empty space, coffee full).
    if (!withToast) {
      const last = next.eventLog.at(-1);
      const prevLast = prev.eventLog.at(-1);
      if (last && last !== prevLast && isNoopEffectLog(last)) {
        withToast = true;
        toastMsg = last;
      }
    }

    if (nextSpotlight == null && !withToast) return;

    armCue(setSpotlight, setCueActive, timerRef, nextSpotlight, toastMsg, withToast);
  }, [
    view.approachPosition,
    view.axisPosition,
    view.altitudeIndex,
    view.approach,
    view.eventLog,
    view.loseReason,
    view.phase,
    view.moduleState.trafficDie?.lastRolls,
    approachAnimating,
  ]);

  return {
    spotlight,
    boardBusy: cueActive || approachAnimating,
    radioReveal,
    trafficReveal,
    altitudeDescend,
  };
}
