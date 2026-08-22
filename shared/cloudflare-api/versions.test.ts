import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { listRecentVersions } from '@/shared/cloudflare-api/versions';

function fakeClient(items: unknown[]): Cloudflare {
  return {
    workers: {
      scripts: {
        versions: {
          list: vi.fn(async () => ({ result: { items } })),
        },
      },
    },
  } as unknown as Cloudflare;
}

describe('listRecentVersions', () => {
  it('maps and sorts versions newest first', async () => {
    const client = fakeClient([
      { id: 'v1', metadata: { created_on: '2026-08-20T00:00:00Z', author_email: 'a@x.com' } },
      { id: 'v2', metadata: { created_on: '2026-08-22T00:00:00Z', author_email: 'b@x.com' } },
      { id: 'v3', metadata: { created_on: '2026-08-21T00:00:00Z' } },
    ]);

    const versions = await listRecentVersions(client, 'acct-1', 'my-worker');

    expect(versions.map((v) => v.id)).toEqual(['v2', 'v3', 'v1']);
    expect(versions.at(2)).toEqual({
      id: 'v1',
      createdOn: '2026-08-20T00:00:00Z',
      authorEmail: 'a@x.com',
    });
    expect(versions.at(1)?.authorEmail).toBeNull();
  });

  it('returns an empty array when there are no versions', async () => {
    const client = fakeClient([]);
    expect(await listRecentVersions(client, 'acct-1', 'my-worker')).toEqual([]);
  });
});
