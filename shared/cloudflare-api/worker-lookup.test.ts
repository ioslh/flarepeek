import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { findWorkerForHostname } from '@/shared/cloudflare-api/worker-lookup';

const zone = { id: 'zone-1', name: 'example.com', account: { id: 'acct-1' } };

function fakeClient(options: { domains?: unknown[]; routes?: unknown[] }): Cloudflare {
  return {
    zones: {
      list: vi.fn(async () => ({ result: [zone] })),
    },
    workers: {
      domains: {
        list: vi.fn(async () => ({ result: options.domains ?? [] })),
      },
      routes: {
        list: vi.fn(async () => ({ result: options.routes ?? [] })),
      },
    },
  } as unknown as Cloudflare;
}

describe('findWorkerForHostname', () => {
  it('prefers a Custom Domain match over routes', async () => {
    const client = fakeClient({
      domains: [{ hostname: 'app.example.com', service: 'domain-worker' }],
      routes: [{ pattern: 'app.example.com/*', script: 'route-worker' }],
    });

    const result = await findWorkerForHostname(client, 'app.example.com');
    expect(result?.scriptName).toBe('domain-worker');
  });

  it('falls back to the most specific matching route', async () => {
    const client = fakeClient({
      routes: [
        { pattern: '*.example.com/*', script: 'wildcard-worker' },
        { pattern: 'app.example.com/*', script: 'exact-worker' },
      ],
    });

    const result = await findWorkerForHostname(client, 'app.example.com');
    expect(result?.scriptName).toBe('exact-worker');
  });

  it('returns null when nothing matches', async () => {
    const client = fakeClient({});
    expect(await findWorkerForHostname(client, 'app.example.com')).toBeNull();
  });
});
