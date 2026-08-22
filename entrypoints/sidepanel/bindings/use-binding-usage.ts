import { useEffect, useRef, useState } from 'react';
import type { WorkerBinding } from '@/shared/cloudflare-api/bindings';
import { getKvNamespaceUsage, type KvNamespaceUsage } from '@/shared/cloudflare-api/kv-usage';
import { getD1DatabaseUsage, type D1DatabaseUsage } from '@/shared/cloudflare-api/d1-usage';
import { getR2BucketUsage, type R2BucketUsage } from '@/shared/cloudflare-api/r2-usage';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

export type BindingUsage =
  | { kind: 'kv'; usage: KvNamespaceUsage }
  | { kind: 'd1'; usage: D1DatabaseUsage }
  | { kind: 'r2'; usage: R2BucketUsage };

function bindingKey(binding: WorkerBinding): string {
  return `${binding.type}:${binding.name}`;
}

// Only fetches for bindings the Bindings panel is actually showing usage for
// (kv_namespace/d1/r2_bucket with a resource id) — and only once `enabled`
// (the panel's <details> being open) goes true, mirroring the panel's own
// "collapsed by default, not worth the cost until opened" stance. Results
// are kept in component state, not use-worker-lookup.ts's module-level
// cache — there's no cross-pin reuse case for usage numbers the way there is
// for the worker lookup itself.
export function useBindingUsage(
  resolved: ResolvedWorker,
  bindings: WorkerBinding[],
  enabled: boolean,
): Record<string, BindingUsage> {
  const [usageByKey, setUsageByKey] = useState<Record<string, BindingUsage>>({});
  // Tracks which bindings a fetch has already been kicked off for — a ref
  // rather than deriving this from usageByKey itself, so the effect below
  // doesn't need usageByKey as a dependency (which would refire it on every
  // partial result and re-request everything already in flight).
  const requestedKeysRef = useRef<Set<string>>(new Set());
  // Without this, switching to a different worker whose bindings happen to
  // reuse a name from the previous one (e.g. both call their D1 binding
  // "DB") would keep showing the *previous* worker's numbers under that
  // name — bindingKey() only encodes type+name, not which worker resolved
  // it. Also covers manual refresh: clicking Refresh gives a new `resolved`
  // object (see sidepanel-app.tsx's clearWorkerLookupCache), which should
  // re-pull usage too, not just the deployment/lookup state.
  const lastResolvedRef = useRef<ResolvedWorker | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (lastResolvedRef.current !== resolved) {
      lastResolvedRef.current = resolved;
      requestedKeysRef.current = new Set();
      setUsageByKey({});
    }

    const targets = bindings.filter(
      (binding) => !requestedKeysRef.current.has(bindingKey(binding)),
    );
    if (targets.length === 0) return;
    for (const binding of targets) requestedKeysRef.current.add(bindingKey(binding));

    let cancelled = false;
    const apiToken = resolved.token.token;
    const accountId = resolved.worker.accountId;

    void Promise.all(
      targets.map(async (binding) => {
        const entry = await fetchUsageFor(binding, apiToken, accountId);
        return entry ? ([bindingKey(binding), entry] as const) : null;
      }),
    ).then((results) => {
      if (cancelled) return;
      const next = results.filter((r): r is readonly [string, BindingUsage] => r !== null);
      if (next.length === 0) return;
      setUsageByKey((prev) => ({ ...prev, ...Object.fromEntries(next) }));
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, bindings, resolved]);

  return usageByKey;
}

async function fetchUsageFor(
  binding: WorkerBinding,
  apiToken: string,
  accountId: string,
): Promise<BindingUsage | null> {
  if (binding.type === 'kv_namespace' && binding.namespaceId) {
    const usage = await getKvNamespaceUsage(apiToken, accountId, binding.namespaceId);
    return usage ? { kind: 'kv', usage } : null;
  }
  if (binding.type === 'd1' && binding.databaseId) {
    const usage = await getD1DatabaseUsage(apiToken, accountId, binding.databaseId);
    return usage ? { kind: 'd1', usage } : null;
  }
  if (binding.type === 'r2_bucket' && binding.bucketName) {
    const usage = await getR2BucketUsage(apiToken, accountId, binding.bucketName);
    return usage ? { kind: 'r2', usage } : null;
  }
  return null;
}
