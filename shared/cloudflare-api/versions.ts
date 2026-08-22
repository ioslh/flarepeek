import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const versionSchema = z.object({
  id: z.string(),
  metadata: z
    .object({
      created_on: z.string().optional(),
      author_email: z.string().optional(),
    })
    .optional(),
});

const versionListResponseSchema = z.object({
  result: z.object({
    items: z.array(versionSchema).optional(),
  }),
});

export interface RecentVersion {
  id: string;
  createdOn: string | null;
  authorEmail: string | null;
}

const DEFAULT_LIMIT = 10;

// Uses the same "Workers Scripts:Read" permission as deployments/domains —
// this is a sibling endpoint under the same resource family, not a separate
// permission group.
export async function listRecentVersions(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
  limit = DEFAULT_LIMIT,
): Promise<RecentVersion[]> {
  const response = await client.workers.scripts.versions.list(scriptName, {
    account_id: accountId,
    per_page: limit,
  });

  const parsed = versionListResponseSchema.parse(response);
  const versions = parsed.result.items ?? [];

  return versions
    .map((version) => ({
      id: version.id,
      createdOn: version.metadata?.created_on ?? null,
      authorEmail: version.metadata?.author_email ?? null,
    }))
    .sort((a, b) => (b.createdOn ?? '').localeCompare(a.createdOn ?? ''));
}
