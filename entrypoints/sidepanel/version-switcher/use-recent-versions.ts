import { useEffect, useState } from 'react';
import { listRecentVersions, type RecentVersion } from '@/shared/cloudflare-api/versions';
import { listDeployedVersionIds } from '@/shared/cloudflare-api/deployments';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

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

// Every recently-uploaded version — deliberately NOT filtered to "not in the
// current deployment" here anymore (that used to happen inside this hook).
// version-switcher.tsx now does that filtering itself, since it also reuses
// this same fetch to enrich the *currently deployed* versions' tag/message
// for VersionRow/DeploymentSplitControl — filtering here would throw that
// data away before it could be reused.
export function useRecentVersions(resolved: ResolvedWorker | null): RecentVersionsState {
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

        setState({
          status: 'ready',
          versions: versions.map((version) => ({
            ...version,
            everDeployed: deployedVersionIds.has(version.id),
          })),
        });
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
