import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveTabHostname } from '@/shared/worker-panel/use-live-tab-hostname';
import { queryLiveTabHostname } from '@/shared/worker-panel/live-tab-hostname';
import { consumeSidepanelHandoff } from '@/shared/worker-panel/sidepanel-handoff';

export interface PinnedHostname {
  // undefined = still initializing (checking for a handoff / querying the tab).
  hostname: string | null | undefined;
  liveHostname: string | null | undefined;
  isStale: boolean;
  switchToLive: () => void;
}

// The side panel deliberately does NOT follow tab switches — every glance at
// a different tab used to fire a full refetch chain (worker lookup,
// deployment, stats, bindings, errors...). It stays pinned to whichever site
// it was opened for; entrypoints/sidepanel/tab-changed-banner.tsx surfaces
// `isStale` so the user can opt into switching via `switchToLive`.
export function usePinnedHostname(): PinnedHostname {
  const liveHostname = useLiveTabHostname();
  const [pinned, setPinned] = useState<string | null | undefined>(undefined);
  const initStarted = useRef(false);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    (async () => {
      const handoff = await consumeSidepanelHandoff();
      if (handoff !== null) {
        setPinned(handoff);
        return;
      }
      setPinned(await queryLiveTabHostname());
    })();
  }, []);

  const switchToLive = useCallback(() => {
    if (liveHostname !== undefined) setPinned(liveHostname);
  }, [liveHostname]);

  return {
    hostname: pinned,
    liveHostname,
    isStale: pinned !== undefined && liveHostname !== undefined && liveHostname !== pinned,
    switchToLive,
  };
}
