import { useEffect, useState } from 'react';
import { listRecentVersions, type RecentVersion } from '@/shared/cloudflare-api/versions';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

export type RecentVersionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'ready'; versions: RecentVersion[] };

// Every recently-uploaded version, with the tag/message/author/timestamp that
// make a bare hash identifiable. Deliberately NOT filtered to "not currently
// deployed": the same fetch also supplies the names for the versions that
// *are* live, so filtering here would throw that away.
//
// Both entrypoints use it — the sidepanel to populate the version pickers,
// the popup purely to put names on the live versions — which is why it sits
// in shared/worker-panel/ rather than under either one.
//
// It used to pair this with listDeployedVersionIds to mark versions that had
// never been deployed, but the only thing that ever rendered that flag was
// the popup's old VersionRow. Dropping it removes a whole second API call
// from every panel open.
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
        const versions = await listRecentVersions(
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
  }, [resolved]);

  return state;
}
