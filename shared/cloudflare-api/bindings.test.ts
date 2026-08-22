import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { listBindings } from '@/shared/cloudflare-api/bindings';

function fakeClient(bindings: unknown): Cloudflare {
  return {
    workers: {
      scripts: {
        scriptAndVersionSettings: {
          get: vi.fn(async () => ({ bindings })),
        },
      },
    },
  } as unknown as Cloudflare;
}

const noResourceIds = {
  namespaceId: null,
  databaseId: null,
  bucketName: null,
  jurisdiction: null,
  queueName: null,
  queueId: null,
};

describe('listBindings', () => {
  it('returns the type, name, and resource id (where present) of each binding', async () => {
    const client = fakeClient([
      { type: 'kv_namespace', name: 'MY_KV', namespace_id: 'ns-1' },
      { type: 'd1', name: 'MY_DB', database_id: 'db-1' },
      { type: 'r2_bucket', name: 'MY_BUCKET', bucket_name: 'my-bucket', jurisdiction: 'eu' },
      { type: 'queue', name: 'MY_QUEUE', queue_name: 'my-queue' },
      { type: 'secret_text', name: 'API_KEY' },
    ]);

    expect(await listBindings(client, 'acct-1', 'my-worker')).toEqual([
      { ...noResourceIds, type: 'kv_namespace', name: 'MY_KV', namespaceId: 'ns-1' },
      { ...noResourceIds, type: 'd1', name: 'MY_DB', databaseId: 'db-1' },
      {
        ...noResourceIds,
        type: 'r2_bucket',
        name: 'MY_BUCKET',
        bucketName: 'my-bucket',
        jurisdiction: 'eu',
      },
      { ...noResourceIds, type: 'queue', name: 'MY_QUEUE', queueName: 'my-queue' },
      { ...noResourceIds, type: 'secret_text', name: 'API_KEY' },
    ]);
  });

  it('returns an empty array when there are no bindings', async () => {
    const client = fakeClient(undefined);
    expect(await listBindings(client, 'acct-1', 'my-worker')).toEqual([]);
  });
});
