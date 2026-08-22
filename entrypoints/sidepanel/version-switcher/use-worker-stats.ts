import { useEffect, useState } from 'react';
import { getWorkerStats, type WorkerStats } from '@/shared/cloudflare-api/worker-stats';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

// Nice-to-have, not core: any failure already resolves to null inside
// getWorkerStats, so this hook just reflects that — no error state to render.
export function useWorkerStats(resolved: ResolvedWorker | null): WorkerStats | null {
  const [stats, setStats] = useState<WorkerStats | null>(null);

  useEffect(() => {
    if (!resolved) {
      setStats(null);
      return;
    }

    let cancelled = false;
    getWorkerStats(
      resolved.token.token,
      resolved.worker.accountId,
      resolved.worker.scriptName,
    ).then((result) => {
      if (!cancelled) setStats(result);
    });

    return () => {
      cancelled = true;
    };
  }, [resolved]);

  return stats;
}
