import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

const cacheSchema = z.record(z.string(), z.string());

// hostname -> id of the StoredToken that last successfully resolved a Worker
// for it. Lets popup skip straight to the right token instead of re-trying
// every stored token on each open. Safe to lose (worst case: re-probes).
const cacheItem = storage.defineItem<Record<string, string>>('local:siteTokenCache', {
  fallback: {},
});

export async function getCachedTokenId(hostname: string): Promise<string | null> {
  const raw = await cacheItem.getValue();
  const parsed = cacheSchema.safeParse(raw);
  return parsed.success ? (parsed.data[hostname] ?? null) : null;
}

export async function setCachedTokenId(hostname: string, tokenId: string): Promise<void> {
  const cache = await cacheItem.getValue();
  await cacheItem.setValue({ ...cache, [hostname]: tokenId });
}
