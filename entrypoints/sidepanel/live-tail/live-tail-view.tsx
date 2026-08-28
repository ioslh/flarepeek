import { useState } from 'react';
import { TailEventRow } from '@/entrypoints/sidepanel/live-tail/tail-event-row';
import { matchesFilter } from '@/entrypoints/sidepanel/live-tail/tail-event-log';
import type { UseLiveTailResult } from '@/entrypoints/sidepanel/live-tail/use-live-tail';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { CREATE_API_TOKEN_URL } from '@/shared/cloudflare-api/create-token-url';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

interface LiveTailViewProps {
  tail: UseLiveTailResult;
}

// The body of the Live Tail takeover — see deployment-bar.tsx, which renders
// this as a PanelSection's children with LiveTailHeaderControls as the
// section's action. No inner scroll container or height cap here on
// purpose: this view replaces the whole content area below the header (see
// docs/sidepanel-tabs-design.md's "why not an accordion" note for the
// feature), so the list scrolls with the rest of the page like everything
// else — LIVE_TAIL_EVENT_CAP already bounds how large it can get.
export function LiveTailView({ tail }: LiveTailViewProps) {
  const [query, setQuery] = useState('');
  const { state } = tail;

  if (state.status === 'idle') return null; // unreachable — see live-tail-entry-button.tsx

  if (state.status === 'starting') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-amber-600">
          {browser.i18n.getMessage('liveTailDurableObjectCaution')}
        </p>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (state.status === 'error' && state.kind === 'forbidden') {
    return (
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
    );
  }
  if (state.status === 'error') {
    return (
      <p className="text-xs text-destructive">
        {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
      </p>
    );
  }

  // No useMemo: the buffer is capped at LIVE_TAIL_EVENT_CAP (see
  // tail-event-log.ts), so re-filtering on every render is cheap enough not
  // to need it.
  const events = state.events;
  const filtered = events.filter((event) => matchesFilter(event, query));

  return (
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
      </div>

      {state.status === 'streaming' && state.paused && (
        <p className="text-[10px] text-neutral-400">
          {browser.i18n.getMessage('liveTailPausedNote')}
        </p>
      )}

      {state.status === 'ended' && (
        <p className="text-[10px] text-neutral-400">
          {browser.i18n.getMessage(
            state.reason === 'stopped' ? 'liveTailEndedStopped' : 'liveTailEndedClosed',
          )}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-neutral-500">
          {browser.i18n.getMessage(
            events.length > 0
              ? 'liveTailFilterEmpty'
              : state.status === 'ended'
                ? 'liveTailEndedEmpty'
                : 'liveTailEmpty',
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((event, index) => (
            <TailEventRow key={index} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
