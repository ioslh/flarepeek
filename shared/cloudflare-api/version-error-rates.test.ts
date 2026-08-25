import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { getVersionErrorRates } from '@/shared/cloudflare-api/version-error-rates';

const VERSION_KEY = '$workers.scriptVersion.id';

function aggregates(rows: Array<[string, number]>) {
  return {
    calculations: [
      {
        aggregates: rows.map(([versionId, count]) => ({
          groups: { [VERSION_KEY]: versionId },
          count,
        })),
      },
    ],
  };
}

// The two queries are told apart by the error filter the second one adds.
function fakeClient(totals: Array<[string, number]>, errors: Array<[string, number]>) {
  const query = vi.fn(async (params: { parameters?: { filters?: Array<{ key: string }> } }) => {
    const isErrorQuery = (params.parameters?.filters ?? []).some(
      (filter) => filter.key === '$metadata.error',
    );
    return aggregates(isErrorQuery ? errors : totals);
  });

  return {
    client: {
      workers: { observability: { telemetry: { query } } },
    } as unknown as Cloudflare,
    query,
  };
}

describe('getVersionErrorRates', () => {
  it('divides errors by invocations per version', async () => {
    const { client } = fakeClient(
      [
        ['v1', 1000],
        ['v2', 500],
      ],
      [
        ['v1', 1],
        ['v2', 31],
      ],
    );

    const result = await getVersionErrorRates(client, 'acct-1', 'my-worker');
    expect(result?.byVersion).toEqual([
      { versionId: 'v1', errorRate: 0.1 },
      { versionId: 'v2', errorRate: 6.2 },
    ]);
  });

  it('reports a zero rate for a version with traffic but no errors', async () => {
    const { client } = fakeClient([['v1', 400]], []);
    const result = await getVersionErrorRates(client, 'acct-1', 'my-worker');
    expect(result?.byVersion).toEqual([{ versionId: 'v1', errorRate: 0 }]);
  });

  it('surfaces events carrying no version separately instead of attributing them', async () => {
    const { client } = fakeClient(
      [
        ['v1', 750],
        ['', 250],
      ],
      [['v1', 15]],
    );

    const result = await getVersionErrorRates(client, 'acct-1', 'my-worker');
    // v1's own rate is computed from v1's own traffic only — the 250
    // unattributed invocations must not dilute or inflate it.
    expect(result?.byVersion).toEqual([{ versionId: 'v1', errorRate: 2 }]);
    expect(result?.unattributedRate).toBe(25);
  });

  it('returns null when the window has no invocations at all', async () => {
    const { client } = fakeClient([], []);
    expect(await getVersionErrorRates(client, 'acct-1', 'my-worker')).toBeNull();
  });

  it('returns null rather than throwing when the query fails', async () => {
    const client = {
      workers: {
        observability: {
          telemetry: {
            query: vi.fn(async () => {
              throw new Error('observability disabled');
            }),
          },
        },
      },
    } as unknown as Cloudflare;

    expect(await getVersionErrorRates(client, 'acct-1', 'my-worker')).toBeNull();
  });

  it('returns null when the response shape is not what we expect', async () => {
    const client = {
      workers: {
        observability: { telemetry: { query: vi.fn(async () => ({ unexpected: true })) } },
      },
    } as unknown as Cloudflare;

    expect(await getVersionErrorRates(client, 'acct-1', 'my-worker')).toBeNull();
  });
});
