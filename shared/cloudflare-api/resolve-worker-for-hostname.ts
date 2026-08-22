import Cloudflare from 'cloudflare';
import {
  findWorkerForHostname,
  type WorkerForHostname,
} from '@/shared/cloudflare-api/worker-lookup';
import {
  classifyCloudflareError,
  type ClassifiedCloudflareError,
} from '@/shared/cloudflare-api/errors';
import { getCachedTokenId, setCachedTokenId } from '@/shared/storage/site-token-cache';
import type { StoredToken } from '@/shared/storage/token-storage';

export type ResolveWorkerResult =
  | { outcome: 'matched'; tokenId: string; client: Cloudflare; worker: WorkerForHostname }
  | { outcome: 'no-match' }
  | { outcome: 'error'; error: ClassifiedCloudflareError };

// Tries each stored token against this hostname until one resolves a Worker,
// so the user never has to pick "which identity am I on this site with" —
// the site tells us. The token that last succeeded for this hostname (see
// shared/storage/site-token-cache.ts) is tried first, so repeat visits skip
// straight to the right token instead of re-probing every stored one.
//
// If every token that gets tried fails outright (bad token, no permission,
// network), that failure is surfaced rather than a generic "no match" — a
// user whose only token expired should see "token invalid", not silence.
export async function resolveWorkerForHostname(
  tokens: StoredToken[],
  hostname: string,
  createClient: (apiToken: string) => Cloudflare = (apiToken) => new Cloudflare({ apiToken }),
): Promise<ResolveWorkerResult> {
  const cachedTokenId = await getCachedTokenId(hostname);
  const ordered = cachedTokenId
    ? [
        ...tokens.filter((token) => token.id === cachedTokenId),
        ...tokens.filter((token) => token.id !== cachedTokenId),
      ]
    : tokens;

  let firstError: ClassifiedCloudflareError | null = null;

  for (const stored of ordered) {
    const client = createClient(stored.token);

    try {
      const worker = await findWorkerForHostname(client, hostname);
      if (worker) {
        await setCachedTokenId(hostname, stored.id);
        return { outcome: 'matched', tokenId: stored.id, client, worker };
      }
    } catch (error) {
      firstError ??= classifyCloudflareError(error);
    }
  }

  return firstError ? { outcome: 'error', error: firstError } : { outcome: 'no-match' };
}
