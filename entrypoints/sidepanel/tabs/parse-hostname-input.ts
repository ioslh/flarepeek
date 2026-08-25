import { extractHttpHostname } from '@/shared/tabs/tab-hostname';

// A bare hostname, permissively: at least one dot, no whitespace, no
// scheme/path characters — good enough to catch obvious typos ("localhost"
// intentionally doesn't match; nobody's pinning a Cloudflare Worker there).
const BARE_HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

// Accepts either a full URL (with or without scheme) or a bare hostname
// pasted/typed into the manual "add tab" input, and returns just the
// hostname — or null if it's neither. Always routes through
// extractHttpHostname (the same http(s)-only URL parsing the background
// badge orchestrator uses) by prefixing a scheme when the input doesn't
// have one, so "example.com" and "https://example.com" resolve the same
// way; the extra regex check afterward rejects single-word non-dotted input
// that would otherwise parse as a syntactically "valid" but meaningless
// hostname (e.g. "https://asdf").
export function parseHostnameInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const hostname = extractHttpHostname(withScheme);
  if (!hostname) return null;

  return BARE_HOSTNAME_RE.test(hostname) ? hostname.toLowerCase() : null;
}
