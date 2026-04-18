import { useCallback, useEffect, useRef } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { wsUrl } from "@/app/lib/api";

interface UseJobStreamOptions {
  onEvent: (data: Record<string, unknown>) => void;
  onDone: (msg: { done: boolean; progress?: number }) => void;
  onError?: (msg: string) => void;
}

/**
 * Low-level hook for event-stream WebSockets. Backs both /jobs/{id}/stream
 * (terminates on a `done` envelope) and /batches/{id}/stream (client-driven
 * close — the server never sends `done` since a batch spans multiple jobs).
 *
 * connect(path) takes a full stream path so callers pick the endpoint; the
 * hook itself is endpoint-agnostic.
 *
 * Callbacks are stored in refs so the WebSocket connection is never torn
 * down due to callback identity changes from the caller.
 */
export function useJobStream({
  onEvent,
  onDone,
  onError,
}: UseJobStreamOptions) {
  const wsRef = useRef<ReconnectingWebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  // Last server-assigned seq the client has ingested. Sent as ?after_seq on
  // every (re)connect so the server resumes from there instead of replaying
  // from 0. Without this, every transient reconnect redelivered the whole
  // stream and inflated FE counters (e.g. 1875/625 parsed for a 625-doc batch
  // after two reconnects).
  const lastSeqRef = useRef(0);

  useEffect(() => {
    onEventRef.current = onEvent;
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
  });

  const connect = useCallback((path: string) => {
    wsRef.current?.close();
    lastSeqRef.current = 0;

    // ReconnectingWebSocket accepts a url-provider function, invoked on
    // every (re)connect — perfect for threading the evolving after_seq
    // cursor through without rebuilding the socket ourselves.
    const urlProvider = () => {
      const sep = path.includes("?") ? "&" : "?";
      return wsUrl(`${path}${sep}after_seq=${lastSeqRef.current}`);
    };

    const ws = new ReconnectingWebSocket(urlProvider, [], {
      maxRetries: 5,
    });
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.done) {
        onDoneRef.current(msg);
        ws.close();
      } else if (msg.data) {
        if (typeof msg.seq === "number") {
          lastSeqRef.current = msg.seq;
        }
        const data =
          typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
        onEventRef.current(data);
      }
    };

    ws.onerror = () => {
      onErrorRef.current?.(
        "WebSocket connection failed — job continues in background",
      );
    };

    return ws;
  }, []);

  const close = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return { connect, close };
}
