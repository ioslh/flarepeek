import { z } from 'zod';

// Both kvOperationsAdaptiveGroups and kvStorageAdaptiveGroups field names
// confirmed against Cloudflare's own worked GraphQL examples (KV
// observability docs), not guessed. The `date` filter is a Date scalar
// (YYYY-MM-DD), distinct from the Time/datetime scalar workersInvocationsAdaptive
// (worker-stats.ts) and r2 usage (r2-usage.ts) use.
const usageResponseSchema = z.object({
  data: z.object({
    viewer: z.object({
      accounts: z.array(
        z.object({
          operations: z.array(
            z.object({
              sum: z.object({ requests: z.number() }),
            }),
          ),
          storage: z.array(
            z.object({
              max: z.object({ keyCount: z.number(), byteCount: z.number() }),
              // Requested but unused: Cloudflare's GraphQL Analytics API
              // rejects `orderBy: [date_DESC]` unless `date` is also
              // selected somewhere in the query — found by hitting the
              // actual error ("cannot order by date: it is neither
              // aggregated, nor a dimension") against a real account.
              dimensions: z.object({ date: z.string() }),
            }),
          ),
        }),
      ),
    }),
  }),
});

export interface KvNamespaceUsage {
  requests: number;
  storedKeys: number;
  storedBytes: number;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getKvNamespaceUsage(
  apiToken: string,
  accountId: string,
  namespaceId: string,
): Promise<KvNamespaceUsage | null> {
  const until = new Date();
  const since = new Date(until.getTime() - WINDOW_MS);
  const sinceDate = toDateOnly(since);
  const untilDate = toDateOnly(until);

  const query = `{
    viewer {
      accounts(filter: { accountTag: ${JSON.stringify(accountId)} }) {
        operations: kvOperationsAdaptiveGroups(
          filter: {
            namespaceId: ${JSON.stringify(namespaceId)}
            date_geq: ${JSON.stringify(sinceDate)}
            date_leq: ${JSON.stringify(untilDate)}
          }
          limit: 1
        ) {
          sum { requests }
        }
        storage: kvStorageAdaptiveGroups(
          filter: {
            namespaceId: ${JSON.stringify(namespaceId)}
            date_geq: ${JSON.stringify(sinceDate)}
            date_leq: ${JSON.stringify(untilDate)}
          }
          orderBy: [date_DESC]
          limit: 1
        ) {
          max { keyCount byteCount }
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
      console.error('[kv-usage] non-OK response', response.status, await response.text());
      return null;
    }

    const body: unknown = await response.json();
    const parsed = usageResponseSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[kv-usage] response did not match expected shape', body, parsed.error.issues);
      return null;
    }

    const account = parsed.data.data.viewer.accounts[0];
    const operationsRow = account?.operations[0];
    const storageRow = account?.storage[0];
    if (!operationsRow || !storageRow) {
      console.error('[kv-usage] no matching operations/storage row', parsed.data);
      return null;
    }

    return {
      requests: operationsRow.sum.requests,
      storedKeys: storageRow.max.keyCount,
      storedBytes: storageRow.max.byteCount,
    };
  } catch {
    return null;
  }
}
