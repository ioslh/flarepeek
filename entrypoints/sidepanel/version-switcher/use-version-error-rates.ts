import { useEffect, useState } from 'react';
import {
  getVersionErrorRates,
  type VersionErrorRates,
} from '@/shared/cloudflare-api/version-error-rates';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

// null = unavailable (observability off, no traffic in the window, or the
// query failed). Supplementary information beside the deployment bar, so
// every failure mode collapses to "show nothing" rather than an error state
// — and never to a zero, which would read as "no errors".
export function useVersionErrorRates(
  resolved: ResolvedWorker | null,
  refreshKey = 0,
): VersionErrorRates | null {
  const [rates, setRates] = useState<VersionErrorRates | null>(null);

  useEffect(() => {
    if (!resolved) {
      setRates(null);
      return;
    }

    let cancelled = false;
    setRates(null);

    getVersionErrorRates(resolved.client, resolved.worker.accountId, resolved.worker.scriptName)
      .then((result) => {
        if (!cancelled) setRates(result);
      })
      .catch(() => {
        if (!cancelled) setRates(null);
      });

    return () => {
      cancelled = true;
    };
  }, [resolved, refreshKey]);

  return rates;
}
