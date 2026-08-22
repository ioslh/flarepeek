import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { getRecentErrors } from '@/shared/cloudflare-api/recent-errors';

function fakeClient(queryImpl: (params: unknown) => unknown): Cloudflare {
  return {
    workers: {
      observability: {
        telemetry: {
          query: vi.fn(queryImpl),
        },
      },
    },
  } as unknown as Cloudflare;
}

describe('getRecentErrors', () => {
  it('filters by service name and error existence, sorted newest first', async () => {
    let capturedParams: unknown;
    const client = fakeClient((params) => {
      capturedParams = params;
      return {
        events: {
          events: [
            { timestamp: 1000, $metadata: { id: 'a', error: 'first' } },
            { timestamp: 3000, $metadata: { id: 'b', error: 'second', statusCode: 500 } },
            { timestamp: 2000, $metadata: { id: 'c', message: 'third' } },
          ],
        },
      };
    });

    const errors = await getRecentErrors(client, 'acct-1', 'my-worker');

    expect(errors.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(errors[0]).toEqual({
      id: 'b',
      timestamp: 3000,
      message: 'second',
      requestId: null,
      statusCode: 500,
    });

    const params = capturedParams as {
      account_id: string;
      view: string;
      parameters: { filters: Array<{ key: string; value?: unknown }> };
    };
    expect(params.account_id).toBe('acct-1');
    expect(params.view).toBe('events');
    expect(params.parameters.filters).toEqual([
      { key: '$metadata.service', type: 'string', operation: 'eq', value: 'my-worker' },
      { key: '$metadata.error', type: 'string', operation: 'exists' },
    ]);
  });

  it('returns an empty array when there are no matching events', async () => {
    const client = fakeClient(() => ({ events: { events: [] } }));
    expect(await getRecentErrors(client, 'acct-1', 'my-worker')).toEqual([]);
  });

  it('returns an empty array when the events field is missing entirely', async () => {
    const client = fakeClient(() => ({}));
    expect(await getRecentErrors(client, 'acct-1', 'my-worker')).toEqual([]);
  });
});
