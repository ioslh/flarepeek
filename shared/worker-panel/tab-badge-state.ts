import type Cloudflare from 'cloudflare';
import { resolveWorkerForHostname } from '@/shared/cloudflare-api/resolve-worker-for-hostname';
import type { CloudflareApiErrorKind } from '@/shared/cloudflare-api/errors';
import type { StoredToken } from '@/shared/storage/token-storage';

// Headless twin of use-worker-lookup.ts's WorkerLookupState, for the
// background toolbar-icon badge — no 'loading' state, since the icon just
// keeps showing whatever it last showed while a check is in flight (adding a
// spinner state for a check that usually resolves in well under a second
// isn't worth the extra state).
//
// 'no-match' and 'not-applicable' are deliberately the same "nothing to show"
// bucket downstream (see tab-badge-visual.ts) and must stay that way: the
// Cloudflare API can't tell "this domain has no zone at all" apart from
// "this domain has a zone, but not one any stored token's account can see" —
// both come back as resolveWorkerForHostname's 'no-match' outcome. Only an
// actual failed API call (bad token, no permission, network, rate limit)
// should ever read as an error/no-access state.
export type TabBadgeState =
  | { status: 'not-applicable' }
  | { status: 'no-token' }
  | { status: 'no-match' }
  | { status: 'matched'; workerName: string; zoneName: string }
  | { status: 'error'; kind: CloudflareApiErrorKind };

export async function computeTabBadgeState(
  hostname: string | null,
  tokens: StoredToken[],
  createClient?: (apiToken: string) => Cloudflare,
): Promise<TabBadgeState> {
  if (hostname === null) return { status: 'not-applicable' };
  if (tokens.length === 0) return { status: 'no-token' };

  const result = await resolveWorkerForHostname(tokens, hostname, createClient);
  if (result.outcome === 'matched') {
    return {
      status: 'matched',
      workerName: result.worker.scriptName,
      zoneName: result.worker.zoneName,
    };
  }
  if (result.outcome === 'error') {
    return { status: 'error', kind: result.error.kind };
  }
  return { status: 'no-match' };
}
