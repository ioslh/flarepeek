import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
  APIConnectionError,
} from 'cloudflare';
import { classifyCloudflareError } from '@/shared/cloudflare-api/errors';

describe('classifyCloudflareError', () => {
  it('classifies authentication errors', () => {
    const error = new AuthenticationError(401, {}, 'error', new Headers());
    expect(classifyCloudflareError(error).kind).toBe('unauthenticated');
  });

  it('classifies permission errors', () => {
    const error = new PermissionDeniedError(403, {}, 'error', new Headers());
    expect(classifyCloudflareError(error).kind).toBe('forbidden');
  });

  it('classifies rate limit errors', () => {
    const error = new RateLimitError(429, {}, 'error', new Headers());
    expect(classifyCloudflareError(error).kind).toBe('rate-limited');
  });

  it('classifies connection errors', () => {
    const error = new APIConnectionError({ message: 'network down' });
    expect(classifyCloudflareError(error).kind).toBe('network');
  });

  it('falls back to unknown for anything else', () => {
    expect(classifyCloudflareError(new Error('boom')).kind).toBe('unknown');
  });
});
