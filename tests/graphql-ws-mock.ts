import type { WebSocketConstructor } from "../src/core/config.js";

/** A fake `graphql-transport-ws` server that acks connection_init and lets tests push `next`. */
export interface GraphQLWsMock {
  webSocketImpl: WebSocketConstructor;
  sockets: MockGraphQLSocket[];
}

export interface MockGraphQLSocket {
  url: string;
  protocols: string[];
  sent: { type: string; id?: string; payload?: unknown }[];
  closed: boolean;
  serverNext(): void;
}

export function createGraphQLWsMock(): GraphQLWsMock {
  const sockets: Socket[] = [];

  class Socket implements MockGraphQLSocket {
    url: string;
    protocols: string[];
    sent: { type: string; id?: string; payload?: unknown }[] = [];
    closed = false;
    binaryType = "blob";
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      this.protocols = typeof protocols === "string" ? [protocols] : (protocols ?? []);
      sockets.push(this);
      queueMicrotask(() => this.onopen?.());
    }

    send(data: string): void {
      const message = JSON.parse(data) as { type: string };
      this.sent.push(message);
      if (message.type === "connection_init") {
        queueMicrotask(() => this.#server({ type: "connection_ack" }));
      }
    }

    close(): void {
      this.closed = true;
    }

    serverNext(): void {
      this.#server({
        id: "1",
        type: "next",
        payload: { data: { sandboxInvalidation: { id: "invalidation_1" } } },
      });
    }

    #server(message: unknown): void {
      if (!this.closed) this.onmessage?.({ data: JSON.stringify(message) });
    }
  }

  return { webSocketImpl: Socket as unknown as WebSocketConstructor, sockets };
}
