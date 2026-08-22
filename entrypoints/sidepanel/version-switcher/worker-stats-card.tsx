import { useWorkerStats } from '@/entrypoints/sidepanel/version-switcher/use-worker-stats';
import { zoneWorkersAnalyticsUrl } from '@/shared/cloudflare-api/dashboard-links';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface WorkerStatsCardProps {
  resolved: ResolvedWorker;
}

export function WorkerStatsCard({ resolved }: WorkerStatsCardProps) {
  const stats = useWorkerStats(resolved);
  if (!stats) return null;

  const errorRate = stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0;

  return (
    <a
      href={zoneWorkersAnalyticsUrl(resolved.worker.accountId, resolved.worker.zoneName)}
      target="_blank"
      rel="noreferrer"
      className="grid grid-cols-3 gap-2 rounded border border-neutral-100 bg-white px-3 py-2 text-center hover:border-neutral-200"
    >
      <div>
        <p className="text-sm font-medium text-neutral-900">{stats.requests.toLocaleString()}</p>
        <p className="text-xs text-neutral-500">{browser.i18n.getMessage('workerStatsRequests')}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{errorRate.toFixed(1)}%</p>
        <p className="text-xs text-neutral-500">
          {browser.i18n.getMessage('workerStatsErrorRate')}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">
          {stats.cpuTimeP99Ms !== null ? `${stats.cpuTimeP99Ms.toFixed(0)}ms` : '—'}
        </p>
        <p className="text-xs text-neutral-500">{browser.i18n.getMessage('workerStatsCpuP99')}</p>
      </div>
    </a>
  );
}
