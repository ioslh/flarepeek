import type { LiveTailEvent } from '@/shared/cloudflare-api/tail';
import {
  formatLogMessage,
  outcomeMessageKey,
  outcomeTone,
} from '@/entrypoints/sidepanel/live-tail/tail-event-log';
import { cn } from '@/shared/ui/utils';

interface TailEventRowProps {
  event: LiveTailEvent;
}

// One line per event, same visual language as recent-errors-panel.tsx's
// list rows (thin left rule instead of a filled block, so a long stream of
// destructive-tone rows doesn't turn the whole panel red).
export function TailEventRow({ event }: TailEventRowProps) {
  const tone = outcomeTone(event.outcome);

  return (
    <li
      className={cn(
        'border-l-2 pl-2',
        tone === 'destructive' ? 'border-destructive/40' : 'border-neutral-200',
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
        <span>{new Date(event.eventTimestamp).toLocaleTimeString()}</span>
        {event.detail.kind === 'request' && (
          <span className="font-mono uppercase">{event.detail.method}</span>
        )}
        {event.detail.kind === 'request' && event.detail.status !== null && (
          <span>
            {browser.i18n.getMessage('liveTailStatusCodeLabel', String(event.detail.status))}
          </span>
        )}
        <span className={cn(tone === 'destructive' && 'text-destructive')}>
          {browser.i18n.getMessage(outcomeMessageKey(event.outcome))}
        </span>
      </div>

      {event.detail.kind === 'request' && (
        <p className="truncate text-xs text-neutral-700">{event.detail.url}</p>
      )}
      {event.detail.kind === 'scheduled' && (
        <p className="truncate font-mono text-xs text-neutral-700">{event.detail.cron}</p>
      )}

      {event.logs.map((log, index) => (
        <p key={index} className="truncate font-mono text-xs text-neutral-600">
          {formatLogMessage(log.message)}
        </p>
      ))}

      {event.exceptions.map((exception, index) => (
        <p key={index} className="truncate text-xs text-destructive">
          {exception.name}: {exception.message}
        </p>
      ))}
    </li>
  );
}
