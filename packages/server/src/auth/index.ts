import { createHash } from 'node:crypto';
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
  /** Supabase session id, when present in the verified access-token claims. */
  sessionKey: string;
  expiresAt: Date | null;
}

function readVerifiedTokenSession(accessToken: string): {
  sessionKey: string;
  expiresAt: Date | null;
} {
  // This data is used only after auth.getUser has verified the signature. It is
  // never trusted to establish identity on its own.
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) throw new Error('JWT payload missing');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      session_id?: unknown;
      exp?: unknown;
    };
    const sessionId = typeof claims.session_id === 'string' ? claims.session_id : '';
    const exp = typeof claims.exp === 'number' ? new Date(claims.exp * 1000) : null;
    return {
      // Old/third-party tokens may not carry session_id. Their hash still gives
      // a safe, non-secret database key for expiry/revocation bookkeeping.
      sessionKey: sessionId || createHash('sha256').update(accessToken).digest('hex'),
      expiresAt: exp && !Number.isNaN(exp.valueOf()) ? exp : null,
    };
  } catch {
    return { sessionKey: createHash('sha256').update(accessToken).digest('hex'), expiresAt: null };
  }
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
    const session = readVerifiedTokenSession(accessToken);
    return { userId: data.user.id, user: data.user, ...session };
  } catch (err) {
    console.error('verifyAccessToken', err);
    return null;
  }
}

/**
 * App-level admission check for a previously mirrored Supabase session.
 * Supabase remains the authority for credential verification; this adds local
 * expiry/revocation enforcement for game connections without affecting guests.
 */
export async function admitVerifiedSession(session: VerifiedAccessToken): Promise<boolean> {
  if (session.expiresAt && session.expiresAt.valueOf() <= Date.now()) return false;
  const admin = getSupabaseAdmin();
  if (!admin) return true;
  const sessionKeyHash = createHash('sha256').update(session.sessionKey).digest('hex');
  try {
    const { data, error } = await admin
      .from('app_auth_sessions')
      .select('revoked_at, expires_at')
      .eq('session_key_hash', sessionKeyHash)
      .maybeSingle();
    if (error) {
      // A missing migration must not turn an optional-auth deployment into a
      // guest-only outage. Supabase token verification above still ran.
      console.error('admitVerifiedSession lookup', error);
      return true;
    }
    if (data?.revoked_at) return false;
    if (data?.expires_at && new Date(data.expires_at).valueOf() <= Date.now()) return false;
    return true;
  } catch (err) {
    console.error('admitVerifiedSession', err);
    return true;
  }
}

/** Verify the provider credential and apply the app's session admission policy. */
export async function verifyAdmittedAccessToken(
  accessToken: string | undefined | null,
): Promise<VerifiedAccessToken | null> {
  const verified = await verifyAccessToken(accessToken);
  if (!verified || !(await admitVerifiedSession(verified))) return null;
  return verified;
}

/** Socket-facing auth facade. Callers import this object so the seam stays mockable. */
export const appAuth = {
  isAuthConfigured,
  getSupabaseUrl,
  verifyAdmittedAccessToken,
};

/** Service helper for a future account-session management UI/API. */
export async function revokeVerifiedSession(sessionKey: string, userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const sessionKeyHash = createHash('sha256').update(sessionKey).digest('hex');
  try {
    const { error } = await admin
      .from('app_auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('session_key_hash', sessionKeyHash)
      .eq('user_id', userId)
      .is('revoked_at', null);
    if (error) {
      console.error('revokeVerifiedSession', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('revokeVerifiedSession', err);
    return false;
  }
}
