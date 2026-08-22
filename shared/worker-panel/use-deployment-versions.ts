import { useEffect, useState } from 'react';
import {
  getCurrentDeploymentVersions,
  type DeploymentVersion,
} from '@/shared/cloudflare-api/deployments';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

export type DeploymentVersionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'ready'; versions: DeploymentVersion[] };

// refreshKey has no meaning of its own — bump it (e.g. after a deployment
// write in use-deployment-actions.ts) to force a refetch without waiting for
// `resolved` to change.
export function useDeploymentVersions(
  resolved: ResolvedWorker | null,
  refreshKey = 0,
): DeploymentVersionsState {
  const [state, setState] = useState<DeploymentVersionsState>({ status: 'idle' });

  useEffect(() => {
    if (!resolved) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const versions = await getCurrentDeploymentVersions(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
        );
        if (!cancelled) setState({ status: 'ready', versions });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', kind: classifyCloudflareError(error).kind });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolved, refreshKey]);

  return state;
}
