import { ChevronDown, ExternalLink } from 'lucide-react';
import {
  workerDashboardUrl,
  zoneInstantLogsUrl,
  zoneOverviewUrl,
  zoneWorkersAnalyticsUrl,
} from '@/shared/cloudflare-api/dashboard-links';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import type { WorkerForHostname } from '@/shared/cloudflare-api/worker-lookup';

interface DashboardMenuProps {
  worker: WorkerForHostname;
}

// The extension positions itself as a companion to the Cloudflare dashboard
// rather than a replacement, so "take me to the dashboard page for this" is
// a primary action and gets a real control — a split button whose main half
// goes straight to the Worker (by far the most common destination) and whose
// caret opens the rest. Individual sections keep their own ↗ links as well:
// a nearby jump and a single known entry point serve different moments.
export function DashboardMenu({ worker }: DashboardMenuProps) {
  const destinations = [
    {
      key: 'dashboardMenuZone' as const,
      href: zoneOverviewUrl(worker.accountId, worker.zoneName),
    },
    {
      key: 'dashboardMenuAnalytics' as const,
      href: zoneWorkersAnalyticsUrl(worker.accountId, worker.zoneName),
    },
    {
      key: 'dashboardMenuLogs' as const,
      href: zoneInstantLogsUrl(worker.accountId, worker.zoneName),
    },
  ];

  return (
    <div className="flex shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 rounded-r-none px-2 text-xs font-normal"
          >
            <a
              href={workerDashboardUrl(worker.accountId, worker.scriptName)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" />
              {browser.i18n.getMessage('dashboardMenuOpen')}
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{browser.i18n.getMessage('dashboardMenuWorker')}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-l-none border-l-0 px-1.5"
            aria-label={browser.i18n.getMessage('dashboardMenuMore')}
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {destinations.map((destination) => (
            <DropdownMenuItem key={destination.key} asChild>
              <a href={destination.href} target="_blank" rel="noreferrer">
                {browser.i18n.getMessage(destination.key)}
                <ExternalLink className="ml-auto size-3 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
