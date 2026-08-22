import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWorkerStats } from '@/shared/cloudflare-api/worker-stats';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: { ok: boolean; json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  );
}

describe('getWorkerStats', () => {
  it('parses a successful response', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            accounts: [
              {
                workersInvocationsAdaptive: [
                  {
                    sum: { requests: 1000, errors: 5 },
                    quantiles: { cpuTimeP50: 2.1, cpuTimeP99: 40.7 },
                  },
                ],
              },
            ],
          },
        },
      }),
    });

    const stats = await getWorkerStats('tok', 'acct-1', 'my-worker');

    expect(stats).toEqual({ requests: 1000, errors: 5, cpuTimeP50Ms: 2.1, cpuTimeP99Ms: 40.7 });
  });

  it('returns null on a non-OK response', async () => {
    stubFetch({ ok: false });
    expect(await getWorkerStats('tok', 'acct-1', 'my-worker')).toBeNull();
  });

  it('returns null when there is no matching row', async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        data: { viewer: { accounts: [{ workersInvocationsAdaptive: [] }] } },
      }),
    });
    expect(await getWorkerStats('tok', 'acct-1', 'my-worker')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await getWorkerStats('tok', 'acct-1', 'my-worker')).toBeNull();
  });
});
