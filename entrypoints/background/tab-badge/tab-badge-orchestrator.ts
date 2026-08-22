import { getTabHostname } from '@/shared/tabs/tab-hostname';
import { getTokens, watchTokens } from '@/shared/storage/token-storage';
import { computeTabBadgeState } from '@/shared/worker-panel/tab-badge-state';
import { renderBadgeForState } from '@/entrypoints/background/tab-badge/render-badge-for-state';

// tabId -> hostname last computed for it. Doubles as the recompute throttle:
// skips work whenever the active tab is still on a hostname already checked
// (repeated onUpdated firings during one navigation, in-page reloads,
// alt-tabbing between two already-checked tabs). A hostname-equality check is
// strictly stronger than a time-based TTL (never re-checks an unchanged
// hostname, not just "within N seconds") and needs no timer bookkeeping.
// Wiped whenever the service worker is evicted — harmless, worst case is one
// extra recompute on the next wake.
const lastComputedHostname = new Map<number, string | null>();

export function initTabBadgeOrchestrator(): void {
  chrome.tabs.onActivated.addListener(({ tabId }) => void refreshTabBadge(tabId));

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 'complete' filters out the many interim onUpdated firings per
    // navigation (loading/favicon/title); tab.active skips background tabs
    // entirely — computing for every open tab, not just the one the user is
    // looking at, would multiply Cloudflare API calls by tab count for no
    // benefit (a background tab's badge only needs to be correct by the time
    // it's switched to, which onActivated already covers).
    if (changeInfo.status !== 'complete' || !tab.active) return;
    void refreshTabBadge(tabId);
  });

  // Switching OS-level focus between two windows that are each already
  // sitting on some tab doesn't fire onActivated in either window — this is
  // what keeps a second window's badge correct when the user alt-tabs to it.
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    void chrome.tabs.query({ active: true, windowId }).then(([tab]) => {
      if (tab?.id !== undefined) void refreshTabBadge(tab.id);
    });
  });

  chrome.tabs.onRemoved.addListener((tabId) => lastComputedHostname.delete(tabId));

  // Adding/removing/editing a token changes the answer for whatever the user
  // is currently looking at, even though the hostname itself didn't change —
  // force bypasses the hostname-dedup above for exactly this case.
  watchTokens(() => void refreshActiveTabsInEveryWindow(true));

  // Covers cold start and post-install/update: defineBackground()'s callback
  // runs on every service worker wake for any reason, so a separate
  // chrome.runtime.onInstalled/onStartup listener isn't needed here.
  void refreshActiveTabsInEveryWindow();
}

async function refreshActiveTabsInEveryWindow(force = false): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true });
  await Promise.all(
    tabs
      .filter((tab): tab is chrome.tabs.Tab & { id: number } => tab.id !== undefined)
      .map((tab) => refreshTabBadge(tab.id, force)),
  );
}

async function refreshTabBadge(tabId: number, force = false): Promise<void> {
  const hostname = await getTabHostname(tabId);
  if (!force && lastComputedHostname.get(tabId) === hostname) return;
  lastComputedHostname.set(tabId, hostname);

  const tokens = await getTokens();
  const state = await computeTabBadgeState(hostname, tokens);
  await renderBadgeForState(tabId, state);
}
