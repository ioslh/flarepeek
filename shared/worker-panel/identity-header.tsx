import { WorkerBreadcrumb } from '@/shared/worker-panel/worker-breadcrumb';
import type { WorkerForHostname } from '@/shared/cloudflare-api/worker-lookup';

interface IdentityHeaderProps {
  hostname: string;
  // null while the worker hasn't resolved yet (loading / no-token /
  // not-a-worker-site / error) — the hostname alone still renders, so the
  // popup always shows "which site is this about" regardless of lookup state.
  worker: WorkerForHostname | null;
}

// Popup only. The sidepanel drops the hostname here — its tab strip already
// carries it in large type — and renders WorkerBreadcrumb on its own beside
// the dashboard jump menu instead (entrypoints/sidepanel/tabs/panel-tab-pane.tsx).
export function IdentityHeader({ hostname, worker }: IdentityHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <h1 className="truncate text-sm font-semibold text-neutral-900">{hostname}</h1>
      <WorkerBreadcrumb worker={worker} />
    </div>
  );
}
