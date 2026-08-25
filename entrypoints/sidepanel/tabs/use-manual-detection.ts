import { useEffect, useState } from 'react';
import {
  getManualDetectionEnabled,
  watchManualDetectionEnabled,
} from '@/shared/storage/detection-mode-storage';

// undefined = still loading. Read-only mirror, same split as
// shared/storage/use-tokens.ts / token-storage.ts — writes go directly
// through setManualDetectionEnabled.
export function useManualDetectionEnabled(): boolean | undefined {
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    getManualDetectionEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });

    const unwatch = watchManualDetectionEnabled(setEnabled);
    return () => {
      cancelled = true;
      unwatch();
    };
  }, []);

  return enabled;
}
