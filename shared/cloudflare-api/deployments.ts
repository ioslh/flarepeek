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

// The first deployment returned by the API is the one actively serving
// traffic; it holds one version (100%) or two (a gradual rollout split).
// Version Overrides can only target a version that appears in this list.
export async function getCurrentDeploymentVersions(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
): Promise<DeploymentVersion[]> {
  const response = await client.workers.scripts.deployments.list(scriptName, {
    account_id: accountId,
  });
  const parsed = deploymentListResponseSchema.parse(response);
  const currentDeployment = parsed.deployments[0];
  if (!currentDeployment) return [];

  return currentDeployment.versions.map((version) => ({
    versionId: version.version_id,
    percentage: version.percentage,
  }));
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
): Promise<void> {
  await client.workers.scripts.deployments.create(scriptName, {
    account_id: accountId,
    strategy: 'percentage',
    versions: versions.map((version) => ({
      version_id: version.versionId,
      percentage: version.percentage,
    })),
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
