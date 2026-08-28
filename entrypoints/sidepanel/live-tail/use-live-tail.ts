import { useCallback, useEffect, useRef, useState } from 'react';
import {
  classifyCloudflareError,
  type CloudflareApiErrorKind,
} from '@/shared/cloudflare-api/errors';
import {
  parseTailEvent,
  startTail,
  stopTail,
  TAIL_WEBSOCKET_SUBPROTOCOL,
  type LiveTailEvent,
} from '@/shared/cloudflare-api/tail';
import { pushCapped } from '@/entrypoints/sidepanel/live-tail/tail-event-log';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

export type LiveTailState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'streaming'; events: LiveTailEvent[]; paused: boolean }
  // Optimistic: entered the instant stop() is called, before the socket's
  // own close event (which can lag noticeably behind a busy stream) has a
  // chance to arrive — see stop()'s comment.
  | { status: 'stopping'; events: LiveTailEvent[] }
  | { status: 'ended'; events: LiveTailEvent[]; reason: 'stopped' | 'closed' }
  | { status: 'error'; kind: CloudflareApiErrorKind };

export interface UseLiveTailResult {
  state: LiveTailState;
  start: () => void;
  stop: () => void;
  clear: () => void;
  togglePause: () => void;
}

interface ActiveSession {
  accountId: string;
  scriptName: string;
  client: ResolvedWorker['client'];
  tailId: string;
  socket: WebSocket;
  userStopped: boolean;
  hadError: boolean;
}

