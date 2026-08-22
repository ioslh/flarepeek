import { useEffect, useState } from 'react';
import { queryLiveTabHostname } from '@/shared/worker-panel/live-tab-hostname';

// undefined = still loading, null = no active tab or a non-http(s) URL.
// Always reflects whichever tab is actually active right now — used directly
// by the popup (which is inherently scoped to "whatever tab is active when
// you open it"), and by the side panel only to detect staleness against its
// pinned hostname (see entrypoints/sidepanel/use-pinned-hostname.ts), not to
// drive its own content.
export function useLiveTabHostname(): string | null | undefined {
  const [hostname, setHostname] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      queryLiveTabHostname().then((value) => {
        if (!cancelled) setHostname(value);
      });
    };

    refresh();

    const handleUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.OnUpdatedInfo,
      tab: chrome.tabs.Tab,
    ) => {
      if (tab.active && changeInfo.url) refresh();
    };

    chrome.tabs.onActivated.addListener(refresh);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(refresh);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, []);

  return hostname;
}
