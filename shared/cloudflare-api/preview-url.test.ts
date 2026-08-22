import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { buildVersionPreviewUrl, getPreviewUrlConfig } from '@/shared/cloudflare-api/preview-url';

function fakeClient(options: { subdomain: string; previewsEnabled: boolean }): Cloudflare {
  return {
    workers: {
      subdomains: { get: vi.fn(async () => ({ subdomain: options.subdomain })) },
      scripts: {
        subdomain: {
          get: vi.fn(async () => ({ enabled: true, previews_enabled: options.previewsEnabled })),
        },
      },
    },
  } as unknown as Cloudflare;
}

describe('getPreviewUrlConfig', () => {
  it('returns the account subdomain and enabled flag', async () => {
    const client = fakeClient({ subdomain: 'my-account', previewsEnabled: true });
    const config = await getPreviewUrlConfig(client, 'acct-1', 'my-worker');

    expect(config).toEqual({
      enabled: true,
      scriptName: 'my-worker',
      accountSubdomain: 'my-account',
    });
  });

  it('reports disabled preview URLs', async () => {
    const client = fakeClient({ subdomain: 'my-account', previewsEnabled: false });
    const config = await getPreviewUrlConfig(client, 'acct-1', 'my-worker');

    expect(config?.enabled).toBe(false);
  });
});

describe('buildVersionPreviewUrl', () => {
  it('builds a URL from the first 8 characters of the version id', () => {
    const config = { enabled: true, scriptName: 'my-worker', accountSubdomain: 'my-account' };
    const url = buildVersionPreviewUrl(config, '605ede8e-1234-4abc-8def-000000000000');

    expect(url).toBe('https://605ede8e-my-worker.my-account.workers.dev');
  });

  it('returns null when preview URLs are disabled', () => {
    const config = { enabled: false, scriptName: 'my-worker', accountSubdomain: 'my-account' };
    expect(buildVersionPreviewUrl(config, '605ede8e-1234-4abc-8def-000000000000')).toBeNull();
  });
});
