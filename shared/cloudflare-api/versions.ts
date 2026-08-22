import type Cloudflare from 'cloudflare';
import { z } from 'zod';

// `annotations` isn't declared on the cloudflare npm SDK's VersionListResponse
// type (checked — it's genuinely missing there), but it's really in the API
// response: confirmed against a real account via `wrangler versions list
// --json`, which is how `wrangler versions upload --tag`/`--message` surface
// back. 'workers/tag' and 'workers/message' are both absent unless the
// uploader explicitly set them.
const versionSchema = z.object({
  id: z.string(),
  metadata: z
    .object({
      created_on: z.string().optional(),
      author_email: z.string().optional(),
    })
    .optional(),
  annotations: z
    .object({
      'workers/tag': z.string().optional(),
      'workers/message': z.string().optional(),
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
  tag: string | null;
  message: string | null;
}

// Cloudflare's own deploy/rollback eligibility window is the 100 most
// recently published versions (raised from 10 in Sept 2025 — confirmed via
// https://developers.cloudflare.com/changelog/post/2025-09-11-increased-version-rollback-limit/).
// 40 here is our own choice of how much of that window to show by default in
// the version picker (entrypoints/sidepanel/version-switcher/version-picker.tsx)
// — confirmed against a real account that `per_page` isn't capped anywhere
// near this, so it's just a "how much is worth rendering" call, not a limit
// we're bumping up against.
const DEFAULT_LIMIT = 40;

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
      tag: version.annotations?.['workers/tag'] ?? null,
      message: version.annotations?.['workers/message'] ?? null,
    }))
    .sort((a, b) => (b.createdOn ?? '').localeCompare(a.createdOn ?? ''));
}
