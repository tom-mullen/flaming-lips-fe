import { useCallback, useEffect, useRef } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { wsUrl } from "@/app/lib/api";

interface UseJobStreamOptions {
  onEvent: (data: Record<string, unknown>) => void;
  onDone: (msg: { done: boolean; progress?: number }) => void;
  onError?: (msg: string) => void;
}

/**
 * Low-level hook that opens a reconnecting WebSocket to /jobs/{id}/stream
 * and dispatches parsed messages to callbacks.
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

  useEffect(() => {
    onEventRef.current = onEvent;
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
  });

  const connect = useCallback((jobId: string) => {
    wsRef.current?.close();

    const ws = new ReconnectingWebSocket(wsUrl(`/jobs/${jobId}/stream`), [], {
      maxRetries: 5,
    });
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.done) {
        onDoneRef.current(msg);
        ws.close();
      } else if (msg.data) {
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
