import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Relative sizes / offsets for the Sky Team module assembly
 * (kerosene left · main board · wind right · intern below · ice brakes overlay).
 * Tune via /dev/sky-team-layout Modules assembly lab.
 *
 * `keroseneWidthRem` / `windWidthRem` are design widths at `boardMaxWidthPx`.
 * At runtime they scale with the live board column width so game == lab proportions.
 */
export type SkyTeamModulesAssemblyLayout = {
  /** Flex gap between kerosene / board stack / wind (rem). */
  rowGapRem: number;
  /** Main control panel max width (px). */
  boardMaxWidthPx: number;
  /**
   * Main control panel min width (px) — keeps slots readable on narrow phones
   * (board row scrolls horizontally when needed).
   */
  boardMinWidthPx: number;
  /** Kerosene (or leak) strip width (rem) at `boardMaxWidthPx`. */
  keroseneWidthRem: number;
  /** Vertical nudge of kerosene vs board top (px; + = down). */
  keroseneOffsetYPx: number;
  /** Wind ring width (rem) at `boardMaxWidthPx`. */
  windWidthRem: number;
  /** Vertical nudge of wind vs board top (px; + = down). Top-aligned by default. */
  windOffsetYPx: number;
  /** Gap between main board and Intern strip (rem). */
  internGapRem: number;
  /** Intern width as % of the board stack column. */
  internWidthPercent: number;
};

/** Tuned in layout lab — paste over after Copy JSON. */
export const DEFAULT_MODULES_ASSEMBLY_LAYOUT: SkyTeamModulesAssemblyLayout = {
  rowGapRem: 0.5,
  boardMaxWidthPx: 820,
  boardMinWidthPx: 580,
  keroseneWidthRem: 9.9,
  keroseneOffsetYPx: 0,
  windWidthRem: 18.6,
  windOffsetYPx: 0,
  internGapRem: 0.5,
  internWidthPercent: 100,
};

function rootRemPx(): number {
  if (typeof window === 'undefined') return 16;
  const raw = window.getComputedStyle(document.documentElement).fontSize;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 16;
}

/** Scale a design rem width with the live board column (vs `boardMaxWidthPx`). */
export function assemblyStripWidthPx(
  assembly: SkyTeamModulesAssemblyLayout,
  designWidthRem: number,
  boardWidthPx: number,
): number {
  const designPx = designWidthRem * rootRemPx();
  const board = Math.max(1, boardWidthPx);
  return (designPx * board) / assembly.boardMaxWidthPx;
}

/**
 * Observe the board stack column and return scaled kerosene / wind widths
 * so strips keep lab proportions at any board size.
 */
export function useModulesAssemblyStripWidths(assembly: SkyTeamModulesAssemblyLayout): {
  boardStackRef: RefObject<HTMLDivElement | null>;
  keroseneWidthPx: number;
  windWidthPx: number;
} {
  const boardStackRef = useRef<HTMLDivElement | null>(null);
  const [boardWidthPx, setBoardWidthPx] = useState(assembly.boardMaxWidthPx);

  useLayoutEffect(() => {
    const el = boardStackRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setBoardWidthPx(w);
    };
    update();

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w != null && w > 0) setBoardWidthPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [assembly.boardMaxWidthPx]);

  return {
    boardStackRef,
    keroseneWidthPx: assemblyStripWidthPx(assembly, assembly.keroseneWidthRem, boardWidthPx),
    windWidthPx: assemblyStripWidthPx(assembly, assembly.windWidthRem, boardWidthPx),
  };
}
