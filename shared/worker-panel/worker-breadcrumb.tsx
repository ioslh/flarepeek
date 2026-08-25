import { workerDashboardUrl, zoneOverviewUrl } from '@/shared/cloudflare-api/dashboard-links';
import { cn } from '@/shared/ui/utils';
import type { WorkerForHostname } from '@/shared/cloudflare-api/worker-lookup';

interface WorkerBreadcrumbProps {
  // null while the worker hasn't resolved yet (loading / no-token /
  // not-a-worker-site / error) — renders nothing rather than a placeholder,
  // since callers already show the hostname elsewhere.
  worker: WorkerForHostname | null;
  className?: string;
}

// "which Cloudflare asset is this" — the scarce information, as opposed to
// the hostname, which the sidepanel's tab strip already shows in large type.
// Both halves link into the dashboard; the sidepanel pairs this with a
// fuller jump menu (entrypoints/sidepanel/dashboard-menu.tsx) while the
// popup uses it on its own under the hostname.
export function WorkerBreadcrumb({ worker, className }: WorkerBreadcrumbProps) {
  if (!worker) return null;

  return (
    <div className={cn('flex min-w-0 items-center gap-1 font-mono text-xs', className)}>
      <a
        href={workerDashboardUrl(worker.accountId, worker.scriptName)}
        target="_blank"
        rel="noreferrer"
        className="truncate text-foreground hover:underline"
      >
        {worker.scriptName}
      </a>
      <span aria-hidden="true" className="shrink-0 text-neutral-300">
        ›
      </span>
      <a
        href={zoneOverviewUrl(worker.accountId, worker.zoneName)}
        target="_blank"
        rel="noreferrer"
        className="truncate text-muted-foreground hover:underline"
      >
        {worker.zoneName}
      </a>
    </div>
  );
}
