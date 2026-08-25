import { workerDashboardUrl, zoneOverviewUrl } from '@/shared/cloudflare-api/dashboard-links';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
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
// This is the title of the tab's content, so it is sized as one; both halves
// are links, and each says where it goes rather than leaving the user to
// discover it by clicking.
export function WorkerBreadcrumb({ worker, className }: WorkerBreadcrumbProps) {
  if (!worker) return null;

  return (
    <div className={cn('flex min-w-0 items-center gap-1 font-mono text-sm', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={workerDashboardUrl(worker.accountId, worker.scriptName)}
            target="_blank"
            rel="noreferrer"
            className="truncate font-medium text-foreground hover:text-primary hover:underline"
          >
            {worker.scriptName}
          </a>
        </TooltipTrigger>
        <TooltipContent>{browser.i18n.getMessage('dashboardMenuWorker')}</TooltipContent>
      </Tooltip>

      <span aria-hidden="true" className="shrink-0 text-neutral-300">
        ›
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={zoneOverviewUrl(worker.accountId, worker.zoneName)}
            target="_blank"
            rel="noreferrer"
            className="truncate text-muted-foreground hover:text-primary hover:underline"
          >
            {worker.zoneName}
          </a>
        </TooltipTrigger>
        <TooltipContent>{browser.i18n.getMessage('dashboardMenuZoneTooltip')}</TooltipContent>
      </Tooltip>
    </div>
  );
}
