import { afterEach, describe, expect, it, vi } from 'vitest';
import { getD1DatabaseUsage } from '@/shared/cloudflare-api/d1-usage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: { ok: boolean; json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ text: async () => '', ...response })),
  );
}

describe('getD1DatabaseUsage', () => {
  it('parses a successful response with storage', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            accounts: [
              {
                analytics: [{ sum: { readQueries: 900, writeQueries: 40 } }],
                storage: [
                  { max: { databaseSizeBytes: 1048576 }, dimensions: { date: '2026-08-22' } },
                ],
              },
            ],
          },
        },
      }),
    });

    const usage = await getD1DatabaseUsage('tok', 'acct-1', 'db-1');

    expect(usage).toEqual({ readQueries: 900, writeQueries: 40, storageBytes: 1048576 });
  });

  it('still returns query counts when the storage field is missing/unrecognized', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            accounts: [
              {
                analytics: [{ sum: { readQueries: 900, writeQueries: 40 } }],
                storage: [{ max: { someUnexpectedField: 123 } }],
              },
            ],
          },
        },
      }),
    });

    const usage = await getD1DatabaseUsage('tok', 'acct-1', 'db-1');

    expect(usage).toEqual({ readQueries: 900, writeQueries: 40, storageBytes: null });
  });

  it('returns null on a non-OK response', async () => {
    stubFetch({ ok: false });
    expect(await getD1DatabaseUsage('tok', 'acct-1', 'db-1')).toBeNull();
  });

  it('returns null when the analytics row is missing', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: { viewer: { accounts: [{ analytics: [], storage: [] }] } },
      }),
    });
    expect(await getD1DatabaseUsage('tok', 'acct-1', 'db-1')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await getD1DatabaseUsage('tok', 'acct-1', 'db-1')).toBeNull();
  });
});
