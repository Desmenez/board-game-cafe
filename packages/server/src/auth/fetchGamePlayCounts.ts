import { getSupabaseAdmin, isAuthConfigured } from './index.js';

/** Catalog ranking does not need second-level freshness. */
const CACHE_TTL_MS = 60_000;

let cachedCounts: Record<string, number> | null = null;
let cachedAt = 0;
let inFlight: Promise<Record<string, number>> | null = null;

/** Drop cache after a match is persisted so the next catalog load can refresh. */
export function invalidateGamePlayCountsCache(): void {
  cachedCounts = null;
  cachedAt = 0;
}

/**
 * Count finished matches per game_id (service role — includes guest-only matches).
 * Uses a short in-memory TTL and coalesces concurrent callers.
 * Returns {} when Supabase is not configured or the query fails.
 */
export async function fetchGamePlayCounts(): Promise<Record<string, number>> {
  if (!isAuthConfigured()) return {};

  const now = Date.now();
  if (cachedCounts && now - cachedAt < CACHE_TTL_MS) {
    return cachedCounts;
  }

  if (inFlight) return inFlight;

  inFlight = loadGamePlayCounts()
    .then((counts) => {
      cachedCounts = counts;
      cachedAt = Date.now();
      return counts;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

async function loadGamePlayCounts(): Promise<Record<string, number>> {
  const admin = getSupabaseAdmin();
  if (!admin) return {};

  try {
    const { data, error } = await admin.rpc('game_play_counts');
    if (error) {
      // Migration may not be applied yet — fall back to a paged scan once.
      console.warn('fetchGamePlayCounts rpc failed, falling back to scan', error.message);
      return loadGamePlayCountsByScan(admin);
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const gameId = row.game_id as string;
      if (!gameId) continue;
      counts[gameId] = Number(row.play_count) || 0;
    }
    return counts;
  } catch (err) {
    console.error('fetchGamePlayCounts', err);
    return {};
  }
}

const PAGE_SIZE = 1000;

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

async function loadGamePlayCountsByScan(admin: AdminClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin.from('matches').select('game_id').range(from, to);

    if (error) {
      console.error('fetchGamePlayCounts scan', error);
      return {};
    }

    const rows = data ?? [];
    for (const row of rows) {
      const gameId = row.game_id as string;
      if (!gameId) continue;
      counts[gameId] = (counts[gameId] ?? 0) + 1;
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return counts;
}
