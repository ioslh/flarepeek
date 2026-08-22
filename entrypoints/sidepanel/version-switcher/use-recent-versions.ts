import { useEffect, useState } from 'react';
import { listRecentVersions, type RecentVersion } from '@/shared/cloudflare-api/versions';
import { listDeployedVersionIds } from '@/shared/cloudflare-api/deployments';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';
import type { DeploymentVersionsState } from '@/shared/worker-panel/use-deployment-versions';

export interface RecentVersionEntry extends RecentVersion {
  // Whether this version id has ever shown up in the Worker's deployment
  // history (see listDeployedVersionIds) — a proxy for "Cloudflare's own
  // rollback feature would probably accept this", not a guarantee. A
  // version can still be false here and be rollback-eligible (deployment
  // history has its own limits we don't control), and true here doesn't
  // rule out a rollback failing for other reasons (e.g. a bound resource
  // being deleted since — not checked here).
  everDeployed: boolean;
}

export type RecentVersionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'ready'; versions: RecentVersionEntry[] };

// Recently uploaded versions that are NOT part of the current deployment —
// Version Overrides can't target these (see version-override.ts), so all
// they're good for is a quick jump to their preview URL, or a rollback if
// they're still in the deployment history.
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
        const [versions, deployedVersionIds] = await Promise.all([
          listRecentVersions(
            resolved.client,
            resolved.worker.accountId,
            resolved.worker.scriptName,
          ),
          listDeployedVersionIds(
            resolved.client,
            resolved.worker.accountId,
            resolved.worker.scriptName,
          ),
        ]);
        if (cancelled) return;

        const currentlyDeployedIds = new Set(
          deployment.status === 'ready' ? deployment.versions.map((v) => v.versionId) : [],
        );
        setState({
          status: 'ready',
          versions: versions
            .filter((version) => !currentlyDeployedIds.has(version.id))
            .map((version) => ({ ...version, everDeployed: deployedVersionIds.has(version.id) })),
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
