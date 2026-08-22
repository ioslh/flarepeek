import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { findZoneForHostname } from '@/shared/cloudflare-api/zones';

function fakeClient(byName: Record<string, unknown[]>): Cloudflare {
  return {
    zones: {
      list: vi.fn(async ({ name }: { name: string }) => ({ result: byName[name] ?? [] })),
    },
  } as unknown as Cloudflare;
}

describe('findZoneForHostname', () => {
  it('resolves an apex hostname directly', async () => {
    const client = fakeClient({
      'example.com': [{ id: 'zone-1', name: 'example.com', account: { id: 'acct-1' } }],
    });

    expect(await findZoneForHostname(client, 'example.com')).toEqual({
      zoneId: 'zone-1',
      zoneName: 'example.com',
      accountId: 'acct-1',
    });
  });

  it('falls back to progressively shorter suffixes for a subdomain', async () => {
    const client = fakeClient({
      'example.com': [{ id: 'zone-1', name: 'example.com', account: { id: 'acct-1' } }],
    });

    expect(await findZoneForHostname(client, 'api.staging.example.com')).toEqual({
      zoneId: 'zone-1',
      zoneName: 'example.com',
      accountId: 'acct-1',
    });
  });

  it('returns null when no candidate suffix matches a zone', async () => {
    const client = fakeClient({});
    expect(await findZoneForHostname(client, 'api.example.com')).toBeNull();
  });

  it('ignores a zone result missing an account id', async () => {
    const client = fakeClient({
      'example.com': [{ id: 'zone-1', name: 'example.com' }],
    });

    expect(await findZoneForHostname(client, 'example.com')).toBeNull();
  });
});
