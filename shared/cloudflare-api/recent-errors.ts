import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const errorEventSchema = z.object({
  timestamp: z.number(),
  $metadata: z.object({
    id: z.string(),
    message: z.string().optional(),
    error: z.string().optional(),
    requestId: z.string().optional(),
    statusCode: z.number().optional(),
  }),
});

const eventsResponseSchema = z.object({
  events: z
    .object({
      events: z.array(errorEventSchema).optional(),
    })
    .optional(),
});

export interface RecentErrorEvent {
  id: string;
  timestamp: number;
  message: string | null;
  requestId: string | null;
  statusCode: number | null;
}

const DEFAULT_WINDOW_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 10;

// Requires the "Workers Observability" account permission — NOT "Workers
// Tail", which only covers the older wrangler-tail-style streaming endpoint.
// Queries the Workers Observability events dataset for this script, filtered
// to events that carry an error, over a rolling time window.
export async function getRecentErrors(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
  windowMs = DEFAULT_WINDOW_MS,
): Promise<RecentErrorEvent[]> {
  const now = Date.now();

  const response = await client.workers.observability.telemetry.query({
    account_id: accountId,
    queryId: `recent-errors-${scriptName}`,
    timeframe: { from: now - windowMs, to: now },
    view: 'events',
    limit: DEFAULT_LIMIT,
    // This is a one-off ad-hoc read on every popup open — dry avoids leaving
    // a trail of saved queries in the user's Cloudflare dashboard.
    dry: true,
    parameters: {
      filterCombination: 'and',
      filters: [
        { key: '$metadata.service', type: 'string', operation: 'eq', value: scriptName },
        { key: '$metadata.error', type: 'string', operation: 'exists' },
      ],
    },
  });

  const parsed = eventsResponseSchema.parse(response);
  const events = parsed.events?.events ?? [];

  return events
    .map((event) => ({
      id: event.$metadata.id,
      timestamp: event.timestamp,
      message: event.$metadata.error ?? event.$metadata.message ?? null,
      requestId: event.$metadata.requestId ?? null,
      statusCode: event.$metadata.statusCode ?? null,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}
