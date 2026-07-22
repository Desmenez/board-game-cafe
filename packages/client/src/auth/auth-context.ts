import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { ProfileRow } from './profileApi';

export interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  /** Increments when guest local name/avatar are restored after logout. */
  guestLocalEpoch: number;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
