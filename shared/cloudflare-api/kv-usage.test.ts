import { afterEach, describe, expect, it, vi } from 'vitest';
import { getKvNamespaceUsage } from '@/shared/cloudflare-api/kv-usage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: { ok: boolean; json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ text: async () => '', ...response })),
  );
}

describe('getKvNamespaceUsage', () => {
  it('parses a successful response', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            accounts: [
              {
                operations: [{ sum: { requests: 4200 } }],
                storage: [
                  { max: { keyCount: 128, byteCount: 65536 }, dimensions: { date: '2026-08-22' } },
                ],
              },
            ],
          },
        },
      }),
    });

    const usage = await getKvNamespaceUsage('tok', 'acct-1', 'ns-1');

    expect(usage).toEqual({ requests: 4200, storedKeys: 128, storedBytes: 65536 });
  });

  it('returns null on a non-OK response', async () => {
    stubFetch({ ok: false });
    expect(await getKvNamespaceUsage('tok', 'acct-1', 'ns-1')).toBeNull();
  });

  it('returns null when either row is missing', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: { viewer: { accounts: [{ operations: [], storage: [] }] } },
      }),
    });
    expect(await getKvNamespaceUsage('tok', 'acct-1', 'ns-1')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await getKvNamespaceUsage('tok', 'acct-1', 'ns-1')).toBeNull();
  });
});
