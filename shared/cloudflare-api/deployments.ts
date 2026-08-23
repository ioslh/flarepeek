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
