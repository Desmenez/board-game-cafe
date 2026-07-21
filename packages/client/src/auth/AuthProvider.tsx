import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { normalizePlayerAvatar } from 'shared';
import {
  getSession,
  isAuthConfigured,
  onAuthStateChange,
  signInWithGoogle,
  signOut as authSignOut,
} from './index';
import { fetchOwnProfile } from './profileApi';
import { AuthContext } from './auth-context';
import { writeGlobalPlayerNameToStorage } from '../utils/playerDisplayName';
import { writeGlobalPlayerAvatarToStorage } from '../utils/playerAvatar';

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isAuthConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchOwnProfile>>>(null);

  const applyProfileDefaults = useCallback((row: NonNullable<typeof profile>) => {
    if (row.display_name?.trim()) {
      writeGlobalPlayerNameToStorage(row.display_name.trim());
    }
    writeGlobalPlayerAvatarToStorage(normalizePlayerAvatar(row.avatar_config, row.id));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!configured || !session) {
      setProfile(null);
      return;
    }
    const row = await fetchOwnProfile(session.user.id);
    setProfile(row);
    if (row) applyProfileDefaults(row);
  }, [applyProfileDefaults, configured, session]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void getSession()
      .then((initial) => {
        if (cancelled) return;
        setSession(initial);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('AuthProvider getSession', err);
        if (cancelled) return;
        setSession(null);
        setLoading(false);
      });

    const unsubscribe = onAuthStateChange((next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    void refreshProfile();
  }, [refreshProfile, session]);

  const value = useMemo(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile,
      signInWithGoogle,
      signOut: async () => {
        await authSignOut();
        setProfile(null);
      },
    }),
    [configured, loading, profile, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
