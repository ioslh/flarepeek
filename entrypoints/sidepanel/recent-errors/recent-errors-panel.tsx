import { useRecentErrors } from '@/entrypoints/sidepanel/recent-errors/use-recent-errors';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { zoneInstantLogsUrl } from '@/shared/cloudflare-api/dashboard-links';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface RecentErrorsPanelProps {
  resolved: ResolvedWorker;
}

export function RecentErrorsPanel({ resolved }: RecentErrorsPanelProps) {
  const state = useRecentErrors(resolved);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <a
          href={zoneInstantLogsUrl(resolved.worker.accountId, resolved.worker.zoneName)}
          target="_blank"
          rel="noreferrer"
          className="w-fit"
        >
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase hover:underline">
            {browser.i18n.getMessage('recentErrorsHeading')}
          </CardTitle>
        </a>
      </CardHeader>

      <CardContent className="px-4">
        {state.status === 'loading' && (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {state.status === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>
              {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
            </AlertDescription>
          </Alert>
        )}

        {state.status === 'observability-disabled' && (
          <p className="text-sm text-neutral-500">
            {browser.i18n.getMessage('recentErrorsObservabilityDisabled')}
          </p>
        )}

        {state.status === 'ready' && state.errors.length === 0 && (
          <p className="text-sm text-neutral-500">{browser.i18n.getMessage('recentErrorsEmpty')}</p>
        )}

        {state.status === 'ready' && state.errors.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {state.errors.map((error) => (
              <li key={error.id} className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5">
                <p className="truncate text-xs text-red-800">
                  {error.message ?? browser.i18n.getMessage('recentErrorsUnknownMessage')}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs text-red-500">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                  {error.statusCode !== null && (
                    <Badge variant="destructive">
                      {browser.i18n.getMessage(
                        'recentErrorsStatusCodeLabel',
                        String(error.statusCode),
                      )}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
