import { useEffect, useState } from 'react';
import { getRecentErrors, type RecentErrorEvent } from '@/shared/cloudflare-api/recent-errors';
import { getObservabilityStatus } from '@/shared/cloudflare-api/observability-status';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

export type RecentErrorsState =
  | { status: 'loading' }
  | { status: 'observability-disabled' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'ready'; errors: RecentErrorEvent[] };

export function useRecentErrors(resolved: ResolvedWorker): RecentErrorsState {
  const [state, setState] = useState<RecentErrorsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      // Checked first and awaited before the errors query: a Worker with
      // Observability/Logs off always returns zero events, which would
      // otherwise render as a false "no errors" instead of "not captured".
      const observability = await getObservabilityStatus(
        resolved.client,
        resolved.worker.accountId,
        resolved.worker.scriptName,
      );
      if (cancelled) return;

      if (observability === 'disabled') {
        setState({ status: 'observability-disabled' });
        return;
      }

      try {
        const errors = await getRecentErrors(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
        );
        if (!cancelled) setState({ status: 'ready', errors });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', kind: classifyCloudflareError(error).kind });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolved]);

  return state;
}
