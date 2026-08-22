import { useEffect, useState } from 'react';
import { listBindings, type WorkerBinding } from '@/shared/cloudflare-api/bindings';
import { listQueues } from '@/shared/cloudflare-api/queues';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

export type BindingsState =
  | { status: 'loading' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'ready'; bindings: WorkerBinding[] };

export function useBindings(resolved: ResolvedWorker): BindingsState {
  const [state, setState] = useState<BindingsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const bindings = await listBindings(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
        );
        const withQueueIds = await attachQueueIds(resolved, bindings);
        if (!cancelled) setState({ status: 'ready', bindings: withQueueIds });
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

// Best-effort: if this lookup fails (e.g. the token doesn't have Queues Read
// after all) queue bindings just keep queueId: null, which
// bindingDashboardUrl degrades to the Queues list page for — not worth
// failing the whole bindings panel over a dashboard-link nicety.
async function attachQueueIds(
  resolved: ResolvedWorker,
  bindings: WorkerBinding[],
): Promise<WorkerBinding[]> {
  if (!bindings.some((binding) => binding.type === 'queue' && binding.queueName)) {
    return bindings;
  }

  try {
    const queues = await listQueues(resolved.client, resolved.worker.accountId);
    const idByName = new Map(queues.map((queue) => [queue.name, queue.id]));
    return bindings.map((binding) =>
      binding.type === 'queue' && binding.queueName
        ? { ...binding, queueId: idByName.get(binding.queueName) ?? null }
        : binding,
    );
  } catch {
    return bindings;
  }
}
