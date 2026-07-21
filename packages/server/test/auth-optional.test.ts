import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Guest-only / no-Supabase regression: auth helpers must not throw when env is unset.
 */
describe('optional supabase auth', () => {
  it('isAuthConfigured is false without env', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Fresh import after env clear — module caches isAuthConfigured reading process.env at call time
    const { isAuthConfigured, verifyAccessToken, getSupabaseAdmin } = await import('../src/auth/index.js');
    assert.equal(isAuthConfigured(), false);
    assert.equal(getSupabaseAdmin(), null);
    assert.equal(await verifyAccessToken('anything'), null);
    assert.equal(await verifyAccessToken(undefined), null);
  });
});
