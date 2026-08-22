const DASHBOARD_BASE = 'https://dash.cloudflare.com';

// Confirmed against a real URL (not guessed): the dashboard's classic
// "Workers & Pages" product still uses this direct path — no /?to= redirect
// involved. "production" is the fixed environment name; this extension has
// no concept of multiple environments, so it's hardcoded.
export function workerDashboardUrl(accountId: string, scriptName: string): string {
  return `${DASHBOARD_BASE}/${accountId}/workers/services/view/${scriptName}/production`;
}

// Also confirmed against real URLs — same direct-path family as
// workerDashboardUrl, one level deeper (product/collection/resource-id).
export function kvNamespaceDashboardUrl(accountId: string, namespaceId: string): string {
  return `${DASHBOARD_BASE}/${accountId}/workers/kv/namespaces/${namespaceId}/metrics`;
}

export function d1DatabaseDashboardUrl(accountId: string, databaseId: string): string {
  return `${DASHBOARD_BASE}/${accountId}/workers/d1/databases/${databaseId}/metrics`;
}

// R2 lives outside the /workers/ tree and is keyed by bucket name, not an
// id — "default" is the jurisdiction segment (confirmed for the common case;
// buckets with a restricted jurisdiction — eu/fedramp/fedramp-high, see
// bindings.ts — presumably use that value instead, though only the default
// case has been checked against a real URL).
export function r2BucketDashboardUrl(
  accountId: string,
  bucketName: string,
  jurisdiction: string | null,
): string {
  return `${DASHBOARD_BASE}/${accountId}/r2/${jurisdiction ?? 'default'}/buckets/${bucketName}`;
}

// Confirmed against a real URL. The binding data only carries a queue_name
// (see bindings.ts), so this needs a queue_id resolved elsewhere first —
// use-bindings.ts does that via shared/cloudflare-api/queues.ts's
// listQueues() and attaches it to the binding as queueId.
export function queueDashboardUrl(accountId: string, queueId: string): string {
  return `${DASHBOARD_BASE}/${accountId}/workers/queues/${queueId}/metrics`;
}

// The rest of these use Cloudflare's documented "open in dashboard" redirect
// scheme instead (github.com/cloudflare/cloudflare-docs,
// src/content/dash-routes/core.json) since there's no known direct-path
// equivalent for zone-scoped pages — unlike workerDashboardUrl above, these
// haven't been checked against a real example yet.

export function zoneOverviewUrl(accountId: string, zoneName: string): string {
  return `${DASHBOARD_BASE}/?to=/${accountId}/${zoneName}/`;
}

export function zoneWorkersAnalyticsUrl(accountId: string, zoneName: string): string {
  return `${DASHBOARD_BASE}/?to=/${accountId}/${zoneName}/analytics/workers`;
}

export function zoneInstantLogsUrl(accountId: string, zoneName: string): string {
  return `${DASHBOARD_BASE}/?to=/${accountId}/${zoneName}/analytics/instant-logs`;
}

const BINDING_DASHBOARD_PATHS: Record<string, string> = {
  kv_namespace: 'workers/kv/namespaces',
  d1: 'workers/d1',
  r2_bucket: 'r2/overview',
  durable_object_namespace: 'workers/durable-objects',
  queue: 'workers/queues',
  workflow: 'workers/workflows',
  hyperdrive: 'workers/hyperdrive',
  browser: 'workers/browser-rendering',
  browser_rendering: 'workers/browser-rendering',
  ai: 'ai/workers-ai',
  analytics_engine: 'workers/analytics-engine',
  vectorize: 'ai/vectorize',
  secrets_store_secret: 'secrets-store',
  images: 'images/hosted',
  pipelines: 'pipelines/overview',
  service: 'workers-and-pages',
};

export interface BindingLinkInfo {
  type: string;
  namespaceId: string | null;
  databaseId: string | null;
  bucketName: string | null;
  jurisdiction: string | null;
  queueId: string | null;
}

// Prefers a precise per-resource link when the binding carries what it takes
// to build one (KV, D1, R2, and Queue — all confirmed against real URLs; see
// shared/cloudflare-api/bindings.ts for why other kinds can't, e.g. Durable
// Objects only have a class_name with no matching list endpoint at all).
// Falls back to the type's product-level list page — including for a queue
// binding whose queueId hasn't been resolved yet, or failed to resolve — or
// null when the type has no dashboard page of its own (e.g.
// plain_text/secret_text/json vars only exist inside a specific Worker's own
// settings — a page this redirect scheme can't reach).
export function bindingDashboardUrl(accountId: string, binding: BindingLinkInfo): string | null {
  if (binding.type === 'kv_namespace' && binding.namespaceId) {
    return kvNamespaceDashboardUrl(accountId, binding.namespaceId);
  }
  if (binding.type === 'd1' && binding.databaseId) {
    return d1DatabaseDashboardUrl(accountId, binding.databaseId);
  }
  if (binding.type === 'r2_bucket' && binding.bucketName) {
    return r2BucketDashboardUrl(accountId, binding.bucketName, binding.jurisdiction);
  }
  if (binding.type === 'queue' && binding.queueId) {
    return queueDashboardUrl(accountId, binding.queueId);
  }

  const path = BINDING_DASHBOARD_PATHS[binding.type];
  return path ? `${DASHBOARD_BASE}/?to=/${accountId}/${path}` : null;
}
