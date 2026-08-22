import { describe, expect, it } from 'vitest';
import type Cloudflare from 'cloudflare';
import { AuthenticationError } from 'cloudflare';
import { resolveWorkerForHostname } from '@/shared/cloudflare-api/resolve-worker-for-hostname';
import type { StoredToken } from '@/shared/storage/token-storage';

function storedToken(id: string, token: string): StoredToken {
  return { id, token, label: id, email: null, createdAt: 0 };
}

const worker = {
  accountId: 'acct-1',
  zoneId: 'zone-1',
  zoneName: 'example.com',
  scriptName: 'my-worker',
};

function fakeClientFor(behaviors: Record<string, 'match' | 'no-match' | 'error'>) {
  return (apiToken: string): Cloudflare => {
    const behavior = behaviors[apiToken];
    return {
      zones: {
        list: async () => {
          if (behavior === 'error') throw new AuthenticationError(401, {}, 'error', new Headers());
          if (behavior === 'match') {
            return { result: [{ id: 'zone-1', name: 'example.com', account: { id: 'acct-1' } }] };
          }
          return { result: [] };
        },
      },
      workers: {
        domains: { list: async () => ({ result: [{ hostname: 'x', service: 'my-worker' }] }) },
        routes: { list: async () => ({ result: [] }) },
      },
    } as unknown as Cloudflare;
  };
}

describe('resolveWorkerForHostname', () => {
  it('returns the first token that matches', async () => {
    const tokens = [storedToken('a', 'token-a'), storedToken('b', 'token-b')];
    const createClient = fakeClientFor({ 'token-a': 'no-match', 'token-b': 'match' });

    const result = await resolveWorkerForHostname(tokens, 'my.example.com', createClient);

    expect(result).toEqual({ outcome: 'matched', tokenId: 'b', client: expect.anything(), worker });
  });

  it('returns no-match when every token finds nothing and none error', async () => {
    const tokens = [storedToken('a', 'token-a')];
    const createClient = fakeClientFor({ 'token-a': 'no-match' });

    const result = await resolveWorkerForHostname(tokens, 'other.example.com', createClient);

    expect(result).toEqual({ outcome: 'no-match' });
  });

  it('surfaces an error when every tried token fails outright', async () => {
    const tokens = [storedToken('a', 'token-a')];
    const createClient = fakeClientFor({ 'token-a': 'error' });

    const result = await resolveWorkerForHostname(tokens, 'broken.example.com', createClient);

    expect(result).toEqual({
      outcome: 'error',
      error: { kind: 'unauthenticated', cause: expect.anything() },
    });
  });

  it('keeps trying subsequent tokens after one errors', async () => {
    const tokens = [storedToken('a', 'token-a'), storedToken('b', 'token-b')];
    const createClient = fakeClientFor({ 'token-a': 'error', 'token-b': 'match' });

    const result = await resolveWorkerForHostname(tokens, 'recovers.example.com', createClient);

    expect(result.outcome).toBe('matched');
  });
});
