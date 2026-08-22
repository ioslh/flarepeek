import { useCallback, useEffect, useState } from 'react';
import {
  disableVersionOverride,
  enableVersionOverride,
  getActiveOverride,
  requestOverrideHostPermission,
} from '@/shared/version-override/version-override';

type ActivationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'permission-denied' }
  | { status: 'error' };

export function useVersionOverride(hostname: string | null) {
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [activation, setActivation] = useState<ActivationState>({ status: 'idle' });

  useEffect(() => {
    if (!hostname) {
      setActiveVersionId(null);
      return;
    }

    let cancelled = false;
    getActiveOverride(hostname).then((override) => {
      if (!cancelled) setActiveVersionId(override?.versionId ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [hostname]);

  // Must be invoked directly from a click handler: requestOverrideHostPermission
  // needs an active user gesture, so nothing may await before it runs.
  const activate = useCallback(
    async (workerName: string, versionId: string) => {
      if (!hostname) return;

      setActivation({ status: 'requesting' });
      try {
        const granted = await requestOverrideHostPermission(hostname);
        if (!granted) {
          setActivation({ status: 'permission-denied' });
          return;
        }

        await enableVersionOverride({ hostname, workerName, versionId });
        setActiveVersionId(versionId);
        setActivation({ status: 'idle' });
      } catch {
        // e.g. Chrome's dynamic-rule quota, or any other declarativeNetRequest
        // failure — without this, activation state got stuck at 'requesting'
        // forever with no way to retry.
        setActivation({ status: 'error' });
      }
    },
    [hostname],
  );

  const deactivate = useCallback(async () => {
    if (!hostname) return;
    try {
      await disableVersionOverride(hostname);
      setActiveVersionId(null);
    } catch {
      setActivation({ status: 'error' });
    }
  }, [hostname]);

  return { activeVersionId, activation, activate, deactivate };
}
