import { describe, expect, it } from 'vitest';
import { matchesRoutePattern } from '@/shared/cloudflare-api/route-pattern-utils';

describe('matchesRoutePattern', () => {
  it('matches an exact host pattern', () => {
    expect(matchesRoutePattern('example.com/*', 'example.com')).toBe(true);
    expect(matchesRoutePattern('example.com/*', 'www.example.com')).toBe(false);
  });

  it('matches a wildcard subdomain pattern', () => {
    expect(matchesRoutePattern('*.example.com/*', 'www.example.com')).toBe(true);
    expect(matchesRoutePattern('*.example.com/*', 'a.b.example.com')).toBe(true);
  });

  it('does not match the bare apex against a wildcard subdomain pattern', () => {
    expect(matchesRoutePattern('*.example.com/*', 'example.com')).toBe(false);
  });

  it('matches a bare wildcard pattern against any hostname', () => {
    expect(matchesRoutePattern('*/*', 'anything.example.com')).toBe(true);
  });

  it('does not match an unrelated domain', () => {
    expect(matchesRoutePattern('example.com/*', 'example.org')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(matchesRoutePattern('Example.COM/*', 'example.com')).toBe(true);
  });
});
