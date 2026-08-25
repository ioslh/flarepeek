import type Cloudflare from 'cloudflare';
import { z } from 'zod';

// The grouped-count response shape. Deliberately tolerant: anything that
// doesn't parse becomes "no data for this version" rather than a thrown
// error, since this is supplementary information beside the deployment bar
// and must never take the bar down with it.
const groupedRowSchema = z.object({
  groups: z.record(z.string(), z.unknown()).optional(),
  count: z.number().optional(),
});

const calculationsResponseSchema = z.object({
  calculations: z
    .array(
      z.object({
        aggregates: z.array(groupedRowSchema).optional(),
      }),
    )
    .optional(),
});

// Field carrying the Worker version on a Workers Observability event —
// confirmed against the Cloudflare SDK's own telemetry types, where
// $workers.scriptVersion.{id,tag,message} appears on both event shapes.
// Note it is *optional* there: events can arrive without it, which is why
// `unknownRate` below exists rather than those events being folded into
// some version's numbers.
const VERSION_KEY = '$workers.scriptVersion.id';

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface VersionErrorRate {
  versionId: string;
  // 0-100. Deliberately the *only* thing exposed: Workers Logs applies
  // head-based sampling per invocation and keeps every log from a sampled
  // request together — errors are not preferentially retained — so a ratio
  // taken within the sampled population stays unbiased while the absolute
  // counts underneath it are understated whenever sampling is below 1.
  errorRate: number;
}

export interface VersionErrorRates {
  byVersion: VersionErrorRate[];
  // Share of invocations whose event carried no version at all. Surfaced
  // rather than silently distributed across the known versions: attributing
  // traffic we cannot attribute would be exactly the kind of plausible-but-
  // wrong number this panel must not print.
  unattributedRate: number;
}

function countsByVersion(response: unknown): Map<string, number> {
  const parsed = calculationsResponseSchema.safeParse(response);
  const rows = parsed.success ? (parsed.data.calculations?.[0]?.aggregates ?? []) : [];

  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row.groups?.[VERSION_KEY];
    const versionId = typeof value === 'string' && value !== '' ? value : '';
    counts.set(versionId, (counts.get(versionId) ?? 0) + (row.count ?? 0));
  }
  return counts;
}

// Per-version error rates over a rolling window, from the same Workers
// Observability dataset (and the same permission) that Recent Errors
// already uses — no extra token scope needed.
//
// Two queries rather than one: the API groups by a key and counts, so
// "how many invocations per version" and "how many of those errored" are
// separate counts that get divided here. Both are `dry` so neither leaves a
// saved query behind in the user's dashboard.
//
// Returns null when observability is off for this Worker, or on any
// failure — the caller renders nothing rather than a zero that would read
// as "no errors".
export async function getVersionErrorRates(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
  windowMs = DEFAULT_WINDOW_MS,
): Promise<VersionErrorRates | null> {
  const now = Date.now();
  const timeframe = { from: now - windowMs, to: now };

  const serviceFilter = {
    key: '$metadata.service',
    type: 'string' as const,
    operation: 'eq' as const,
    value: scriptName,
  };

  const baseQuery = {
    account_id: accountId,
    timeframe,
    view: 'calculations' as const,
    dry: true,
    limit: 50,
  };

  const groupBys = [{ type: 'string' as const, value: VERSION_KEY }];
  const calculations = [{ operator: 'count' as const }];

  try {
    const [totalsResponse, errorsResponse] = await Promise.all([
      client.workers.observability.telemetry.query({
        ...baseQuery,
        queryId: `version-totals-${scriptName}`,
        parameters: { filterCombination: 'and', filters: [serviceFilter], groupBys, calculations },
      }),
      client.workers.observability.telemetry.query({
        ...baseQuery,
        queryId: `version-errors-${scriptName}`,
        parameters: {
          filterCombination: 'and',
          filters: [
            serviceFilter,
            { key: '$metadata.error', type: 'string' as const, operation: 'exists' as const },
          ],
          groupBys,
          calculations,
        },
      }),
    ]);

    const totals = countsByVersion(totalsResponse);
    const errors = countsByVersion(errorsResponse);

    const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);
    if (grandTotal === 0) return null;

    const byVersion: VersionErrorRate[] = [];
    for (const [versionId, total] of totals) {
      if (versionId === '' || total === 0) continue;
      byVersion.push({ versionId, errorRate: ((errors.get(versionId) ?? 0) / total) * 100 });
    }

    return {
      byVersion,
      unattributedRate: ((totals.get('') ?? 0) / grandTotal) * 100,
    };
  } catch {
    return null;
  }
}
