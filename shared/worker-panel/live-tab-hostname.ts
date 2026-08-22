// One-shot read of the active tab's hostname. Shared by the reactive
// use-live-tab-hostname hook (popup, and the side panel's staleness check)
// and by the side panel's one-time pin initialization, which needs the same
// logic without subscribing to ongoing tab-change events.
export async function queryLiveTabHostname(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ? safeParseUrl(tab.url) : null;
  const isHttp = url?.protocol === 'http:' || url?.protocol === 'https:';
  return isHttp && url ? url.hostname : null;
}

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
