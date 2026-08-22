import { useCallback, useState } from 'react';
import {
  rollbackToVersion,
  setDeploymentSplit,
  type DeploymentVersion,
} from '@/shared/cloudflare-api/deployments';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

type DeploymentActionState =
  { status: 'idle' } | { status: 'submitting' } | { status: 'error'; kind: CloudflareApiErrorKind };

// Writes real production traffic changes — see setDeploymentSplit/
// rollbackToVersion. `onSuccess` is used to trigger a refetch of the
// deployment list so the UI reflects the new split without reopening the
// popup.
export function useDeploymentActions(resolved: ResolvedWorker | null, onSuccess: () => void) {
  const [state, setState] = useState<DeploymentActionState>({ status: 'idle' });

  const rollback = useCallback(
    async (versionId: string) => {
      if (!resolved) return;
      setState({ status: 'submitting' });
      try {
        await rollbackToVersion(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
          versionId,
        );
        setState({ status: 'idle' });
        onSuccess();
      } catch (error) {
        setState({ status: 'error', kind: classifyCloudflareError(error).kind });
      }
    },
    [resolved, onSuccess],
  );

  const applySplit = useCallback(
    async (versions: DeploymentVersion[], message?: string | null) => {
      if (!resolved) return;
      setState({ status: 'submitting' });
      try {
        await setDeploymentSplit(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
          versions,
          message,
        );
        setState({ status: 'idle' });
        onSuccess();
      } catch (error) {
        setState({ status: 'error', kind: classifyCloudflareError(error).kind });
      }
    },
    [resolved, onSuccess],
  );

  return { state, rollback, applySplit };
}
