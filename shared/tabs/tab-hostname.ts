export function extractHttpHostname(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}

// Per-tabId hostname lookup for the background service worker, which reacts
// to arbitrary tabs via chrome.tabs.onActivated/onUpdated/onFocusChanged —
// unlike shared/worker-panel/live-tab-hostname.ts's queryLiveTabHostname,
// which only ever looks at "whichever tab is active in the current window"
// (the popup/sidepanel's use case). Reading tab.url for a non-active/
// background tab requires the `tabs` permission (already granted, see
// wxt.config.ts).
export async function getTabHostname(tabId: number): Promise<string | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return extractHttpHostname(tab.url);
  } catch {
    // Tab closed between the event firing and this resolving.
    return null;
  }
}
