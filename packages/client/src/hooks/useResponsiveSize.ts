import { useSyncExternalStore } from 'react';

/** Tailwind-aligned min-width breakpoints (px). */
export const RESPONSIVE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type ResponsiveBreakpoint = keyof typeof RESPONSIVE_BREAKPOINTS;

/** Current viewport tier — `base` is below Tailwind `sm`. */
export type ViewportBreakpoint = 'base' | ResponsiveBreakpoint;

/**
 * Mobile-first value map — `base` applies below `sm`, then each larger
 * breakpoint overrides when the viewport reaches that min-width.
 *
 * @example
 * useResponsiveSize({ base: 'sm', md: 'md', lg: 'lg' })
 */
export type ResponsiveSizeMap<T> = {
  base: T;
} & Partial<Record<ResponsiveBreakpoint, T>>;

const BREAKPOINT_ORDER = Object.keys(RESPONSIVE_BREAKPOINTS) as ResponsiveBreakpoint[];

function getViewportWidth(): number {
  return window.innerWidth;
}

function getServerViewportWidth(): number {
  return 0;
}

function subscribeViewport(onChange: () => void): () => void {
  const mediaQueries = BREAKPOINT_ORDER.map((bp) =>
    window.matchMedia(`(min-width: ${RESPONSIVE_BREAKPOINTS[bp]}px)`),
  );
  for (const mq of mediaQueries) {
    mq.addEventListener('change', onChange);
  }
  return () => {
    for (const mq of mediaQueries) {
      mq.removeEventListener('change', onChange);
    }
  };
}

function useViewportWidth(): number {
  return useSyncExternalStore(subscribeViewport, getViewportWidth, getServerViewportWidth);
}

/** Largest Tailwind breakpoint the viewport currently satisfies (`base` if none). */
export function resolveBreakpoint(width: number): ViewportBreakpoint {
  let current: ViewportBreakpoint = 'base';
  for (const bp of BREAKPOINT_ORDER) {
    if (width >= RESPONSIVE_BREAKPOINTS[bp]) current = bp;
  }
  return current;
}

/**
 * Returns the active viewport breakpoint name.
 *
 * @example
 * const bp = useBreakpoint()
 * <Button size={bp === 'base' || bp === 'sm' ? 'sm' : 'md'} />
 */
export function useBreakpoint(): ViewportBreakpoint {
  return resolveBreakpoint(useViewportWidth());
}

export function resolveResponsiveSize<T>(map: ResponsiveSizeMap<T>, width: number): T {
  let value = map.base;
  for (const bp of BREAKPOINT_ORDER) {
    const next = map[bp];
    if (next !== undefined && width >= RESPONSIVE_BREAKPOINTS[bp]) {
      value = next;
    }
  }
  return value;
}

/**
 * Returns the value from a mobile-first breakpoint map for the current viewport.
 * Safe for SSR — uses `map.base` until hydrated.
 *
 * String literals are preserved (`'sm' | 'md'`) via `const` type params.
 *
 * @example
 * const size = useResponsiveSize({ base: 'sm', md: 'md' })
 * <Button size={size} />
 */
export function useResponsiveSize<const M extends ResponsiveSizeMap<unknown>>(
  map: M,
): Exclude<M[keyof M], undefined> {
  return resolveResponsiveSize(
    map as ResponsiveSizeMap<Exclude<M[keyof M], undefined>>,
    useViewportWidth(),
  );
}
