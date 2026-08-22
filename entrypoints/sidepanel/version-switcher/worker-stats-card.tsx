import { useWorkerStats } from '@/entrypoints/sidepanel/version-switcher/use-worker-stats';
import { zoneWorkersAnalyticsUrl } from '@/shared/cloudflare-api/dashboard-links';
import { Card, CardContent } from '@/shared/ui/card';
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
    >
      <Card className="gap-0 py-3 transition-colors hover:border-neutral-300">
        <CardContent className="grid grid-cols-3 gap-2 px-3 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">{stats.requests.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {browser.i18n.getMessage('workerStatsRequests')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{errorRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              {browser.i18n.getMessage('workerStatsErrorRate')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {stats.cpuTimeP99Ms !== null ? `${stats.cpuTimeP99Ms.toFixed(0)}ms` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {browser.i18n.getMessage('workerStatsCpuP99')}
            </p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
