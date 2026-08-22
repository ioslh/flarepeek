import { z } from 'zod';

const statsResponseSchema = z.object({
  data: z.object({
    viewer: z.object({
      accounts: z.array(
        z.object({
          workersInvocationsAdaptive: z.array(
            z.object({
              sum: z.object({
                requests: z.number(),
                errors: z.number(),
              }),
              quantiles: z.object({
                cpuTimeP50: z.number().nullable(),
                cpuTimeP99: z.number().nullable(),
              }),
            }),
          ),
        }),
      ),
    }),
  }),
});

export interface WorkerStats {
  requests: number;
  errors: number;
  cpuTimeP50Ms: number | null;
  cpuTimeP99Ms: number | null;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

// Not covered by the cloudflare SDK (GraphQL Analytics is a separate API
// surface), and needs the "Account Analytics:Read" permission — distinct
// from every other permission this extension uses so far.
//
// Values are interpolated as JSON string literals directly into the query
// (rather than declared GraphQL variables) since accountId/scriptName/dates
// are all values this extension derives itself, never raw user input, and
// this sidesteps needing to get Cloudflare's (non-standard, lowercase)
// GraphQL scalar type names exactly right.
export async function getWorkerStats(
  apiToken: string,
  accountId: string,
  scriptName: string,
): Promise<WorkerStats | null> {
  const until = new Date();
  const since = new Date(until.getTime() - WINDOW_MS);

  const query = `{
    viewer {
      accounts(filter: { accountTag: ${JSON.stringify(accountId)} }) {
        workersInvocationsAdaptive(
          filter: {
            scriptName: ${JSON.stringify(scriptName)}
            datetime_geq: ${JSON.stringify(since.toISOString())}
            datetime_leq: ${JSON.stringify(until.toISOString())}
          }
          limit: 1
        ) {
          sum { requests errors }
          quantiles { cpuTimeP50 cpuTimeP99 }
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
    if (!response.ok) return null;

    const parsed = statsResponseSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const row = parsed.data.data.viewer.accounts[0]?.workersInvocationsAdaptive[0];
    if (!row) return null;

    return {
      requests: row.sum.requests,
      errors: row.sum.errors,
      cpuTimeP50Ms: row.quantiles.cpuTimeP50,
      cpuTimeP99Ms: row.quantiles.cpuTimeP99,
    };
  } catch {
    return null;
  }
}
