import { z } from 'zod';

// Both r2OperationsAdaptiveGroups and r2StorageAdaptiveGroups field names
// confirmed against Cloudflare's own worked GraphQL examples (R2
// observability docs). Uses the `datetime`/Time scalar (full ISO timestamp),
// unlike kv-usage.ts/d1-usage.ts's `date`/Date scalar (YYYY-MM-DD) —
// deliberately not shared, this project's other GraphQL callers each use
// whichever scalar their own dataset's docs confirmed.
const usageResponseSchema = z.object({
  data: z.object({
    viewer: z.object({
      accounts: z.array(
        z.object({
          operations: z.array(
            z.object({
              sum: z.object({ requests: z.number() }),
              dimensions: z.object({ actionType: z.string() }),
            }),
          ),
          storage: z.array(
            z.object({
              max: z.object({ objectCount: z.number(), payloadSize: z.number() }),
              // Requested but unused: Cloudflare's GraphQL Analytics API
              // rejects `orderBy: [datetime_DESC]` unless `datetime` is also
              // selected somewhere in the query (confirmed the hard way
              // against a real account — see the same fix in kv-usage.ts).
              dimensions: z.object({ datetime: z.string() }),
            }),
          ),
        }),
      ),
    }),
  }),
});

// From R2's pricing docs: Class A operations tend to mutate state, Class B
// tend to read it. An actionType this project doesn't recognize is counted
// in neither bucket rather than guessed at — better to under-report than to
// misclassify.
const CLASS_A_ACTIONS = new Set([
  'ListBuckets',
  'PutBucket',
  'ListObjects',
  'PutObject',
  'CopyObject',
  'CompleteMultipartUpload',
  'CreateMultipartUpload',
  'LifecycleStorageTierTransition',
  'ListMultipartUploads',
  'UploadPart',
  'UploadPartCopy',
  'ListParts',
  'PutBucketEncryption',
  'PutBucketCors',
  'PutBucketLifecycleConfiguration',
]);

const CLASS_B_ACTIONS = new Set([
  'HeadBucket',
  'HeadObject',
  'GetObject',
  'UsageSummary',
  'GetBucketEncryption',
  'GetBucketLocation',
  'GetBucketCors',
  'GetBucketLifecycleConfiguration',
]);

export interface R2BucketUsage {
  classAOperations: number;
  classBOperations: number;
  objectCount: number;
  storageBytes: number;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getR2BucketUsage(
  apiToken: string,
  accountId: string,
  bucketName: string,
): Promise<R2BucketUsage | null> {
  const until = new Date();
  const since = new Date(until.getTime() - WINDOW_MS);
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();

  const query = `{
    viewer {
      accounts(filter: { accountTag: ${JSON.stringify(accountId)} }) {
        operations: r2OperationsAdaptiveGroups(
          filter: {
            bucketName: ${JSON.stringify(bucketName)}
            datetime_geq: ${JSON.stringify(sinceIso)}
            datetime_leq: ${JSON.stringify(untilIso)}
          }
          limit: 1000
        ) {
          sum { requests }
          dimensions { actionType }
        }
        storage: r2StorageAdaptiveGroups(
          filter: {
            bucketName: ${JSON.stringify(bucketName)}
            datetime_geq: ${JSON.stringify(sinceIso)}
            datetime_leq: ${JSON.stringify(untilIso)}
          }
          orderBy: [datetime_DESC]
          limit: 1
        ) {
          max { objectCount payloadSize }
          dimensions { datetime }
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
      console.error('[r2-usage] non-OK response', response.status, await response.text());
      return null;
    }

    const body: unknown = await response.json();
    const parsed = usageResponseSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[r2-usage] response did not match expected shape', body, parsed.error.issues);
      return null;
    }

    const account = parsed.data.data.viewer.accounts[0];
    const storageRow = account?.storage[0];
    if (!account || !storageRow) {
      console.error('[r2-usage] no matching storage row', parsed.data);
      return null;
    }

    let classAOperations = 0;
    let classBOperations = 0;
    for (const row of account.operations) {
      if (CLASS_A_ACTIONS.has(row.dimensions.actionType)) classAOperations += row.sum.requests;
      else if (CLASS_B_ACTIONS.has(row.dimensions.actionType)) classBOperations += row.sum.requests;
    }

    return {
      classAOperations,
      classBOperations,
      objectCount: storageRow.max.objectCount,
      storageBytes: storageRow.max.payloadSize,
    };
  } catch {
    return null;
  }
}
