import { useEffect, useState } from 'react';
import type Cloudflare from 'cloudflare';
import { resolveWorkerForHostname } from '@/shared/cloudflare-api/resolve-worker-for-hostname';
import type { WorkerForHostname } from '@/shared/cloudflare-api/worker-lookup';
import type { CloudflareApiErrorKind } from '@/shared/cloudflare-api/errors';
import { watchTokens, type StoredToken } from '@/shared/storage/token-storage';

export interface ResolvedWorker {
  worker: WorkerForHostname;
  client: Cloudflare;
  token: StoredToken;
}

export type WorkerLookupState =
  | { status: 'loading' }
  | { status: 'no-token' }
  | { status: 'not-a-worker-site' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'ready'; resolved: ResolvedWorker };

// Module-level, not React state: survives across the side panel's pin
// switches within one session (that's the whole point — re-pinning to a
// hostname you've already resolved should be instant, not another
// multi-token trial). Only successful "auto" resolutions are cached; a
// forced-token lookup is always an explicit, deliberate override and should
// hit the network. Cleared per-hostname by clearWorkerLookupCache (the side
// panel's manual refresh button) or entirely by resetWorkerLookupCache.
const resolvedCache = new Map<string, ResolvedWorker>();

export function clearWorkerLookupCache(hostname: string): void {
  resolvedCache.delete(hostname);
}

export function resetWorkerLookupCache(): void {
  resolvedCache.clear();
}

// A cached entry pins a specific token's `client` to a hostname — if that
// token gets deleted (or a new one is added that should now win instead),
// the cache would otherwise keep serving the stale resolution until a
// manual refresh. This subscription runs once at module load (the cache
// itself is module-level, not React state, so this belongs alongside it
// rather than inside the hook), and errs on the side of invalidating
// everything rather than figuring out which hostnames a given token change
// actually affects — token add/remove is rare enough that over-invalidating
// costs a few extra lookups, not a real problem.
watchTokens(() => resetWorkerLookupCache());

// Tries every stored token against `hostname` (see resolveWorkerForHostname)
// so the caller never has to know in advance which identity owns this site.
// Pass `forcedTokenId` to pin the lookup to one specific token instead — used
// by the side panel's token switcher override. Bump `refreshKey` to force a
// re-fetch even when a cache entry exists (e.g. a manual refresh action).
export function useWorkerLookup(
  hostname: string | null | undefined,
  tokens: StoredToken[] | undefined,
  forcedTokenId?: string | null,
  refreshKey = 0,
): WorkerLookupState {
  const [state, setState] = useState<WorkerLookupState>({ status: 'loading' });

  useEffect(() => {
    if (hostname === undefined || tokens === undefined) {
      setState({ status: 'loading' });
      return;
    }
    if (hostname === null) {
      setState({ status: 'not-a-worker-site' });
      return;
    }
    if (tokens.length === 0) {
      setState({ status: 'no-token' });
      return;
    }

    if (!forcedTokenId) {
      const cached = resolvedCache.get(hostname);
      if (cached) {
        setState({ status: 'ready', resolved: cached });
        return;
      }
    }

    const candidates = forcedTokenId
      ? tokens.filter((token) => token.id === forcedTokenId)
      : tokens;

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const result = await resolveWorkerForHostname(candidates, hostname);
      if (cancelled) return;

      if (result.outcome === 'matched') {
        const token = tokens.find((t) => t.id === result.tokenId);
        if (!token) return;
        const resolved: ResolvedWorker = { worker: result.worker, client: result.client, token };
        if (!forcedTokenId) resolvedCache.set(hostname, resolved);
        setState({ status: 'ready', resolved });
        return;
      }

      if (result.outcome === 'error') {
        setState({ status: 'error', kind: result.error.kind });
        return;
      }

      setState({ status: 'not-a-worker-site' });
    })();

    return () => {
      cancelled = true;
    };
  }, [hostname, tokens, forcedTokenId, refreshKey]);

  return state;
}
