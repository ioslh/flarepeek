import { describe, expect, it } from 'vitest';
import { getCachedTokenId, setCachedTokenId } from '@/shared/storage/site-token-cache';

describe('site-token-cache', () => {
  it('returns null for an unseen hostname', async () => {
    expect(await getCachedTokenId('example.com')).toBeNull();
  });

  it('round-trips a cached token id per hostname', async () => {
    await setCachedTokenId('a.example.com', 'token-1');
    await setCachedTokenId('b.example.com', 'token-2');

    expect(await getCachedTokenId('a.example.com')).toBe('token-1');
    expect(await getCachedTokenId('b.example.com')).toBe('token-2');
  });

  it('overwrites the cached token id for a hostname', async () => {
    await setCachedTokenId('example.com', 'token-1');
    await setCachedTokenId('example.com', 'token-2');

    expect(await getCachedTokenId('example.com')).toBe('token-2');
  });
});
