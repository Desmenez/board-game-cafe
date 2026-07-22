import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

function nonEmptyEnv(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Auth/persistence is optional. Unset env ⇒ guest-only server (rooms in memory only).
 * Adding games and running `pnpm dev` must work without these vars.
 */
export function isAuthConfigured(): boolean {
  return (
    nonEmptyEnv(process.env.SUPABASE_URL) && nonEmptyEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/** Project URL used to allowlist uploaded avatar photo URLs on the wire. */
export function getSupabaseUrl(): string | null {
  if (!nonEmptyEnv(process.env.SUPABASE_URL)) return null;
  return process.env.SUPABASE_URL.trim();
}

function getAdminClient(): SupabaseClient {
  if (!isAuthConfigured()) {
    throw new Error(
      'Supabase is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    );
  }
  if (!adminClient) {
    adminClient = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return adminClient;
}

/** Service-role client for match inserts and other privileged writes. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isAuthConfigured()) return null;
  return getAdminClient();
}

export interface VerifiedAccessToken {
  userId: string;
  user: User;
}

/**
 * Verify a client access token and return the Supabase user id (`profiles.id`).
 * Returns null when auth is unconfigured, token missing, or verification fails.
 * Must never throw — guest create/join depends on this being safe.
 */
export async function verifyAccessToken(
  accessToken: string | undefined | null,
): Promise<VerifiedAccessToken | null> {
  if (!accessToken || !isAuthConfigured()) return null;
  try {
    const { data, error } = await getAdminClient().auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { userId: data.user.id, user: data.user };
  } catch (err) {
    console.error('verifyAccessToken', err);
    return null;
  }
}
