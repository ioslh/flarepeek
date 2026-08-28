import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const tailSessionSchema = z.object({
  id: z.string(),
  expires_at: z.string(),
  url: z.string(),
});

export interface TailSession {
  id: string;
  websocketUrl: string;
  expiresAt: string;
}

// Mandatory for the tail websocket to accept the connection — confirmed by
// reading wrangler's own createTail() (src/tail/createTail.ts in the
// `wrangler` npm package's bundled CLI), which is the only place this
// requirement shows up; it isn't documented in the public API reference.
export const TAIL_WEBSOCKET_SUBPROTOCOL = 'trace-v1';

// Starts a tail session on a Worker script and returns the one-shot
// websocket URL to connect to. No filters are sent (`body: {}`) — v1 streams
// everything and lets the UI filter client-side; server-side filters
// (status/method/header/search/sampling) are a documented but unused part of
// this same request body, worth revisiting if the unfiltered volume turns
// out to be too noisy in practice.
export async function startTail(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
): Promise<TailSession> {
  const response = await client.workers.scripts.tail.create(scriptName, {
    account_id: accountId,
    body: {},
  });
  const parsed = tailSessionSchema.parse(response);
  return { id: parsed.id, websocketUrl: parsed.url, expiresAt: parsed.expires_at };
}

// Best-effort cleanup: a failed delete doesn't need to surface to the user —
// the session expires on its own (TailSession.expiresAt) — but per
// community reports (not in the official API reference; needs periodic
// re-verification) a script can only have a handful of concurrent
// undeleted tail sessions before new ones start failing, so callers must
// still always attempt this on stop/unmount rather than skipping it.
export async function stopTail(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
  tailId: string,
): Promise<void> {
  try {
    await client.workers.scripts.tail.delete(tailId, {
      account_id: accountId,
      script_name: scriptName,
    });
  } catch (error) {
    console.warn('[flarepeek] failed to delete tail session', error);
  }
}

const tailLogSchema = z.object({
  timestamp: z.number(),
  level: z.string(),
  message: z.array(z.unknown()),
});

const tailExceptionSchema = z.object({
  timestamp: z.number(),
  name: z.string(),
  message: z.string(),
});

// Disjoint by shape (one has `request`, the other has `cron`), so a plain
// z.union tries each and keeps whichever parses — no discriminant key
// needed, and Cloudflare's own event payload doesn't send one.
const tailRequestEventSchema = z.object({
  request: z.object({
    method: z.string(),
    url: z.string(),
  }),
  response: z.object({ status: z.number() }).optional(),
});

const tailScheduledEventSchema = z.object({
  cron: z.string(),
  scheduledTime: z.number(),
});

// Tolerant like deployments.ts's schema: logs/exceptions default to empty
// arrays and `event` is nullable/optional rather than required, so a shape
// this hasn't seen before degrades to "no request/cron detail" instead of
// dropping the whole event (which would otherwise make the stream look like
// it silently skipped requests).
const tailEventSchema = z.object({
  scriptName: z.string().optional(),
  eventTimestamp: z.number(),
  outcome: z.string(),
  event: z.union([tailRequestEventSchema, tailScheduledEventSchema]).nullable().optional(),
  logs: z.array(tailLogSchema).default([]),
  exceptions: z.array(tailExceptionSchema).default([]),
});

export interface TailLogEntry {
  timestamp: number;
  level: string;
  message: unknown[];
}

export interface TailExceptionEntry {
  timestamp: number;
  name: string;
  message: string;
}

export type TailEventDetail =
  | { kind: 'request'; method: string; url: string; status: number | null }
  | { kind: 'scheduled'; cron: string; scheduledTime: number }
  | { kind: 'none' };

export interface LiveTailEvent {
  scriptName: string | null;
  eventTimestamp: number;
  outcome: string;
  detail: TailEventDetail;
  logs: TailLogEntry[];
  exceptions: TailExceptionEntry[];
}

// Every websocket message is one JSON event, one per line — see
// use-live-tail.ts's onmessage handler. Returns null (instead of throwing)
// for anything that isn't valid JSON or doesn't match the tolerant schema
// above, so one unrecognised message drops silently rather than crashing
// the whole stream.
export function parseTailEvent(raw: string): LiveTailEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = tailEventSchema.safeParse(json);
  if (!parsed.success) return null;
  const { data } = parsed;

  const detail: TailEventDetail = !data.event
    ? { kind: 'none' }
    : 'request' in data.event
      ? {
          kind: 'request',
          method: data.event.request.method,
          url: data.event.request.url,
          status: data.event.response?.status ?? null,
        }
      : {
          kind: 'scheduled',
          cron: data.event.cron,
          scheduledTime: data.event.scheduledTime,
        };

  return {
    scriptName: data.scriptName ?? null,
    eventTimestamp: data.eventTimestamp,
    outcome: data.outcome,
    detail,
    logs: data.logs,
    exceptions: data.exceptions,
  };
}
