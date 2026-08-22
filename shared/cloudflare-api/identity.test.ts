import { describe, expect, it } from 'vitest';
import type Cloudflare from 'cloudflare';
import { getTokenEmail } from '@/shared/cloudflare-api/identity';

describe('getTokenEmail', () => {
  it('returns the email on success', async () => {
    const createClient = () =>
      ({
        user: { get: async () => ({ id: 'u1', email: 'me@example.com' }) },
      }) as unknown as Cloudflare;

    expect(await getTokenEmail('tok', createClient)).toBe('me@example.com');
  });

  it('returns null when the call fails (e.g. missing permission)', async () => {
    const createClient = () =>
      ({
        user: {
          get: async () => {
            throw new Error('forbidden');
          },
        },
      }) as unknown as Cloudflare;

    expect(await getTokenEmail('tok', createClient)).toBeNull();
  });

  it('returns null when the response is missing an email', async () => {
    const createClient = () =>
      ({ user: { get: async () => ({ id: 'u1' }) } }) as unknown as Cloudflare;

    expect(await getTokenEmail('tok', createClient)).toBeNull();
  });
});
