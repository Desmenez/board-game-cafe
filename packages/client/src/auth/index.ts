import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function nonEmptyEnv(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Auth is optional. Empty / whitespace / unset env ⇒ guest-only mode.
 * Game create/join/play must never require these vars.
 */
export function isAuthConfigured(): boolean {
  return (
    nonEmptyEnv(import.meta.env.VITE_SUPABASE_URL) &&
    nonEmptyEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)
  );
}

function getClient(): SupabaseClient {
  if (!isAuthConfigured()) {
    throw new Error(
      'Supabase auth is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)',
    );
  }
  if (!client) {
    client = createClient(
      (import.meta.env.VITE_SUPABASE_URL as string).trim(),
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim(),
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return client;
}

/** Exposed for profile/friends queries that still go through the facade boundary. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isAuthConfigured()) return null;
  return getClient();
}

export async function signInWithGoogle(): Promise<void> {
  if (!isAuthConfigured()) {
    throw new Error('ยังไม่ได้ตั้งค่า Supabase — เล่นแบบ guest ได้ตามปกติ');
  }
  const redirectTo = `${window.location.origin}/`;
  const { error } = await getClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        // Restrict to Google accounts; app policy is Gmail/Google-only login.
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!isAuthConfigured()) return;
  try {
    const { error } = await getClient().auth.signOut();
    if (error) console.error('signOut', error);
  } catch (err) {
    console.error('signOut', err);
  }
}

/** Never throws — returns null when unconfigured or on auth errors (guest path stays usable). */
export async function getSession(): Promise<Session | null> {
  if (!isAuthConfigured()) return null;
  try {
    const { data, error } = await getClient().auth.getSession();
    if (error) {
      console.error('getSession', error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('getSession', err);
    return null;
  }
}

/** Never throws — used on every create/join/resume; must not block guest play. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function getUser(): Promise<User | null> {
  if (!isAuthConfigured()) return null;
  try {
    const { data, error } = await getClient().auth.getUser();
    if (error) {
      console.error('getUser', error);
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('getUser', err);
    return null;
  }
}

export type AuthStateListener = (session: Session | null, event?: string) => void;

export function onAuthStateChange(listener: AuthStateListener): () => void {
  if (!isAuthConfigured()) {
    listener(null);
    return () => undefined;
  }
  try {
    const { data } = getClient().auth.onAuthStateChange((event, session) => {
      listener(session, event);
    });
    return () => data.subscription.unsubscribe();
  } catch (err) {
    console.error('onAuthStateChange', err);
    listener(null);
    return () => undefined;
  }
}
