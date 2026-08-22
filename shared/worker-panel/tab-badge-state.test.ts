import { describe, expect, it } from 'vitest';
import type Cloudflare from 'cloudflare';
import { AuthenticationError } from 'cloudflare';
import { computeTabBadgeState } from '@/shared/worker-panel/tab-badge-state';
import type { StoredToken } from '@/shared/storage/token-storage';

function storedToken(id: string): StoredToken {
  return { id, token: `token-${id}`, label: id, email: null, createdAt: 0 };
}

// resolveWorkerForHostname (the function computeTabBadgeState delegates to)
// already has thorough behavioral coverage in resolve-worker-for-hostname.test.ts
// (ordering, first-match-wins, error propagation) — this only checks each of
// its outcomes maps to the right TabBadgeState.
function fakeClientFor(behavior: 'match' | 'no-match' | 'error') {
  return (): Cloudflare =>
    ({
      zones: {
        list: async () => {
          if (behavior === 'error') throw new AuthenticationError(401, {}, 'error', new Headers());
          if (behavior === 'match') {
            return { result: [{ id: 'zone-1', name: 'example.com', account: { id: 'acct-1' } }] };
          }
          return { result: [] };
        },
      },
      workers: {
        domains: { list: async () => ({ result: [{ hostname: 'x', service: 'my-worker' }] }) },
        routes: { list: async () => ({ result: [] }) },
      },
    }) as unknown as Cloudflare;
}

describe('computeTabBadgeState', () => {
  it('is not-applicable for a null hostname (non-http(s) tab)', async () => {
    expect(await computeTabBadgeState(null, [storedToken('a')])).toEqual({
      status: 'not-applicable',
    });
  });

  it('is no-token when there are no stored tokens', async () => {
    expect(await computeTabBadgeState('example.com', [])).toEqual({ status: 'no-token' });
  });

  it('is matched when a token resolves a Worker', async () => {
    const state = await computeTabBadgeState(
      'example.com',
      [storedToken('a')],
      fakeClientFor('match'),
    );
    expect(state).toEqual({ status: 'matched', workerName: 'my-worker', zoneName: 'example.com' });
  });

  it('is no-match when no token owns this hostname and none error', async () => {
    const state = await computeTabBadgeState(
      'example.com',
      [storedToken('a')],
      fakeClientFor('no-match'),
    );
    expect(state).toEqual({ status: 'no-match' });
  });

  it('is error with the classified kind when the token fails outright', async () => {
    const state = await computeTabBadgeState(
      'example.com',
      [storedToken('a')],
      fakeClientFor('error'),
    );
    expect(state).toEqual({ status: 'error', kind: 'unauthenticated' });
  });
});
