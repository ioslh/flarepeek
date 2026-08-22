import type { CloudflareApiErrorKind } from '@/shared/cloudflare-api/errors';

// Returned as a literal so callers type-check against browser.i18n.getMessage's
// generated overloads (a closed union of known message keys, not `string`).
export function cloudflareErrorMessageKey(kind: CloudflareApiErrorKind) {
  switch (kind) {
    case 'unauthenticated':
      return 'versionSwitcherErrorUnauthenticated';
    case 'forbidden':
      return 'versionSwitcherErrorForbidden';
    case 'rate-limited':
      return 'versionSwitcherErrorRateLimited';
    case 'network':
      return 'versionSwitcherErrorNetwork';
    case 'unknown':
      return 'versionSwitcherErrorUnknown';
  }
}
