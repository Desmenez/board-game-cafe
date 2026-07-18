import { useEffect, useState } from 'react';

/** Format remaining ms: under 1 minute → `"12 วิ"`, else `"1:05"`. */
export function formatRemainMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s} วิ`;
}

export type DeadlineCountdown = {
  remainMs: number;
  /** `null` when there is no deadline. */
  label: string | null;
  expired: boolean;
};

/**
 * Live countdown from a server `endsAtMs` timestamp.
 * Owns its own interval — do not pass a parent `now` only for timers.
 */
export function useDeadlineCountdown(
  endsAtMs: number | null | undefined,
  tickMs = 500,
): DeadlineCountdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAtMs == null) return;
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [endsAtMs, tickMs]);

  if (endsAtMs == null) {
    return { remainMs: 0, label: null, expired: false };
  }

  const remainMs = Math.max(0, endsAtMs - now);
  return {
    remainMs,
    label: formatRemainMs(remainMs),
    expired: remainMs <= 0,
  };
}
