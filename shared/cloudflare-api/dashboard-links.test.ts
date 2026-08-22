import { describe, expect, it } from 'vitest';
import {
  bindingDashboardUrl,
  d1DatabaseDashboardUrl,
  kvNamespaceDashboardUrl,
  queueDashboardUrl,
  r2BucketDashboardUrl,
  workerDashboardUrl,
  zoneInstantLogsUrl,
  zoneOverviewUrl,
  zoneWorkersAnalyticsUrl,
} from '@/shared/cloudflare-api/dashboard-links';

const noResourceIds = {
  namespaceId: null,
  databaseId: null,
  bucketName: null,
  jurisdiction: null,
  queueId: null,
};

describe('workerDashboardUrl', () => {
  it('builds the confirmed direct worker URL', () => {
    expect(workerDashboardUrl('5285e103d673ca04470ac307ece266d1', 'toki-website')).toBe(
      'https://dash.cloudflare.com/5285e103d673ca04470ac307ece266d1/workers/services/view/toki-website/production',
    );
  });
});

describe('kvNamespaceDashboardUrl', () => {
  it('builds the confirmed direct KV namespace URL', () => {
    expect(
      kvNamespaceDashboardUrl(
        '5285e103d673ca04470ac307ece266d1',
        '5fb77130ad42483da9f065c8224d5b51',
      ),
    ).toBe(
      'https://dash.cloudflare.com/5285e103d673ca04470ac307ece266d1/workers/kv/namespaces/5fb77130ad42483da9f065c8224d5b51/metrics',
    );
  });
});

describe('d1DatabaseDashboardUrl', () => {
  it('builds the confirmed direct D1 database URL', () => {
    expect(
      d1DatabaseDashboardUrl(
        '5285e103d673ca04470ac307ece266d1',
        '94050add-a49b-4365-9d07-511511925c2f',
      ),
    ).toBe(
      'https://dash.cloudflare.com/5285e103d673ca04470ac307ece266d1/workers/d1/databases/94050add-a49b-4365-9d07-511511925c2f/metrics',
    );
  });
});

describe('r2BucketDashboardUrl', () => {
  it('builds the confirmed direct R2 bucket URL, defaulting the jurisdiction', () => {
    expect(r2BucketDashboardUrl('5285e103d673ca04470ac307ece266d1', 'hidola-dl', null)).toBe(
      'https://dash.cloudflare.com/5285e103d673ca04470ac307ece266d1/r2/default/buckets/hidola-dl',
    );
  });

  it('uses a restricted jurisdiction when the binding specifies one', () => {
    expect(r2BucketDashboardUrl('acct-1', 'my-bucket', 'eu')).toBe(
      'https://dash.cloudflare.com/acct-1/r2/eu/buckets/my-bucket',
    );
  });
});

describe('queueDashboardUrl', () => {
  it('builds the confirmed direct Queue URL', () => {
    expect(
      queueDashboardUrl('5285e103d673ca04470ac307ece266d1', '806a4b28f2214476ae33ffb0f60e1f3e'),
    ).toBe(
      'https://dash.cloudflare.com/5285e103d673ca04470ac307ece266d1/workers/queues/806a4b28f2214476ae33ffb0f60e1f3e/metrics',
    );
  });
});

describe('zone dashboard links', () => {
  it('builds the overview URL', () => {
    expect(zoneOverviewUrl('acct-1', 'example.com')).toBe(
      'https://dash.cloudflare.com/?to=/acct-1/example.com/',
    );
  });

  it('builds the workers analytics URL', () => {
    expect(zoneWorkersAnalyticsUrl('acct-1', 'example.com')).toBe(
      'https://dash.cloudflare.com/?to=/acct-1/example.com/analytics/workers',
    );
  });

  it('builds the instant logs URL', () => {
    expect(zoneInstantLogsUrl('acct-1', 'example.com')).toBe(
      'https://dash.cloudflare.com/?to=/acct-1/example.com/analytics/instant-logs',
    );
  });
});

describe('bindingDashboardUrl', () => {
  it('builds a precise KV namespace link when the namespace id is known', () => {
    expect(
      bindingDashboardUrl('acct-1', {
        ...noResourceIds,
        type: 'kv_namespace',
        namespaceId: 'ns-1',
      }),
    ).toBe('https://dash.cloudflare.com/acct-1/workers/kv/namespaces/ns-1/metrics');
  });

  it('builds a precise D1 database link when the database id is known', () => {
    expect(
      bindingDashboardUrl('acct-1', { ...noResourceIds, type: 'd1', databaseId: 'db-1' }),
    ).toBe('https://dash.cloudflare.com/acct-1/workers/d1/databases/db-1/metrics');
  });

  it('builds a precise R2 bucket link when the bucket name is known', () => {
    expect(
      bindingDashboardUrl('acct-1', {
        ...noResourceIds,
        type: 'r2_bucket',
        bucketName: 'my-bucket',
      }),
    ).toBe('https://dash.cloudflare.com/acct-1/r2/default/buckets/my-bucket');
  });

  it('builds a precise Queue link when the queue id is known', () => {
    expect(
      bindingDashboardUrl('acct-1', { ...noResourceIds, type: 'queue', queueId: 'queue-1' }),
    ).toBe('https://dash.cloudflare.com/acct-1/workers/queues/queue-1/metrics');
  });

  it('falls back to the product page when the resource id is missing', () => {
    expect(bindingDashboardUrl('acct-1', { ...noResourceIds, type: 'kv_namespace' })).toBe(
      'https://dash.cloudflare.com/?to=/acct-1/workers/kv/namespaces',
    );
  });

  it('falls back to the Queues list page when the queue id has not been resolved', () => {
    expect(bindingDashboardUrl('acct-1', { ...noResourceIds, type: 'queue' })).toBe(
      'https://dash.cloudflare.com/?to=/acct-1/workers/queues',
    );
  });

  it('maps other known binding types (no precise link available) to their product page', () => {
    expect(
      bindingDashboardUrl('acct-1', { ...noResourceIds, type: 'durable_object_namespace' }),
    ).toBe('https://dash.cloudflare.com/?to=/acct-1/workers/durable-objects');
  });

  it('returns null for binding types with no product-level page', () => {
    expect(bindingDashboardUrl('acct-1', { ...noResourceIds, type: 'plain_text' })).toBeNull();
    expect(bindingDashboardUrl('acct-1', { ...noResourceIds, type: 'secret_text' })).toBeNull();
  });
});
