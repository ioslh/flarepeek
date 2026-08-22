// Matches a Cloudflare Worker route pattern's host segment (the part before the
// first "/") against a hostname. Deliberately does not build a regex from the
// pattern: routes only ever use "*" as a bare wildcard or a "*." subdomain
// prefix, so direct string comparisons cover every real pattern shape.
export function matchesRoutePattern(pattern: string, hostname: string): boolean {
  const host = (pattern.split('/')[0] ?? '').toLowerCase();
  const normalizedHostname = hostname.toLowerCase();

  if (host === '*') return true;

  if (host.startsWith('*.')) {
    const suffix = host.slice(2);
    return normalizedHostname !== suffix && normalizedHostname.endsWith(`.${suffix}`);
  }

  return normalizedHostname === host;
}
