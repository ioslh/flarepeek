import { useEffect, useState } from 'react';
import { listRecentVersions, type RecentVersion } from '@/shared/cloudflare-api/versions';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';
import type { DeploymentVersionsState } from '@/shared/worker-panel/use-deployment-versions';

export type RecentVersionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'ready'; versions: RecentVersion[] };

// Recently uploaded versions that are NOT part of the current deployment —
// Version Overrides can't target these (see version-override.ts), so all
// they're good for is a quick jump to their preview URL.
export function useRecentVersions(
  resolved: ResolvedWorker | null,
  deployment: DeploymentVersionsState,
): RecentVersionsState {
  const [state, setState] = useState<RecentVersionsState>({ status: 'idle' });

  useEffect(() => {
    if (!resolved) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const versions = await listRecentVersions(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
        );
        if (cancelled) return;

        const deployedIds = new Set(
          deployment.status === 'ready' ? deployment.versions.map((v) => v.versionId) : [],
        );
        setState({
          status: 'ready',
          versions: versions.filter((version) => !deployedIds.has(version.id)),
        });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', kind: classifyCloudflareError(error).kind });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolved, deployment]);

  return state;
}
