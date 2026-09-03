import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import type { User } from '@supabase/supabase-js';
import { admitVerifiedSession, appAuthAdmin } from '../src/auth/index.js';

afterEach(() => {
  mock.restoreAll();
});

function sessionFor(sessionKey: string, expiresAt: Date | null = new Date(Date.now() + 60_000)) {
  return {
    userId: 'user-1',
    user: { id: 'user-1' } as User,
    sessionKey,
    expiresAt,
  };
}

/**
 * Simulate a mirrored app_auth_sessions row. Production used to store access-token
 * exp here; admission must ignore that column and only honor revoked_at.
 */
function mockMirroredSession(row: {
  revoked_at: string | null;
  /** Intentionally unused by admit — proves stale JWT-exp rows no longer block. */
  expires_at?: string | null;
}): void {
  mock.method(appAuthAdmin, 'getSupabaseAdmin', () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { revoked_at: row.revoked_at },
            error: null,
          }),
        }),
      }),
    }),
  }));
}

test('admitVerifiedSession accepts a mirrored row with a past expires_at when not revoked', async () => {
  mockMirroredSession({
    revoked_at: null,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  });
  const ok = await admitVerifiedSession(sessionFor('sticky-session'));
  assert.equal(ok, true);
});

test('admitVerifiedSession rejects an explicitly revoked mirrored session', async () => {
  mockMirroredSession({
    revoked_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  const ok = await admitVerifiedSession(sessionFor('revoked-session'));
  assert.equal(ok, false);
});

test('admitVerifiedSession rejects when the live JWT is already expired', async () => {
  mockMirroredSession({ revoked_at: null });
  const ok = await admitVerifiedSession(
    sessionFor('expired-jwt', new Date(Date.now() - 1_000)),
  );
  assert.equal(ok, false);
});
