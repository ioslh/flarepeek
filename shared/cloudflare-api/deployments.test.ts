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
  it('returns the versions from the latest (first) deployment as current', async () => {
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

    expect(await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).toEqual({
      current: [
        { versionId: 'v1', percentage: 95 },
        { versionId: 'v2', percentage: 5 },
      ],
      previous: [{ versionId: 'v0', percentage: 100 }],
      boundaryTrail: [],
    });
  });

  it('returns previous: null when there is only one deployment in history', async () => {
    const { client } = fakeClient([
      { id: 'deploy-0', versions: [{ version_id: 'v0', percentage: 100 }] },
    ]);

    expect(await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).toEqual({
      current: [{ versionId: 'v0', percentage: 100 }],
      previous: null,
      boundaryTrail: [],
    });
  });

  it('returns empty current and null previous when there are no deployments', async () => {
    const { client } = fakeClient([]);
    expect(await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).toEqual({
      current: [],
      previous: null,
      boundaryTrail: [],
    });
  });
});

function twoVersionDeployment(id: string, a: string, b: string, percentB: number) {
  return {
    id,
    versions: [
      { version_id: a, percentage: 100 - percentB },
      { version_id: b, percentage: percentB },
    ],
  };
}

describe('getCurrentDeploymentVersions boundaryTrail', () => {
  it('collects earlier boundary positions of the same rollout, newest first', async () => {
    const { client } = fakeClient([
      twoVersionDeployment('d3', 'v1', 'v2', 40),
      twoVersionDeployment('d2', 'v1', 'v2', 25),
      twoVersionDeployment('d1', 'v1', 'v2', 5),
    ]);

    const snapshot = await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker');
    expect(snapshot.boundaryTrail).toEqual([25, 5]);
  });

  it('stops at the first deployment with a different version set', async () => {
    const { client } = fakeClient([
      twoVersionDeployment('d3', 'v1', 'v2', 40),
      twoVersionDeployment('d2', 'v1', 'v2', 10),
      twoVersionDeployment('d1', 'v0', 'v1', 50),
      twoVersionDeployment('d0', 'v1', 'v2', 99),
    ]);

    // The v0/v1 rollout ends the walk — the older v1/v2 entry beyond it is
    // a separate, earlier rollout and must not be picked up.
    const snapshot = await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker');
    expect(snapshot.boundaryTrail).toEqual([10]);
  });

  it('treats the same two versions in swapped slots as a different rollout', async () => {
    const { client } = fakeClient([
      twoVersionDeployment('d2', 'v1', 'v2', 40),
      twoVersionDeployment('d1', 'v2', 'v1', 40),
    ]);

    expect(
      (await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).boundaryTrail,
    ).toEqual([]);
  });

  it('is empty for a single-version deployment, which has no boundary', async () => {
    const { client } = fakeClient([
      { id: 'd2', versions: [{ version_id: 'v2', percentage: 100 }] },
      twoVersionDeployment('d1', 'v1', 'v2', 40),
    ]);

    expect(
      (await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).boundaryTrail,
    ).toEqual([]);
  });

  it('caps the trail rather than walking the whole history', async () => {
    const { client } = fakeClient([
      twoVersionDeployment('d6', 'v1', 'v2', 60),
      twoVersionDeployment('d5', 'v1', 'v2', 50),
      twoVersionDeployment('d4', 'v1', 'v2', 40),
      twoVersionDeployment('d3', 'v1', 'v2', 30),
      twoVersionDeployment('d2', 'v1', 'v2', 20),
      twoVersionDeployment('d1', 'v1', 'v2', 10),
    ]);

    expect(
      (await getCurrentDeploymentVersions(client, 'acct-1', 'my-worker')).boundaryTrail,
    ).toEqual([50, 40, 30, 20]);
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

  it('includes an annotations.message when a message is given', async () => {
    const { client, create } = fakeClient([]);

    await setDeploymentSplit(
      client,
      'acct-1',
      'my-worker',
      [{ versionId: 'v1', percentage: 100 }],
      'rolling out the new checkout flow',
    );

    expect(create).toHaveBeenCalledWith('my-worker', {
      account_id: 'acct-1',
      strategy: 'percentage',
      versions: [{ version_id: 'v1', percentage: 100 }],
      annotations: { 'workers/message': 'rolling out the new checkout flow' },
    });
  });

  it('omits annotations entirely when no message is given', async () => {
    const { client, create } = fakeClient([]);

    await setDeploymentSplit(client, 'acct-1', 'my-worker', [{ versionId: 'v1', percentage: 100 }]);

    expect(create).toHaveBeenCalledWith(
      'my-worker',
      expect.not.objectContaining({ annotations: expect.anything() }),
    );
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
