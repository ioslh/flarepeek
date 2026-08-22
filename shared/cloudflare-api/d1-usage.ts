import { z } from 'zod';

// d1AnalyticsAdaptiveGroups' shape (sum.readQueries/writeQueries, date_geq/
// date_leq filter) is confirmed against Cloudflare's own worked GraphQL
// example (D1 observability docs). d1StorageAdaptiveGroups' shape is NOT —
// the docs mention a `databaseSizeBytes` metric exists but never show a full
// query for it; `max.databaseSizeBytes` here is inferred from the naming
// pattern kvStorageAdaptiveGroups/r2StorageAdaptiveGroups both follow (see
// kv-usage.ts/r2-usage.ts), not verified letter-for-letter. That's why it's
// parsed as its own independently-optional piece below: if this guess is
// wrong, storageBytes just comes back null instead of taking the read/write
// query counts down with it.
const analyticsSchema = z.object({
  data: z.object({
    viewer: z.object({
      accounts: z.array(
        z.object({
          analytics: z.array(
            z.object({
              sum: z.object({ readQueries: z.number(), writeQueries: z.number() }),
            }),
          ),
        }),
      ),
    }),
  }),
});

const storageSchema = z.object({
  data: z.object({
    viewer: z.object({
      accounts: z.array(
        z.object({
          storage: z.array(
            z.object({
              max: z.object({ databaseSizeBytes: z.number() }),
              // Requested but unused: Cloudflare's GraphQL Analytics API
              // rejects `orderBy: [date_DESC]` unless `date` is also
              // selected somewhere in the query (confirmed the hard way
              // against a real account — see the same fix in kv-usage.ts).
              dimensions: z.object({ date: z.string() }),
            }),
          ),
        }),
      ),
    }),
  }),
});

export interface D1DatabaseUsage {
  readQueries: number;
  writeQueries: number;
  // null when the (unconfirmed) storage field didn't parse — see comment above.
  storageBytes: number | null;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getD1DatabaseUsage(
  apiToken: string,
  accountId: string,
  databaseId: string,
): Promise<D1DatabaseUsage | null> {
  const until = new Date();
  const since = new Date(until.getTime() - WINDOW_MS);
  const sinceDate = toDateOnly(since);
  const untilDate = toDateOnly(until);

  const query = `{
    viewer {
      accounts(filter: { accountTag: ${JSON.stringify(accountId)} }) {
        analytics: d1AnalyticsAdaptiveGroups(
          filter: {
            databaseId: ${JSON.stringify(databaseId)}
            date_geq: ${JSON.stringify(sinceDate)}
            date_leq: ${JSON.stringify(untilDate)}
          }
          limit: 1
        ) {
          sum { readQueries writeQueries }
        }
        storage: d1StorageAdaptiveGroups(
          filter: {
            databaseId: ${JSON.stringify(databaseId)}
            date_geq: ${JSON.stringify(sinceDate)}
            date_leq: ${JSON.stringify(untilDate)}
          }
          orderBy: [date_DESC]
          limit: 1
        ) {
          max { databaseSizeBytes }
          dimensions { date }
        }
      }
    }
  }`;

  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      console.error('[d1-usage] non-OK response', response.status, await response.text());
      return null;
    }

    const body: unknown = await response.json();

    const analyticsParsed = analyticsSchema.safeParse(body);
    if (!analyticsParsed.success) {
      console.error(
        '[d1-usage] analytics response did not match expected shape',
        body,
        analyticsParsed.error.issues,
      );
    }
    const analyticsRow = analyticsParsed.success
      ? analyticsParsed.data.data.viewer.accounts[0]?.analytics[0]
      : undefined;
    if (!analyticsRow) return null;

    const storageParsed = storageSchema.safeParse(body);
    if (!storageParsed.success) {
      console.error(
        '[d1-usage] storage field guess (databaseSizeBytes) did not match — see the comment at the top of this file',
        storageParsed.error.issues,
      );
    }
    const storageRow = storageParsed.success
      ? storageParsed.data.data.viewer.accounts[0]?.storage[0]
      : undefined;

    return {
      readQueries: analyticsRow.sum.readQueries,
      writeQueries: analyticsRow.sum.writeQueries,
      storageBytes: storageRow?.max.databaseSizeBytes ?? null,
    };
  } catch {
    return null;
  }
}
