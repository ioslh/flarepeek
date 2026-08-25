import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const deploymentSchema = z.object({
  id: z.string(),
  versions: z.array(
    z.object({
      version_id: z.string(),
      percentage: z.number(),
    }),
  ),
  // All optional: confirmed present on the SDK's Deployment type, but this
  // schema stays tolerant so a response missing them degrades to a history
  // entry without a timestamp rather than failing the whole parse.
  created_on: z.string().optional(),
  author_email: z.string().optional(),
  annotations: z
    .object({
      'workers/message': z.string().optional(),
      'workers/triggered_by': z.string().optional(),
    })
    .optional(),
});

const deploymentListResponseSchema = z.object({
  deployments: z.array(deploymentSchema),
});

export interface DeploymentVersion {
  versionId: string;
  percentage: number;
}

function toDeploymentVersions(
  deployment: z.infer<typeof deploymentSchema> | undefined,
): DeploymentVersion[] {
  if (!deployment) return [];
  return deployment.versions.map((version) => ({
    versionId: version.version_id,
    percentage: version.percentage,
  }));
}

// How many earlier boundary positions the deployment bar draws as trail
// marks. Past ~4 the marks stop reading as a trajectory and just look like
// noise on the track.
const MAX_BOUNDARY_TRAIL = 4;

// Ordered (not sorted) so that the same two versions in swapped slots counts
// as a different rollout — slot order decides Durable Object affinity, so
// swapping them really is a different thing, not the same rollout continued.
function versionSetKey(deployment: z.infer<typeof deploymentSchema>): string {
  return deployment.versions.map((version) => version.version_id).join('|');
}

// Where the traffic boundary sat in each preceding deployment *of this same
// rollout*, newest first. Walks back only while the version set is
// unchanged: once it differs, that's a different pair of versions and its
// boundary position says nothing about how the current rollout progressed.
// Empty for a single-version deployment, which has no boundary to track.
function computeBoundaryTrail(deployments: z.infer<typeof deploymentSchema>[]): number[] {
  const current = deployments[0];
  if (!current || current.versions.length !== 2) return [];

  const currentKey = versionSetKey(current);
  const trail: number[] = [];

  for (const deployment of deployments.slice(1)) {
    if (trail.length >= MAX_BOUNDARY_TRAIL) break;
    if (versionSetKey(deployment) !== currentKey) break;
    const slotB = deployment.versions[1];
    if (slotB) trail.push(slotB.percentage);
  }

  return trail;
}

export interface DeploymentHistoryEntry {
  id: string;
  createdOn: string | null;
  message: string | null;
  authorEmail: string | null;
  versions: DeploymentVersion[];
}

export interface DeploymentSnapshot {
  // The deployment actively serving traffic; one version (100%) or two (a
  // gradual rollout split). Version Overrides can only target a version
  // that appears here.
  current: DeploymentVersion[];
  // The deployment immediately before `current`, or null if there isn't
  // one (e.g. a Worker on its first deployment). Used to tell whether a
  // version in `current` is one that was already there ("keep") or one
  // this deployment just introduced ("new") — see version-roles.ts.
  previous: DeploymentVersion[] | null;
  // Slot B's percentage in each earlier deployment of this same rollout,
  // newest first — drawn as faint marks above the deployment bar so the
  // Worker's rollout trajectory is visible at a glance.
  boundaryTrail: number[];
  // The whole list the API returned, newest first, for the read-only history
  // menu behind the deployment id. Comes free with the call above — no extra
  // request — which is why the menu can open instantly.
  history: DeploymentHistoryEntry[];
}

export async function getCurrentDeploymentVersions(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
): Promise<DeploymentSnapshot> {
  const response = await client.workers.scripts.deployments.list(scriptName, {
    account_id: accountId,
  });
  const parsed = deploymentListResponseSchema.parse(response);

  return {
    current: toDeploymentVersions(parsed.deployments[0]),
    previous: parsed.deployments[1] ? toDeploymentVersions(parsed.deployments[1]) : null,
    boundaryTrail: computeBoundaryTrail(parsed.deployments),
    history: parsed.deployments.map((deployment) => ({
      id: deployment.id,
      createdOn: deployment.created_on ?? null,
      message: deployment.annotations?.['workers/message'] ?? null,
      authorEmail: deployment.author_email ?? null,
      versions: toDeploymentVersions(deployment),
    })),
  };
}

// Creates a new deployment — this is a real production traffic change, not a
// read. Callers must gate this behind an explicit confirmation in the UI;
// this function itself has no safety net beyond what the Cloudflare API
// enforces (e.g. `force` stays false so a blocked rollback surfaces as an
// error instead of silently overriding Cloudflare's own safety check).
export async function setDeploymentSplit(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
  versions: DeploymentVersion[],
  message?: string | null,
): Promise<void> {
  await client.workers.scripts.deployments.create(scriptName, {
    account_id: accountId,
    strategy: 'percentage',
    versions: versions.map((version) => ({
      version_id: version.versionId,
      percentage: version.percentage,
    })),
    ...(message ? { annotations: { 'workers/message': message } } : {}),
  });
}

export async function rollbackToVersion(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
  versionId: string,
): Promise<void> {
  await setDeploymentSplit(client, accountId, scriptName, [{ versionId, percentage: 100 }]);
}

// getCurrentDeploymentVersions only reads deployments[0] (the live one) —
// this reads the rest of that same response to answer a different question:
// "has this version ever been part of a deployment Cloudflare still shows
// us history for". Used as a proxy for rollback eligibility in
// use-recent-versions.ts — Cloudflare's own rollback feature only accepts a
// version that's shown up in recent deployment history, and this is the
// same history, not a separate guess at "the last 10" (the API gives no way
// to request more or fewer than whatever it already returns here).
export async function listDeployedVersionIds(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
): Promise<Set<string>> {
  const response = await client.workers.scripts.deployments.list(scriptName, {
    account_id: accountId,
  });
  const parsed = deploymentListResponseSchema.parse(response);
  return new Set(parsed.deployments.flatMap((d) => d.versions.map((v) => v.version_id)));
}
