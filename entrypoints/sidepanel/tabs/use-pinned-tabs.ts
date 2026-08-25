import { useEffect, useState } from 'react';
import {
  getPinnedTabs,
  watchPinnedTabs,
  type PinnedTab,
} from '@/shared/storage/pinned-tabs-storage';

// undefined = still loading. Read-only mirror of storage — writes go
// directly through shared/storage/pinned-tabs-storage.ts's functions, same
// split as shared/storage/use-tokens.ts / token-storage.ts.
export function usePinnedTabs(): PinnedTab[] | undefined {
  const [tabs, setTabs] = useState<PinnedTab[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    getPinnedTabs().then((value) => {
      if (!cancelled) setTabs(value);
    });

    const unwatch = watchPinnedTabs(setTabs);
    return () => {
      cancelled = true;
      unwatch();
    };
  }, []);

  return tabs;
}
