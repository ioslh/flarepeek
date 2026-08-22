import { afterEach, describe, expect, it, vi } from 'vitest';
import { getR2BucketUsage } from '@/shared/cloudflare-api/r2-usage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: { ok: boolean; json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ text: async () => '', ...response })),
  );
}

describe('getR2BucketUsage', () => {
  it('sums operations into Class A / Class B buckets and reads storage', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            accounts: [
              {
                operations: [
                  { sum: { requests: 50 }, dimensions: { actionType: 'PutObject' } },
                  { sum: { requests: 30 }, dimensions: { actionType: 'ListObjects' } },
                  { sum: { requests: 400 }, dimensions: { actionType: 'GetObject' } },
                  { sum: { requests: 10 }, dimensions: { actionType: 'HeadObject' } },
                ],
                storage: [
                  {
                    max: { objectCount: 1200, payloadSize: 5_000_000 },
                    dimensions: { datetime: '2026-08-22T00:00:00Z' },
                  },
                ],
              },
            ],
          },
        },
      }),
    });

    const usage = await getR2BucketUsage('tok', 'acct-1', 'my-bucket');

    expect(usage).toEqual({
      classAOperations: 80,
      classBOperations: 410,
      objectCount: 1200,
      storageBytes: 5_000_000,
    });
  });

  it('excludes unrecognized actionTypes from both classes', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            accounts: [
              {
                operations: [
                  { sum: { requests: 50 }, dimensions: { actionType: 'PutObject' } },
                  { sum: { requests: 999 }, dimensions: { actionType: 'SomeFutureAction' } },
                ],
                storage: [
                  {
                    max: { objectCount: 1, payloadSize: 1 },
                    dimensions: { datetime: '2026-08-22T00:00:00Z' },
                  },
                ],
              },
            ],
          },
        },
      }),
    });

    const usage = await getR2BucketUsage('tok', 'acct-1', 'my-bucket');

    expect(usage?.classAOperations).toBe(50);
    expect(usage?.classBOperations).toBe(0);
  });

  it('returns null on a non-OK response', async () => {
    stubFetch({ ok: false });
    expect(await getR2BucketUsage('tok', 'acct-1', 'my-bucket')).toBeNull();
  });

  it('returns null when the storage row is missing', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: { viewer: { accounts: [{ operations: [], storage: [] }] } },
      }),
    });
    expect(await getR2BucketUsage('tok', 'acct-1', 'my-bucket')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await getR2BucketUsage('tok', 'acct-1', 'my-bucket')).toBeNull();
  });
});
