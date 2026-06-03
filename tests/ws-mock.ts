/**
 * A fake WebSocket implementation speaking just enough graphql-transport-ws
 * for graphql-ws's client: connection_init/ack handshake, subscribe, and
 * server-driven next/error/complete/close. Each `subscribe` consumes the next
 * entry of `script`; subscriptions beyond the script stay open for manual
 * driving via `serverNext`/`serverComplete`/`serverError`/`serverClose`.
 */

export interface WsSubscribeCall {
  query: string;
  variables: Record<string, unknown>;
}

export type WsServerAction =
  | { next: unknown }
  | { error: { message: string; extensions?: Record<string, unknown> }[] }
  | { complete: true }
  | { close: { code: number; reason?: string } };

import type { WebSocketConstructor } from "../src/core/config.js";

export interface WsMock {
  webSocketImpl: WebSocketConstructor;
  /** Subscribe payloads in order, for asserting query/variables (e.g. cursor). */
  calls: WsSubscribeCall[];
  /** connection_init payloads in order, for asserting auth params. */
  initPayloads: unknown[];
  /** Every socket constructed; length 0 proves the fast path opened no WS. */
  sockets: unknown[];
  /** Resolves with the next subscribe payload — await before manual driving. */
  nextSubscribe(): Promise<WsSubscribeCall>;
  serverNext(payload: unknown): void;
  serverComplete(): void;
  serverError(errors: { message: string }[]): void;
  serverClose(code: number, reason?: string): void;
}

export function createWsMock(script: WsServerAction[][] = []): WsMock {
  const calls: WsSubscribeCall[] = [];
  const initPayloads: unknown[] = [];
  const sockets: MockWebSocket[] = [];
  let waiters: ((call: WsSubscribeCall) => void)[] = [];
  let scriptIndex = 0;
  let active: { socket: MockWebSocket; id: string } | undefined;

  class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose:
      | ((event: { code: number; reason: string; wasClean: boolean }) => void)
      | null = null;
    onerror: ((event: unknown) => void) | null = null;
    readyState: number = MockWebSocket.CONNECTING;

    constructor(_url: string, _protocols?: string | string[]) {
      sockets.push(this);
      queueMicrotask(() => {
        if (this.readyState !== MockWebSocket.CONNECTING) return;
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.();
      });
    }

    send(raw: string): void {
      const message = JSON.parse(raw) as {
        type: string;
        id?: string;
        payload?: WsSubscribeCall;
      };
      switch (message.type) {
        case "connection_init":
          initPayloads.push(message.payload);
          this.emitMessage({ type: "connection_ack" });
          return;
        case "ping":
          this.emitMessage({ type: "pong" });
          return;
        case "subscribe": {
          const call = message.payload as WsSubscribeCall;
          calls.push(call);
          active = { socket: this, id: message.id as string };
          const pending = waiters;
          waiters = [];
          for (const waiter of pending) waiter(call);
          const actions = script[scriptIndex];
          scriptIndex += 1;
          if (actions) {
            for (const action of actions) applyAction(this, message.id as string, action);
          }
          return;
        }
        default:
          // 'complete' (client unsubscribe) and 'pong' need no reply.
          return;
      }
    }

    close(code = 1000, reason = ""): void {
      this.fireClose(code, reason, true);
    }

    emitMessage(message: unknown): void {
      queueMicrotask(() => {
        if (this.readyState !== MockWebSocket.OPEN) return;
        this.onmessage?.({ data: JSON.stringify(message) });
      });
    }

    fireClose(code: number, reason: string, wasClean: boolean): void {
      if (this.readyState === MockWebSocket.CLOSED) return;
      this.readyState = MockWebSocket.CLOSED;
      queueMicrotask(() => this.onclose?.({ code, reason, wasClean }));
    }
  }

  function applyAction(socket: MockWebSocket, id: string, action: WsServerAction): void {
    if ("next" in action) {
      socket.emitMessage({ id, type: "next", payload: action.next });
    } else if ("error" in action) {
      socket.emitMessage({ id, type: "error", payload: action.error });
    } else if ("complete" in action) {
      socket.emitMessage({ id, type: "complete" });
    } else {
      // Queue alongside emitMessage so a scripted close lands after any
      // frames queued before it instead of dropping them.
      const close = action.close;
      queueMicrotask(() => socket.fireClose(close.code, close.reason ?? "", false));
    }
  }

  function requireActive(): { socket: MockWebSocket; id: string } {
    if (!active) throw new Error("ws-mock: no active subscription to drive");
    return active;
  }

  return {
    webSocketImpl: MockWebSocket,
    calls,
    initPayloads,
    sockets,
    nextSubscribe: () => new Promise(resolve => waiters.push(resolve)),
    serverNext: payload => {
      const { socket, id } = requireActive();
      applyAction(socket, id, { next: payload });
    },
    serverComplete: () => {
      const { socket, id } = requireActive();
      applyAction(socket, id, { complete: true });
    },
    serverError: errors => {
      const { socket, id } = requireActive();
      applyAction(socket, id, { error: errors });
    },
    serverClose: (code, reason) => {
      requireActive().socket.fireClose(code, reason ?? "", false);
    },
  };
}
