import { describe, expect, it, vi } from 'vitest';
import type Cloudflare from 'cloudflare';
import { parseTailEvent, startTail, stopTail } from '@/shared/cloudflare-api/tail';

function fakeClient(createResult: unknown, deleteImpl?: () => Promise<unknown>) {
  const create = vi.fn(async () => createResult);
  const del = vi.fn(deleteImpl ?? (async () => ({ success: true, errors: [], messages: [] })));
  const client = {
    workers: {
      scripts: {
        tail: {
          create,
          delete: del,
        },
      },
    },
  } as unknown as Cloudflare;
  return { client, create, del };
}

describe('startTail', () => {
  it('creates a tail session with an empty filter body and returns the parsed session', async () => {
    const { client, create } = fakeClient({
      id: 'tail-1',
      expires_at: '2026-08-27T12:00:00Z',
      url: 'wss://example.test/tail-1',
    });

    const session = await startTail(client, 'acct-1', 'my-worker');

    expect(create).toHaveBeenCalledWith('my-worker', { account_id: 'acct-1', body: {} });
    expect(session).toEqual({
      id: 'tail-1',
      websocketUrl: 'wss://example.test/tail-1',
      expiresAt: '2026-08-27T12:00:00Z',
    });
  });
});

describe('stopTail', () => {
  it('deletes the tail session with the account/script/id', async () => {
    const { client, del } = fakeClient(null);

    await stopTail(client, 'acct-1', 'my-worker', 'tail-1');

    expect(del).toHaveBeenCalledWith('tail-1', { account_id: 'acct-1', script_name: 'my-worker' });
  });

  it('swallows a failed delete instead of throwing', async () => {
    const { client } = fakeClient(null, async () => {
      throw new Error('boom');
    });

    await expect(stopTail(client, 'acct-1', 'my-worker', 'tail-1')).resolves.toBeUndefined();
  });
});

describe('parseTailEvent', () => {
  it('parses a request event', () => {
    const event = parseTailEvent(
      JSON.stringify({
        scriptName: 'my-worker',
        eventTimestamp: 1000,
        outcome: 'ok',
        event: {
          request: { method: 'GET', url: 'https://example.test/' },
          response: { status: 200 },
        },
        logs: [{ timestamp: 1000, level: 'log', message: ['hello'] }],
        exceptions: [],
      }),
    );

    expect(event).toEqual({
      scriptName: 'my-worker',
      eventTimestamp: 1000,
      outcome: 'ok',
      detail: { kind: 'request', method: 'GET', url: 'https://example.test/', status: 200 },
      logs: [{ timestamp: 1000, level: 'log', message: ['hello'] }],
      exceptions: [],
    });
  });

  it('parses a scheduled (cron) event', () => {
    const event = parseTailEvent(
      JSON.stringify({
        eventTimestamp: 2000,
        outcome: 'ok',
        event: { cron: '* * * * *', scheduledTime: 2000 },
        logs: [],
        exceptions: [],
      }),
    );

    expect(event?.detail).toEqual({ kind: 'scheduled', cron: '* * * * *', scheduledTime: 2000 });
    expect(event?.scriptName).toBeNull();
  });

  it('parses an exception with a missing/null event as kind "none"', () => {
    const event = parseTailEvent(
      JSON.stringify({
        eventTimestamp: 3000,
        outcome: 'exception',
        event: null,
        logs: [],
        exceptions: [{ timestamp: 3000, name: 'TypeError', message: 'boom' }],
      }),
    );

    expect(event?.detail).toEqual({ kind: 'none' });
    expect(event?.exceptions).toEqual([{ timestamp: 3000, name: 'TypeError', message: 'boom' }]);
  });

  it('defaults missing logs/exceptions to empty arrays', () => {
    const event = parseTailEvent(JSON.stringify({ eventTimestamp: 4000, outcome: 'ok' }));
    expect(event).toMatchObject({ logs: [], exceptions: [] });
  });

  it('returns null for invalid JSON', () => {
    expect(parseTailEvent('not json')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseTailEvent(JSON.stringify({ outcome: 'ok' }))).toBeNull();
  });
});
