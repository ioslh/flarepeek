import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import {
  getCurrentDeploymentVersions,
  listDeployedVersionIds,
  rollbackToVersion,
  setDeploymentSplit,
} from '@/shared/cloudflare-api/deployments';

function fakeClient(deployments: unknown[]) {
  const create = vi.fn(async () => ({}));
  const client = {
    workers: {
      scripts: {
        deployments: {
          list: vi.fn(async () => ({ deployments })),
          create,
        },
      },
    },
  } as unknown as Cloudflare;
  return { client, create };
}

describe('getCurrentDeploymentVersions', () => {
  it('returns the versions from the latest (first) deployment', async () => {
    const { client } = fakeClient([
      {
        id: 'deploy-1',
        versions: [
          { version_id: 'v1', percentage: 95 },
          { version_id: 'v2', percentage: 5 },
        ],
      },
      { id: 'deploy-0', versions: [{ version_id: 'v0', percentage: 100 }] },
    ]);

    expect(await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).toEqual([
      { versionId: 'v1', percentage: 95 },
      { versionId: 'v2', percentage: 5 },
    ]);
  });

  it('returns an empty array when there are no deployments', async () => {
    const { client } = fakeClient([]);
    expect(await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).toEqual([]);
  });
});

describe('listDeployedVersionIds', () => {
  it('collects version ids across every deployment in the history, not just the latest', async () => {
    const { client } = fakeClient([
      {
        id: 'deploy-1',
        versions: [
          { version_id: 'v1', percentage: 95 },
          { version_id: 'v2', percentage: 5 },
        ],
      },
      { id: 'deploy-0', versions: [{ version_id: 'v0', percentage: 100 }] },
    ]);

    expect(await listDeployedVersionIds(client, 'acct-1', 'my-worker')).toEqual(
      new Set(['v1', 'v2', 'v0']),
    );
  });

  it('returns an empty set when there is no deployment history', async () => {
    const { client } = fakeClient([]);
    expect(await listDeployedVersionIds(client, 'acct-1', 'my-worker')).toEqual(new Set());
  });
});

describe('setDeploymentSplit', () => {
  it('creates a percentage-strategy deployment with the given versions', async () => {
    const { client, create } = fakeClient([]);

    await setDeploymentSplit(client, 'acct-1', 'my-worker', [
      { versionId: 'v1', percentage: 90 },
      { versionId: 'v2', percentage: 10 },
    ]);

    expect(create).toHaveBeenCalledWith('my-worker', {
      account_id: 'acct-1',
      strategy: 'percentage',
      versions: [
        { version_id: 'v1', percentage: 90 },
        { version_id: 'v2', percentage: 10 },
      ],
    });
  });
});

describe('rollbackToVersion', () => {
  it('creates a single-version deployment at 100%', async () => {
    const { client, create } = fakeClient([]);

    await rollbackToVersion(client, 'acct-1', 'my-worker', 'v1');

    expect(create).toHaveBeenCalledWith('my-worker', {
      account_id: 'acct-1',
      strategy: 'percentage',
      versions: [{ version_id: 'v1', percentage: 100 }],
    });
  });
});