// Owns the whole tail session lifecycle: POST to create it, open the
// returned websocket, stream parsed events into state, and DELETE the
// session again on stop/unmount. Called unconditionally at the top of
// deployment-bar.tsx, alongside its other data hooks — that component stays
// mounted for as long as this pinned/live tab does (see
// docs/sidepanel-tabs-design.md's lazy-mount / keep-alive rule), which is
// what lets a session started here keep running after the Live Tail view is
// closed (see docs/sidepanel-tabs-design.md's mounting-strategy section for
// the same "stays alive, just hidden" pattern applied to tabs).
export function useLiveTail(resolved: ResolvedWorker): UseLiveTailResult {
  const [state, setState] = useState<LiveTailState>({ status: 'idle' });

  // The one source of truth for "is a session running" — a ref, not React
  // state, because the websocket event handlers below need synchronous,
  // always-current access to it (including from the unmount cleanup effect,
  // which can't wait for a re-render).
  const sessionRef = useRef<ActiveSession | null>(null);
  // Bumped on every start()/stop() so a startTail() response that resolves
  // after the user already moved on (stopped, or clicked start a second
  // time) can recognise it's stale and clean up instead of opening a socket
  // nobody wants.
  const generationRef = useRef(0);

  const start = useCallback(() => {
    if (sessionRef.current) return;
    const generation = ++generationRef.current;
    setState({ status: 'starting' });

    (async () => {
      let sessionInfo;
      try {
        sessionInfo = await startTail(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
        );
      } catch (error) {
        if (generationRef.current === generation) {
          setState({ status: 'error', kind: classifyCloudflareError(error).kind });
        }
        return;
      }

      if (generationRef.current !== generation) {
        // stop() (or a second start()) ran while the request was in flight —
        // don't leak a session nobody will ever read from.
        void stopTail(
          resolved.client,
          resolved.worker.accountId,
          resolved.worker.scriptName,
          sessionInfo.id,
        );
        return;
      }

      const socket = new WebSocket(sessionInfo.websocketUrl, TAIL_WEBSOCKET_SUBPROTOCOL);
      // The broker sends tail events as binary frames (confirmed via
      // DevTools' Network > Messages panel: only the client's own {"debug":
      // false} handshake is a text frame, every inbound event is "Binary
      // Message"). wrangler doesn't hit this because Node's `ws` hands both
      // frame types to the same Buffer-based callback; the browser's default
      // binaryType ('blob') would need an async .text() read, so switch to
      // 'arraybuffer' and decode synchronously in onmessage instead.
      socket.binaryType = 'arraybuffer';
      const session: ActiveSession = {
        accountId: resolved.worker.accountId,
        scriptName: resolved.worker.scriptName,
        client: resolved.client,
        tailId: sessionInfo.id,
        socket,
        userStopped: false,
        hadError: false,
      };
      sessionRef.current = session;

      socket.onopen = () => {
        // Required handshake message — see TAIL_WEBSOCKET_SUBPROTOCOL's
        // comment in shared/cloudflare-api/tail.ts; wrangler sends this same
        // {debug:false} immediately after open.
        socket.send(JSON.stringify({ debug: false }));
        setState({ status: 'streaming', events: [], paused: false });
      };

      socket.onmessage = (event) => {
        const raw =
          typeof event.data === 'string'
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer);
        const parsed = parseTailEvent(raw);
        if (!parsed) {
          console.warn('[flarepeek] tail frame failed to parse', raw);
          return;
        }
        setState((prev) =>
          prev.status === 'streaming' && !prev.paused
            ? { ...prev, events: pushCapped(prev.events, parsed) }
            : prev,
        );
      };

      // The spec fires `close` right after `error` for a failed connection,
      // so `error` only needs to record that it happened — `close` below
      // does the one real state transition either way.
      socket.onerror = () => {
        session.hadError = true;
      };

      socket.onclose = () => {
        if (sessionRef.current !== session) return; // already finalized elsewhere
        sessionRef.current = null;
        if (session.hadError) {
          setState({ status: 'error', kind: 'network' });
          return;
        }
        setState((prev) => ({
          status: 'ended',
          events: prev.status === 'streaming' || prev.status === 'stopping' ? prev.events : [],
          reason: session.userStopped ? 'stopped' : 'closed',
        }));
      };
    })();
  }, [resolved]);

  const stop = useCallback(() => {
    generationRef.current++;
    const session = sessionRef.current;
    if (!session) {
      // Nothing connected yet (still 'starting', or already idle/ended) —
      // the generation bump above is enough to cancel an in-flight start().
      setState((prev) => (prev.status === 'starting' ? { status: 'idle' } : prev));
      return;
    }
    session.userStopped = true;
    // Flip to 'stopping' immediately, before the socket has actually closed
    // — the close handshake can lag well behind a busy stream, and without
    // this the Stop button just sits there looking unpressed until it
    // eventually arrives (reported as "clicking Stop does nothing").
    setState((prev) => ({
      status: 'stopping',
      events: prev.status === 'streaming' || prev.status === 'stopping' ? prev.events : [],
    }));
    if (session.socket.readyState === WebSocket.CLOSED) {
      // onclose already ran, or never will — finalize directly rather than
      // waiting on an event that isn't coming.
      sessionRef.current = null;
      void stopTail(session.client, session.accountId, session.scriptName, session.tailId);
      setState((prev) => ({
        status: 'ended',
        events: prev.status === 'stopping' ? prev.events : [],
        reason: 'stopped',
      }));
      return;
    }
    session.socket.close();
  }, []);

  const clear = useCallback(() => {
    setState((prev) => (prev.status === 'streaming' ? { ...prev, events: [] } : prev));
  }, []);

  // Freezes the visible list without touching the connection: incoming
  // frames are dropped (not buffered) while paused, per onmessage's guard
  // above — this is a glance tool, not a log aggregator, so there's nothing
  // to "catch up" on resume.
  const togglePause = useCallback(() => {
    setState((prev) => (prev.status === 'streaming' ? { ...prev, paused: !prev.paused } : prev));
  }, []);

  // Mandatory cleanup on unmount (tab switch away, side panel closed, or the
  // pane torn down) — an open tail session left undeleted counts against
  // the per-script concurrent-session cap the next time this pane starts
  // one. Deliberately not routed through the socket's own onclose handler:
  // that handler calls setState, which would warn/no-op after unmount, so
  // this does the client/tailId cleanup directly instead.
  useEffect(() => {
    return () => {
      // generationRef/sessionRef are plain mutable refs (not DOM-node refs),
      // read deliberately at cleanup time to reflect whatever start()/stop()
      // calls happened since mount, not a value captured when the effect
      // first ran.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generationRef.current++;
      const session = sessionRef.current;
      if (!session) return;
      sessionRef.current = null;
      if (session.socket.readyState !== WebSocket.CLOSED) session.socket.close();
      void stopTail(session.client, session.accountId, session.scriptName, session.tailId);
    };
  }, []);

  return { state, start, stop, clear, togglePause };
}
