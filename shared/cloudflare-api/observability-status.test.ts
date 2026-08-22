import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { getObservabilityStatus } from '@/shared/cloudflare-api/observability-status';

function fakeClient(settings: unknown): Cloudflare {
  return {
    workers: {
      scripts: {
        settings: { get: vi.fn(async () => settings) },
      },
    },
  } as unknown as Cloudflare;
}

describe('getObservabilityStatus', () => {
  it('reports enabled when observability and logs are both on', async () => {
    const client = fakeClient({ observability: { enabled: true, logs: { enabled: true } } });
    expect(await getObservabilityStatus(client, 'acct-1', 'my-worker')).toBe('enabled');
  });

  it('reports disabled when observability itself is off', async () => {
    const client = fakeClient({ observability: { enabled: false } });
    expect(await getObservabilityStatus(client, 'acct-1', 'my-worker')).toBe('disabled');
  });

  it('reports disabled when observability is missing entirely', async () => {
    const client = fakeClient({});
    expect(await getObservabilityStatus(client, 'acct-1', 'my-worker')).toBe('disabled');
  });

  it('reports disabled when observability is on but logs are off', async () => {
    const client = fakeClient({ observability: { enabled: true, logs: { enabled: false } } });
    expect(await getObservabilityStatus(client, 'acct-1', 'my-worker')).toBe('disabled');
  });

  it('reports unknown when the call throws', async () => {
    const client = {
      workers: {
        scripts: {
          settings: {
            get: vi.fn(async () => {
              throw new Error('forbidden');
            }),
          },
        },
      },
    } as unknown as Cloudflare;

    expect(await getObservabilityStatus(client, 'acct-1', 'my-worker')).toBe('unknown');
  });
});
