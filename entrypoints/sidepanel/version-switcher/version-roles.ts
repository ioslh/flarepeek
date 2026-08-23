import type { DeploymentVersion } from '@/shared/cloudflare-api/deployments';

export type VersionRole = 'keep' | 'new' | 'unknown';

// Badges the two live slots as "kept from the previous deployment" or
// "newly introduced by this one" — purely by comparing version ids against
// the previous deployment, not by inspecting deployment messages/metadata.
// A single-slot deployment has no "vs the other slot" story to tell, so it
// always comes back 'keep' (callers don't render a badge for it).
export function computeVersionRoles(
  current: DeploymentVersion[],
  previous: DeploymentVersion[] | null,
): VersionRole[] {
  if (current.length < 2) return current.map(() => 'keep');

  if (!previous) return current.map(() => 'unknown');

  const previousIds = new Set(previous.map((version) => version.versionId));
  const roles: VersionRole[] = current.map((version) =>
    previousIds.has(version.versionId) ? 'keep' : 'new',
  );

  // Both slots being "new" relative to the previous deployment means the
  // whole version set was swapped at once — that's not a gradual rollout
  // with an incumbent and a challenger, so there's no "keep" side to name.
  if (roles.every((role) => role === 'new')) return current.map(() => 'unknown');

  return roles;
}
