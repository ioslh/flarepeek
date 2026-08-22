import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const queueSchema = z.object({
  queue_id: z.string(),
  queue_name: z.string(),
});

export interface QueueSummary {
  id: string;
  name: string;
}

// client.queues.list() has no name filter — this pages through every queue
// in the account and matches by name client-side. Used by use-bindings.ts to
// resolve a queue binding's queue_name (the only thing the bindings API
// gives us, see bindings.ts) to the queue_id its dashboard page needs.
export async function listQueues(client: Cloudflare, accountId: string): Promise<QueueSummary[]> {
  const queues: QueueSummary[] = [];
  for await (const queue of client.queues.list({ account_id: accountId })) {
    const parsed = queueSchema.parse(queue);
    queues.push({ id: parsed.queue_id, name: parsed.queue_name });
  }
  return queues;
}
