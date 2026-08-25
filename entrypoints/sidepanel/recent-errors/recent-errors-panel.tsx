import { useRecentErrors } from '@/entrypoints/sidepanel/recent-errors/use-recent-errors';
import { PanelSection, PANEL_SECTION_HEADING_CLASS } from '@/entrypoints/sidepanel/panel-section';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { zoneInstantLogsUrl } from '@/shared/cloudflare-api/dashboard-links';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/accordion';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/ui/utils';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface RecentErrorsPanelProps {
  resolved: ResolvedWorker;
}

// Collapsible, matching the bindings section's syntax — both are reference
// detail rather than something to keep permanently unfolded. It still opens
// itself when there actually are errors, so a real signal is never one click
// away from being missed; only the quiet case folds down.
export function RecentErrorsPanel({ resolved }: RecentErrorsPanelProps) {
  const state = useRecentErrors(resolved);
  const errorCount = state.status === 'ready' ? state.errors.length : 0;
  const logsUrl = zoneInstantLogsUrl(resolved.worker.accountId, resolved.worker.zoneName);

  return (
    <PanelSection className="gap-0 py-0">
      <Accordion type="single" collapsible defaultValue={errorCount > 0 ? 'errors' : ''}>
        <AccordionItem value="errors" className="border-b-0">
          <AccordionTrigger
            className={cn(
              PANEL_SECTION_HEADING_CLASS,
              'gap-2 py-4 text-neutral-400 hover:text-neutral-700 hover:no-underline',
            )}
          >
            <span className="flex-1 text-left">
              {browser.i18n.getMessage('recentErrorsHeading')}
            </span>
            {errorCount > 0 && (
              <span className="rounded-full bg-destructive px-1.5 font-mono text-[9px] text-white">
                {errorCount}
              </span>
            )}
            <a
              href={logsUrl}
              target="_blank"
              rel="noreferrer"
              title={browser.i18n.getMessage('recentErrorsHeading')}
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 rounded-sm px-1 text-[10px] hover:text-primary"
            >
              ↗
            </a>
          </AccordionTrigger>

          <AccordionContent className="pb-4">
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
              <p className="text-xs text-neutral-500">
                {browser.i18n.getMessage('recentErrorsEmpty')}
              </p>
            )}

            {state.status === 'ready' && state.errors.length > 0 && (
              // A thin left rule instead of a filled red box per row: several
              // stacked red panels drowned out everything else in the
              // sidepanel, while the rule carries the same "these are errors"
              // signal at a fraction of the visual weight.
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </PanelSection>
  );
}
