import { describe, expect, it } from 'vitest';
import { buildUnifiedVersions } from '@/entrypoints/sidepanel/version-switcher/versions-list-utils';
import type { DeploymentVersionsState } from '@/shared/worker-panel/use-deployment-versions';
import type { RecentVersionsState } from '@/entrypoints/sidepanel/version-switcher/use-recent-versions';

function recentVersion(id: string, everDeployed: boolean) {
  return {
    id,
    createdOn: '2026-08-01T00:00:00Z',
    authorEmail: 'me@acme.test',
    tag: `tag-${id}`,
    message: null,
    everDeployed,
  };
}

describe('buildUnifiedVersions', () => {
  it('returns empty live and recent when both fetches are still loading', () => {
    const deployment: DeploymentVersionsState = { status: 'loading' };
    const recentVersions: RecentVersionsState = { status: 'loading' };

    expect(buildUnifiedVersions(deployment, recentVersions)).toEqual({ live: [], recent: [] });
  });

  it('produces no live entries when the Worker has never been deployed', () => {
    const deployment: DeploymentVersionsState = { status: 'ready', versions: [] };
    const recentVersions: RecentVersionsState = {
      status: 'ready',
      versions: [recentVersion('v1', false)],
    };

    const result = buildUnifiedVersions(deployment, recentVersions);

    expect(result.live).toEqual([]);
    expect(result.recent).toEqual([
      {
        versionId: 'v1',
        percentage: null,
        tag: 'tag-v1',
        message: null,
        createdOn: '2026-08-01T00:00:00Z',
        everDeployed: false,
      },
    ]);
  });

  it('enriches a single 100% live version and excludes it from recent', () => {
    const deployment: DeploymentVersionsState = {
      status: 'ready',
      versions: [{ versionId: 'v1', percentage: 100 }],
    };
    const recentVersions: RecentVersionsState = {
      status: 'ready',
      versions: [recentVersion('v1', true), recentVersion('v2', false)],
    };

    const result = buildUnifiedVersions(deployment, recentVersions);

    expect(result.live).toEqual([
      {
        versionId: 'v1',
        percentage: 100,
        tag: 'tag-v1',
        message: null,
        createdOn: '2026-08-01T00:00:00Z',
        everDeployed: true,
      },
    ]);
    expect(result.recent.map((v) => v.versionId)).toEqual(['v2']);
  });

  it('handles two live versions with overlapping recent-versions metadata, no duplicates', () => {
    const deployment: DeploymentVersionsState = {
      status: 'ready',
      versions: [
        { versionId: 'v1', percentage: 80 },
        { versionId: 'v2', percentage: 20 },
      ],
    };
    const recentVersions: RecentVersionsState = {
      status: 'ready',
      versions: [recentVersion('v1', true), recentVersion('v2', true), recentVersion('v3', false)],
    };

    const result = buildUnifiedVersions(deployment, recentVersions);

    expect(result.live.map((v) => v.versionId)).toEqual(['v1', 'v2']);
    expect(result.live.every((v) => v.everDeployed === true)).toBe(true);
    expect(result.recent.map((v) => v.versionId)).toEqual(['v3']);
  });

  it('leaves tag/message/createdOn null for a live version missing from the recent-versions fetch', () => {
    const deployment: DeploymentVersionsState = {
      status: 'ready',
      versions: [{ versionId: 'stale-version', percentage: 100 }],
    };
    const recentVersions: RecentVersionsState = { status: 'ready', versions: [] };

    const result = buildUnifiedVersions(deployment, recentVersions);

    expect(result.live).toEqual([
      {
        versionId: 'stale-version',
        percentage: 100,
        tag: null,
        message: null,
        createdOn: null,
        everDeployed: true,
      },
    ]);
  });
});
