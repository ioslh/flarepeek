import { useWorkerStats } from '@/entrypoints/sidepanel/version-switcher/use-worker-stats';
import { PanelSection } from '@/entrypoints/sidepanel/panel-section';
import { zoneWorkersAnalyticsUrl } from '@/shared/cloudflare-api/dashboard-links';
import { cn } from '@/shared/ui/utils';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface WorkerStatsCardProps {
  resolved: ResolvedWorker;
}

interface StatProps {
  label: string;
  value: string;
  isAlarming?: boolean;
}

// Label above, number below, left-aligned — the number is the thing worth
// scanning, so it gets the size (matching the tab strip's "important means
// big" rule) while the label recedes into the same small uppercase used for
// section headings.
function Stat({ label, value, isAlarming }: StatProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate font-stretch-extra-condensed font-sans text-[10px] tracking-wider text-neutral-400 uppercase">
        {label}
      </span>
      <span
        className={cn(
          'truncate font-stretch-extra-condensed font-sans text-2xl leading-none tracking-tight',
          isAlarming ? 'text-destructive' : 'text-neutral-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}

// No section heading of its own: the three column labels already say what
// this is, and a fourth label above them would just be noise.
export function WorkerStatsCard({ resolved }: WorkerStatsCardProps) {
  const stats = useWorkerStats(resolved);
  if (!stats) return null;

  const errorRate = stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0;

  return (
    <PanelSection>
      <a
        href={zoneWorkersAnalyticsUrl(resolved.worker.accountId, resolved.worker.zoneName)}
        target="_blank"
        rel="noreferrer"
        className="grid grid-cols-3 gap-3"
      >
        <Stat
          label={browser.i18n.getMessage('workerStatsRequests')}
          value={stats.requests.toLocaleString()}
        />
        <Stat
          label={browser.i18n.getMessage('workerStatsErrorRate')}
          value={`${errorRate.toFixed(1)}%`}
          isAlarming={errorRate > 0}
        />
        <Stat
          label={browser.i18n.getMessage('workerStatsCpuP99')}
          value={stats.cpuTimeP99Ms !== null ? `${stats.cpuTimeP99Ms.toFixed(0)}ms` : '—'}
        />
      </a>
    </PanelSection>
  );
}
