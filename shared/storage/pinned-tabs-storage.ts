import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

const pinnedTabSchema = z.object({
  hostname: z.string().min(1),
  forcedTokenId: z.string().nullable(),
});

export type PinnedTab = z.infer<typeof pinnedTabSchema>;

// Local only: same rationale as shared/storage/token-storage.ts — this is
// "which sites you're watching," not something to sync to a Google account.
const pinnedTabsItem = storage.defineItem<PinnedTab[]>('local:pinnedTabs', {
  fallback: [],
});

export async function getPinnedTabs(): Promise<PinnedTab[]> {
  const result = z.array(pinnedTabSchema).safeParse(await pinnedTabsItem.getValue());
  return result.success ? result.data : [];
}

// No-op if hostname is already pinned — the dynamic tab's pin button and the
// manual-add flow both funnel through this, and neither should be able to
// produce a duplicate entry.
export async function addPinnedTab(hostname: string): Promise<void> {
  const tabs = await getPinnedTabs();
  if (tabs.some((tab) => tab.hostname === hostname)) return;
  await pinnedTabsItem.setValue([...tabs, { hostname, forcedTokenId: null }]);
}

export async function removePinnedTab(hostname: string): Promise<void> {
  const tabs = await getPinnedTabs();
  await pinnedTabsItem.setValue(tabs.filter((tab) => tab.hostname !== hostname));
}

export async function setPinnedTabForcedToken(
  hostname: string,
  forcedTokenId: string | null,
): Promise<void> {
  const tabs = await getPinnedTabs();
  await pinnedTabsItem.setValue(
    tabs.map((tab) => (tab.hostname === hostname ? { ...tab, forcedTokenId } : tab)),
  );
}

export function watchPinnedTabs(callback: (tabs: PinnedTab[]) => void): () => void {
  return pinnedTabsItem.watch((value) => callback(value ?? []));
}
