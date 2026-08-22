import { useRecentErrors } from '@/entrypoints/sidepanel/recent-errors/use-recent-errors';
import { SectionCard } from '@/entrypoints/sidepanel/section-card';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { zoneInstantLogsUrl } from '@/shared/cloudflare-api/dashboard-links';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface RecentErrorsPanelProps {
  resolved: ResolvedWorker;
}

export function RecentErrorsPanel({ resolved }: RecentErrorsPanelProps) {
  const state = useRecentErrors(resolved);

  return (
    <SectionCard>
      <a
        href={zoneInstantLogsUrl(resolved.worker.accountId, resolved.worker.zoneName)}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-neutral-400 uppercase hover:underline"
      >
        {browser.i18n.getMessage('recentErrorsHeading')}
      </a>

      {state.status === 'loading' && (
        <p className="text-sm text-neutral-500">
          {browser.i18n.getMessage('versionSwitcherLoading')}
        </p>
      )}

      {state.status === 'error' && (
        <p className="text-sm text-red-600">
          {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
        </p>
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
            <li key={error.id} className="rounded border border-red-200 bg-red-50 px-2 py-1.5">
              <p className="truncate text-xs text-red-800">
                {error.message ?? browser.i18n.getMessage('recentErrorsUnknownMessage')}
              </p>
              <p className="text-xs text-red-500">
                {new Date(error.timestamp).toLocaleTimeString()}
                {error.statusCode !== null &&
                  ` · ${browser.i18n.getMessage('recentErrorsStatusCodeLabel', String(error.statusCode))}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
