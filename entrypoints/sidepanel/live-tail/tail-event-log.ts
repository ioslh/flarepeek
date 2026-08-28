import type { LiveTailEvent } from '@/shared/cloudflare-api/tail';

// A long-running stream needs a hard cap or the sidepanel's memory/DOM grows
// unbounded for as long as the tab stays open — 300 is generous for a
// glance-at-recent-activity tool without being so large it visibly stutters
// the list while re-rendering.
export const LIVE_TAIL_EVENT_CAP = 300;

// Oldest-first ring buffer: new events append at the end, and once `cap` is
// exceeded the oldest ones fall off the front — matches how the event list
// renders (newest at the bottom, like a terminal).
export function pushCapped(
  buffer: LiveTailEvent[],
  event: LiveTailEvent,
  cap: number = LIVE_TAIL_EVENT_CAP,
): LiveTailEvent[] {
  const next = [...buffer, event];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

// Client-side text search over an already-received event — matches request
// URL, exception name/message, and log message text. Case-insensitive.
// `message` entries in a log are `unknown[]` (raw console.log args), so each
// is best-effort stringified rather than assumed to already be a string.
export function matchesFilter(event: LiveTailEvent, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  if (event.detail.kind === 'request' && event.detail.url.toLowerCase().includes(needle)) {
    return true;
  }

  if (
    event.exceptions.some(
      (exception) =>
        exception.name.toLowerCase().includes(needle) ||
        exception.message.toLowerCase().includes(needle),
    )
  ) {
    return true;
  }

  return event.logs.some((log) =>
    log.message.some((part) => stringifyMessagePart(part).toLowerCase().includes(needle)),
  );
}

function stringifyMessagePart(part: unknown): string {
  if (typeof part === 'string') return part;
  try {
    return JSON.stringify(part) ?? String(part);
  } catch {
    return String(part);
  }
}

// Shared with tail-event-row.tsx so a log line renders exactly the text
// matchesFilter above searches against.
export function formatLogMessage(message: unknown[]): string {
  return message.map(stringifyMessagePart).join(' ');
}

// Mirrors the outcome values documented for TraceItem (see
// shared/cloudflare-api/tail.ts) — kept as a closed switch over the known
// ones with a generic fallback, since `outcome` arrives as a plain string
// from the wire and an unrecognised value shouldn't crash the row, just
// render as "other".
const KNOWN_OUTCOME_KEYS = {
  ok: 'liveTailOutcomeOk',
  exception: 'liveTailOutcomeException',
  exceededCpu: 'liveTailOutcomeExceededCpu',
  exceededMemory: 'liveTailOutcomeExceededMemory',
  canceled: 'liveTailOutcomeCanceled',
  scriptNotFound: 'liveTailOutcomeScriptNotFound',
  responseStreamDisconnected: 'liveTailOutcomeResponseStreamDisconnected',
  unknown: 'liveTailOutcomeUnknown',
} as const;

export function outcomeMessageKey(outcome: string) {
  return KNOWN_OUTCOME_KEYS[outcome as keyof typeof KNOWN_OUTCOME_KEYS] ?? 'liveTailOutcomeOther';
}

// 'ok' and 'canceled' read as neutral outcomes; everything else (exceptions,
// resource limits, unknown/other) is a signal worth calling out in red —
// same two-tone approach recent-errors-panel.tsx uses for its rows.
export function outcomeTone(outcome: string): 'default' | 'destructive' {
  return outcome === 'ok' || outcome === 'canceled' ? 'default' : 'destructive';
}
