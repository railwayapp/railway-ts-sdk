import {
  resolveWebSocketImpl,
  type NormalizedRailwayClientConfig,
} from "./config.js";
import type { RailwayWsSocket } from "./ws-socket.js";

const PROTOCOL = "graphql-transport-ws";

export interface GraphQLSubscription {
  close(): void;
}

/**
 * Best-effort `graphql-transport-ws` subscription: every failure is logged and
 * ends it quietly, so callers must not depend on it for correctness.
 */
export function subscribeGraphQL(
  config: NormalizedRailwayClientConfig,
  args: {
    endpoint: string;
    query: string;
    variables: Record<string, unknown>;
    onNext: () => void;
  },
): GraphQLSubscription | undefined {
  let socket: RailwayWsSocket;
  try {
    const WS = resolveWebSocketImpl(config);
    socket = new WS(args.endpoint, PROTOCOL) as RailwayWsSocket;
  } catch (error) {
    config.log(`subscription unavailable: ${String(error)}`);
    return undefined;
  }

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    try {
      socket.close(1000);
    } catch {
      // already closing
    }
  };
  const send = (message: unknown): void => socket.send(JSON.stringify(message));

  socket.onopen = () => {
    send({
      type: "connection_init",
      payload: { Authorization: `Bearer ${config.token}` },
    });
  };
  socket.onmessage = event => {
    if (typeof event.data !== "string") return;
    let message: { type?: string; payload?: unknown };
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    switch (message.type) {
      case "connection_ack":
        send({
          id: "1",
          type: "subscribe",
          payload: { query: args.query, variables: args.variables },
        });
        return;
      case "ping":
        send({ type: "pong" });
        return;
      case "next":
        args.onNext();
        return;
      case "error":
      case "complete":
        config.log(`subscription ended: ${event.data}`);
        close();
        return;
    }
  };
  socket.onerror = () => {
    if (!closed) config.log("subscription socket error");
  };
  socket.onclose = event => {
    if (!closed) config.log(`subscription closed: ${event.code} ${event.reason}`);
    closed = true;
  };

  return { close };
}
