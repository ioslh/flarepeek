import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { listQueues } from '@/shared/cloudflare-api/queues';

function fakeClient(queues: Array<{ queue_id: string; queue_name: string }>): Cloudflare {
  return {
    queues: {
      list: vi.fn(() => ({
        [Symbol.asyncIterator]: async function* () {
          for (const queue of queues) yield queue;
        },
      })),
    },
  } as unknown as Cloudflare;
}

describe('listQueues', () => {
  it('returns the id and name of every queue in the account', async () => {
    const client = fakeClient([
      { queue_id: 'queue-1', queue_name: 'my-queue' },
      { queue_id: 'queue-2', queue_name: 'other-queue' },
    ]);

    expect(await listQueues(client, 'acct-1')).toEqual([
      { id: 'queue-1', name: 'my-queue' },
      { id: 'queue-2', name: 'other-queue' },
    ]);
    expect(client.queues.list).toHaveBeenCalledWith({ account_id: 'acct-1' });
  });

  it('returns an empty array when the account has no queues', async () => {
    const client = fakeClient([]);
    expect(await listQueues(client, 'acct-1')).toEqual([]);
  });
});
