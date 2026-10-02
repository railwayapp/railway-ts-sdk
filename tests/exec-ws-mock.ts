/**
 * A fake WebSocket speaking the tcp-proxy `/ws/exec` wire protocol: binary
 * `0x01` stdout / `0x02` stdin / `0x03` stderr frames and JSON text frames
 * (`init_exec`, `stdin_close`, `exit`). Tests drive the server side via
 * `serverStdout`/`serverStderr`/`serverExit`/`serverClose` and inspect what the
 * client sent.
 */

import type { WebSocketConstructor } from "../src/core/config.js";

const encoder = new TextEncoder();

export interface ExecWsMock {
  webSocketImpl: WebSocketConstructor;
  sockets: MockExecSocket[];
  /** Resolves with the next socket once it has opened. */
  nextSocket(): Promise<MockExecSocket>;
}

export interface MockExecSocket {
  url: string;
  protocols: string[];
  /** 1 = OPEN, 3 = CLOSED (subset of the WebSocket readyState constants). */
  readyState: number;
  bufferedAmount: number;
  /** JSON text frames the client sent (init_exec, stdin_close). */
  sentText: { type: string; data?: unknown }[];
  /** Raw stdin payloads (frame byte stripped) the client sent. */
  sentStdin: Uint8Array[];
  serverOpen(): void;
  serverStdout(data: string | Uint8Array): void;
  serverStderr(data: string | Uint8Array): void;
  serverDurableSession(id: string): void;
  serverExit(exitCode: number, reason?: string): void;
  serverFrame(frame: unknown): void;
  serverClose(code: number, reason?: string): void;
}

export function createExecWsMock(options: { manualOpen?: boolean; manualCapabilities?: boolean; manualCredits?: boolean; onSend?: (frame: { type: string }) => void } = {}): ExecWsMock {
  const sockets: Socket[] = [];
  let waiters: ((socket: Socket) => void)[] = [];

  class Socket implements MockExecSocket {
    static readonly OPEN = 1;
    static readonly CLOSED = 3;

    url: string;
    protocols: string[];
    sentText: { type: string; data?: unknown }[] = [];
    sentStdin: Uint8Array[] = [];

    binaryType = "blob";
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    readyState = 0;
    bufferedAmount = 0;

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      this.protocols =
        typeof protocols === "string" ? [protocols] : (protocols ?? []).slice();
      sockets.push(this);
      if (!options.manualOpen) queueMicrotask(() => this.serverOpen());
    }

    serverOpen(): void {
      if (this.readyState === Socket.CLOSED) return;
      this.readyState = Socket.OPEN;
      this.onopen?.();
      const pending = waiters;
      waiters = [];
      for (const waiter of pending) waiter(this);
    }

    send(data: string | ArrayBufferView): void {
      if (this.readyState !== Socket.OPEN) throw new Error("WebSocket is not open");
      if (typeof data === "string") {
        const frame = JSON.parse(data);
        this.sentText.push(frame);
        options.onSend?.(frame);
        if (frame.type === "exec_hello" && !options.manualCapabilities) {
          this.serverFrame({ type: "exec_capabilities", data: { version: 2, stdin_chunks: 8, stdin_chunk_bytes: 16384 } });
        }
        return;
      }
      const bytes =
        data instanceof Uint8Array
          ? data
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      // Match the exec bridge's coder/websocket default message limit.
      if (bytes.length > 32 * 1024) {
        this.serverClose(1009, "read limited at 32768 bytes");
        return;
      }
      // 0x02 == stdin frame; record the payload after the frame byte.
      this.sentStdin.push(bytes.subarray(1));
      if (!options.manualCredits) this.serverFrame({ type: "stdin_credit", data: { chunks: 1 } });
    }

    close(code = 1000, reason = ""): void {
      if (this.readyState === Socket.CLOSED) return;
      this.readyState = Socket.CLOSED;
      queueMicrotask(() => this.onclose?.({ code, reason }));
    }

    serverStdout(data: string | Uint8Array): void {
      this.deliverBinary(0x01, data);
    }

    serverStderr(data: string | Uint8Array): void {
      this.deliverBinary(0x03, data);
    }

    serverDurableSession(id: string): void {
      this.deliver(
        JSON.stringify({
          type: "durable_session",
          data: { durable_session_name: id },
        }),
      );
    }

    serverFrame(frame: unknown): void {
      this.deliver(JSON.stringify(frame));
    }

    serverExit(exitCode: number, reason = ""): void {
      this.deliver(
        JSON.stringify({ type: "exit", data: { exit_code: exitCode, reason } }),
      );
    }

    serverClose(code: number, reason = ""): void {
      if (this.readyState === Socket.CLOSED) return;
      this.readyState = Socket.CLOSED;
      queueMicrotask(() => this.onclose?.({ code, reason }));
    }

    private deliverBinary(frameByte: number, data: string | Uint8Array): void {
      const payload = typeof data === "string" ? encoder.encode(data) : data;
      const framed = new Uint8Array(payload.length + 1);
      framed[0] = frameByte;
      framed.set(payload, 1);
      this.deliver(framed.buffer);
    }

    private deliver(data: unknown): void {
      queueMicrotask(() => {
        if (this.readyState === Socket.OPEN) this.onmessage?.({ data });
      });
    }
  }

  return {
    webSocketImpl: Socket as unknown as WebSocketConstructor,
    sockets,
    nextSocket: () => new Promise(resolve => waiters.push(resolve)),
  };
}
