import { useRecentErrors } from '@/entrypoints/sidepanel/recent-errors/use-recent-errors';
import { PanelSection } from '@/entrypoints/sidepanel/panel-section';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { zoneInstantLogsUrl } from '@/shared/cloudflare-api/dashboard-links';
import { Skeleton } from '@/shared/ui/skeleton';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface RecentErrorsPanelProps {
  resolved: ResolvedWorker;
}

export function RecentErrorsPanel({ resolved }: RecentErrorsPanelProps) {
  const state = useRecentErrors(resolved);

  return (
    <PanelSection
      title={browser.i18n.getMessage('recentErrorsHeading')}
      titleHref={zoneInstantLogsUrl(resolved.worker.accountId, resolved.worker.zoneName)}
    >
      {state.status === 'loading' && (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {state.status === 'error' && (
        <p className="text-xs text-destructive">
          {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
        </p>
      )}

      {state.status === 'observability-disabled' && (
        <p className="text-xs text-neutral-500">
          {browser.i18n.getMessage('recentErrorsObservabilityDisabled')}
        </p>
      )}

      {state.status === 'ready' && state.errors.length === 0 && (
        <p className="text-xs text-neutral-500">{browser.i18n.getMessage('recentErrorsEmpty')}</p>
      )}

      {state.status === 'ready' && state.errors.length > 0 && (
        // A thin left rule instead of a filled red box per row: several
        // stacked red panels drowned out everything else in the sidepanel,
        // while the rule carries the same "these are errors" signal at a
        // fraction of the visual weight. Red is left to accent the status
        // code, where it actually distinguishes one row from another.
        <ul className="flex flex-col gap-2">
          {state.errors.map((error) => (
            <li key={error.id} className="border-l-2 border-destructive/40 pl-2">
              <p className="truncate text-xs text-neutral-700">
                {error.message ?? browser.i18n.getMessage('recentErrorsUnknownMessage')}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-neutral-400">
                <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
                {error.statusCode !== null && (
                  <span className="text-destructive">
                    {browser.i18n.getMessage(
                      'recentErrorsStatusCodeLabel',
                      String(error.statusCode),
                    )}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
