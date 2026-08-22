import { workerDashboardUrl, zoneOverviewUrl } from '@/shared/cloudflare-api/dashboard-links';
import type { WorkerForHostname } from '@/shared/cloudflare-api/worker-lookup';

interface IdentityHeaderProps {
  hostname: string;
  // null while the worker hasn't resolved yet (loading / no-token /
  // not-a-worker-site / error) — the hostname alone still renders, so both
  // entrypoints always show "which site is this panel about" regardless of
  // lookup state, not just once a Worker match succeeds.
  worker: WorkerForHostname | null;
}

export function IdentityHeader({ hostname, worker }: IdentityHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <h1 className="truncate text-sm font-semibold text-neutral-900">{hostname}</h1>
      {worker && (
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
          <a
            href={workerDashboardUrl(worker.accountId, worker.scriptName)}
            target="_blank"
            rel="noreferrer"
            className="truncate hover:underline"
          >
            {worker.scriptName}
          </a>
          <span className="shrink-0 text-neutral-300">·</span>
          <a
            href={zoneOverviewUrl(worker.accountId, worker.zoneName)}
            target="_blank"
            rel="noreferrer"
            className="truncate hover:underline"
          >
            {worker.zoneName}
          </a>
        </div>
      )}
    </div>
  );
}
