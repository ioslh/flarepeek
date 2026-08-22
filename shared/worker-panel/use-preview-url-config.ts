import { useEffect, useState } from 'react';
import { getPreviewUrlConfig, type PreviewUrlConfig } from '@/shared/cloudflare-api/preview-url';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

// A nice-to-have, not a core feature: any failure (missing permission,
// network hiccup) just means no preview link is shown, not an error state.
export function usePreviewUrlConfig(resolved: ResolvedWorker | null): PreviewUrlConfig | null {
  const [config, setConfig] = useState<PreviewUrlConfig | null>(null);

  useEffect(() => {
    if (!resolved) {
      setConfig(null);
      return;
    }

    let cancelled = false;

    getPreviewUrlConfig(resolved.client, resolved.worker.accountId, resolved.worker.scriptName)
      .then((result) => {
        if (!cancelled) setConfig(result);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });

    return () => {
      cancelled = true;
    };
  }, [resolved]);

  return config;
}
