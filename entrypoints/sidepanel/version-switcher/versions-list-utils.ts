import type { DeploymentVersionsState } from '@/shared/worker-panel/use-deployment-versions';
import type { RecentVersionsState } from '@/entrypoints/sidepanel/version-switcher/use-recent-versions';
import type { DisplayVersion } from '@/shared/worker-panel/version-row';

export interface UnifiedVersions {
  // Currently part of the live deployment (1-2 entries, or 0 for a Worker
  // that's never been deployed) — percentage is always set.
  live: DisplayVersion[];
  // Recently uploaded, not currently live — percentage is always null.
  recent: DisplayVersion[];
}

// The single source of truth for "what versions does this Worker have,
// and which of them are currently live" — merges the live deployment
// (percentages, no tag/message/createdOn on its own) with the recent-
// versions fetch (tag/message/createdOn/everDeployed, no percentage) into
// one shape, so the UI can render them as one list instead of two.
export function buildUnifiedVersions(
  deployment: DeploymentVersionsState,
  recentVersions: RecentVersionsState,
): UnifiedVersions {
  const metaById = new Map(
    recentVersions.status === 'ready' ? recentVersions.versions.map((v) => [v.id, v]) : [],
  );

  const live: DisplayVersion[] =
    deployment.status === 'ready'
      ? deployment.versions.map((version) => {
          const meta = metaById.get(version.versionId);
          return {
            versionId: version.versionId,
            percentage: version.percentage,
            tag: meta?.tag ?? null,
            message: meta?.message ?? null,
            createdOn: meta?.createdOn ?? null,
            everDeployed: true,
          };
        })
      : [];

  const liveIds = new Set(live.map((v) => v.versionId));
  const recent: DisplayVersion[] =
    recentVersions.status === 'ready'
      ? recentVersions.versions
          .filter((version) => !liveIds.has(version.id))
          .map((version) => ({
            versionId: version.id,
            percentage: null,
            tag: version.tag,
            message: version.message,
            createdOn: version.createdOn,
            everDeployed: version.everDeployed,
          }))
      : [];

  return { live, recent };
}
