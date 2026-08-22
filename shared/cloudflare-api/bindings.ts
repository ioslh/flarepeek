import type Cloudflare from 'cloudflare';
import { z } from 'zod';

// Every binding kind (KV, D1, R2, Durable Objects, Queues, secrets, ...) is a
// different interface in the SDK, with a different field name for its
// resource ID (namespace_id, database_id, bucket_name, ...). Captured as
// optional here since most binding kinds have none of these — used by
// dashboard-links.ts to build a precise per-resource link where possible.
// The GET response never includes a secret's actual value — only its name
// and type — so this is safe to display as-is regardless.
const bindingSchema = z.object({
  type: z.string(),
  name: z.string(),
  namespace_id: z.string().optional(),
  database_id: z.string().optional(),
  bucket_name: z.string().optional(),
  jurisdiction: z.string().optional(),
  queue_name: z.string().optional(),
});

const settingsSchema = z.object({
  bindings: z.array(bindingSchema).optional(),
});

export interface WorkerBinding {
  type: string;
  name: string;
  namespaceId: string | null;
  databaseId: string | null;
  bucketName: string | null;
  jurisdiction: string | null;
  // The bindings API only ever gives us the queue's name, never its id (see
  // queue_name above) — queueId starts null and is filled in by
  // use-bindings.ts's separate client.queues.list() lookup, since resolving
  // it here would mean listBindings() making a second API call for every
  // binding kind on the off chance one of them is a queue.
  queueName: string | null;
  queueId: string | null;
}

export async function listBindings(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
): Promise<WorkerBinding[]> {
  const response = await client.workers.scripts.scriptAndVersionSettings.get(scriptName, {
    account_id: accountId,
  });
  const parsed = settingsSchema.parse(response);

  return (parsed.bindings ?? []).map((binding) => ({
    type: binding.type,
    name: binding.name,
    namespaceId: binding.namespace_id ?? null,
    databaseId: binding.database_id ?? null,
    bucketName: binding.bucket_name ?? null,
    jurisdiction: binding.jurisdiction ?? null,
    queueName: binding.queue_name ?? null,
    queueId: null,
  }));
}
