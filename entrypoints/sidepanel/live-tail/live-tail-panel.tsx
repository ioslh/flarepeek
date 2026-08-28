import { useState } from 'react';
import { useLiveTail } from '@/entrypoints/sidepanel/live-tail/use-live-tail';
import { TailEventRow } from '@/entrypoints/sidepanel/live-tail/tail-event-row';
import { matchesFilter } from '@/entrypoints/sidepanel/live-tail/tail-event-log';
import { PanelSection, PANEL_SECTION_HEADING_CLASS } from '@/entrypoints/sidepanel/panel-section';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { CREATE_API_TOKEN_URL } from '@/shared/cloudflare-api/create-token-url';
import { zoneInstantLogsUrl } from '@/shared/cloudflare-api/dashboard-links';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/accordion';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/ui/utils';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface LiveTailPanelProps {
  resolved: ResolvedWorker;
}

// Collapsible like bindings/recent-errors, but — unlike those two — opening
// the accordion never has a side effect. Starting a tail session (a real
// API call that counts against a concurrent-session cap, see
// use-live-tail.ts) only ever happens from the explicit Start/Restart
// button below, never implicitly from expanding the section.
export function LiveTailPanel({ resolved }: LiveTailPanelProps) {
  // Called above the Accordion tree on purpose — see use-live-tail.ts's own
  // comment on why this can't move inside AccordionContent.
  const tail = useLiveTail(resolved);
  const [query, setQuery] = useState('');
  const logsUrl = zoneInstantLogsUrl(resolved.worker.accountId, resolved.worker.zoneName);

  // No useMemo: the buffer is capped at LIVE_TAIL_EVENT_CAP (see
  // tail-event-log.ts), so re-filtering on every render is cheap enough not
  // to need it.
  const events =
    tail.state.status === 'streaming' || tail.state.status === 'ended' ? tail.state.events : [];
  const filtered = events.filter((event) => matchesFilter(event, query));
  const isLive = tail.state.status === 'streaming';

  return (
    <PanelSection className="gap-0 py-0">
      <Accordion type="single" collapsible>
        <AccordionItem value="live-tail" className="border-b-0">
          <AccordionTrigger
            className={cn(
              PANEL_SECTION_HEADING_CLASS,
              'gap-2 py-4 text-neutral-400 hover:text-neutral-700 hover:no-underline',
            )}
          >
            <span className="flex-1 text-left">{browser.i18n.getMessage('liveTailHeading')}</span>
            {isLive && (
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 font-mono text-[9px] text-destructive">
                <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
                {browser.i18n.getMessage('liveTailLiveBadge')}
              </span>
            )}
            <a
              href={logsUrl}
              target="_blank"
              rel="noreferrer"
              title={browser.i18n.getMessage('liveTailOpenInDashboard')}
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 rounded-sm px-1 text-[10px] hover:text-primary"
            >
              ↗
            </a>
          </AccordionTrigger>

          <AccordionContent className="pb-4">
            {tail.state.status === 'idle' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-neutral-500">
                  {browser.i18n.getMessage('liveTailIdleDescription')}
                </p>
                {/* Static caution, not a blocking confirm dialog — see the
                    plan's v1 scope note on why this doesn't fetch bindings
                    to detect whether the Worker actually uses Durable
                    Objects before showing it. */}
                <p className="text-xs text-amber-600">
                  {browser.i18n.getMessage('liveTailDurableObjectCaution')}
                </p>
                <Button size="sm" onClick={tail.start} className="w-fit">
                  {browser.i18n.getMessage('liveTailStart')}
                </Button>
              </div>
            )}

            {tail.state.status === 'starting' && (
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}

            {tail.state.status === 'error' && tail.state.kind === 'forbidden' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-destructive">
                  {browser.i18n.getMessage('liveTailErrorForbidden')}
                </p>
                <a
                  href={CREATE_API_TOKEN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit text-xs text-primary underline"
                >
                  {browser.i18n.getMessage('liveTailErrorForbiddenCta')}
                </a>
              </div>
            )}
            {tail.state.status === 'error' && tail.state.kind !== 'forbidden' && (
              <p className="text-xs text-destructive">
                {browser.i18n.getMessage(cloudflareErrorMessageKey(tail.state.kind))}
              </p>
            )}

            {(tail.state.status === 'streaming' || tail.state.status === 'ended') && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={browser.i18n.getMessage('liveTailFilterPlaceholder')}
                    className="h-7 flex-1 text-xs"
                  />
                  <Button size="xs" variant="outline" onClick={tail.clear}>
                    {browser.i18n.getMessage('liveTailClear')}
                  </Button>
                  {tail.state.status === 'streaming' ? (
                    <Button size="xs" variant="outline" onClick={tail.stop}>
                      {browser.i18n.getMessage('liveTailStop')}
                    </Button>
                  ) : (
                    <Button size="xs" variant="outline" onClick={tail.start}>
                      {browser.i18n.getMessage('liveTailRestart')}
                    </Button>
                  )}
                </div>

                {tail.state.status === 'ended' && (
                  <p className="text-[10px] text-neutral-400">
                    {browser.i18n.getMessage(
                      tail.state.reason === 'stopped'
                        ? 'liveTailEndedStopped'
                        : 'liveTailEndedClosed',
                    )}
                  </p>
                )}

                {filtered.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    {browser.i18n.getMessage(
                      events.length > 0
                        ? 'liveTailFilterEmpty'
                        : tail.state.status === 'ended'
                          ? 'liveTailEndedEmpty'
                          : 'liveTailEmpty',
                    )}
                  </p>
                ) : (
                  <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {filtered.map((event, index) => (
                      <TailEventRow key={index} event={event} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </PanelSection>
  );
}
