/**
 * A fake WebSocket speaking the tcp-proxy `/ws/files` wire protocol: JSON
 * text frames for requests/replies and 12-byte-header binary frames for file
 * content. Tests drive the server side via `serverReply`/`serverError`/
 * `serverBinary` and inspect the JSON requests and parsed binary write frames
 * the client sent.
 */

import type { WebSocketConstructor } from "../src/core/config.js";

export const FRAME_READ_CHUNK = 0x01;
export const FRAME_READ_END = 0x02;
export const FRAME_WRITE_CHUNK = 0x03;
export const FRAME_WRITE_END = 0x04;

export interface FilesRequestFrame {
  type: string;
  id?: string;
  data?: unknown;
}

export interface SentBinaryFrame {
  reqId: number;
  frameType: number;
  seq: number;
  payload: Uint8Array;
}

export interface FilesWsMock {
  webSocketImpl: WebSocketConstructor;
  sockets: MockFilesSocket[];
  /** Resolves with the next socket once it has opened. */
  nextSocket(): Promise<MockFilesSocket>;
}

export interface MockFilesSocket {
  url: string;
  protocols: string[];
  /** 1 = OPEN, 3 = CLOSED (subset of the WebSocket readyState constants). */
  readyState: number;
  /** JSON request frames the client sent. */
  sentText: FilesRequestFrame[];
  /** Parsed binary frames (write chunks) the client sent. */
  sentBinary: SentBinaryFrame[];
  /** Resolves with the next JSON request the client sends (or one already sent). */
  nextRequest(): Promise<FilesRequestFrame>;
  serverReply(type: string, id: string, data?: unknown): void;
  serverError(id: string, message: string): void;
  serverBinary(
    reqId: number,
    frameType: number,
    seq: number,
    payload: Uint8Array,
  ): void;
  serverClose(code: number, reason?: string): void;
}

export function createFilesWsMock(): FilesWsMock {
  const sockets: Socket[] = [];
  let socketWaiters: ((socket: Socket) => void)[] = [];

  class Socket implements MockFilesSocket {
    static readonly OPEN = 1;
    static readonly CLOSED = 3;

    url: string;
    protocols: string[];
    sentText: FilesRequestFrame[] = [];
    sentBinary: SentBinaryFrame[] = [];

    binaryType = "blob";
    bufferedAmount = 0;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    readyState = 0;

    private requestWaiters: ((frame: FilesRequestFrame) => void)[] = [];
    private unreadRequests: FilesRequestFrame[] = [];

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      this.protocols =
        typeof protocols === "string" ? [protocols] : (protocols ?? []).slice();
      sockets.push(this);
      queueMicrotask(() => {
        this.readyState = Socket.OPEN;
        this.onopen?.();
        const pending = socketWaiters;
        socketWaiters = [];
        for (const waiter of pending) waiter(this);
      });
    }

    send(data: string | ArrayBufferView): void {
      if (typeof data === "string") {
        const frame = JSON.parse(data) as FilesRequestFrame;
        this.sentText.push(frame);
        const waiter = this.requestWaiters.shift();
        if (waiter) waiter(frame);
        else this.unreadRequests.push(frame);
        return;
      }
      const bytes =
        data instanceof Uint8Array
          ? data
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      this.sentBinary.push({
        reqId: view.getUint16(0),
        frameType: view.getUint16(2),
        seq: view.getUint32(4),
        payload: bytes.slice(12, 12 + view.getUint32(8)),
      });
    }

    close(code = 1000, reason = ""): void {
      if (this.readyState === Socket.CLOSED) return;
      this.readyState = Socket.CLOSED;
      queueMicrotask(() => this.onclose?.({ code, reason }));
    }

    nextRequest(): Promise<FilesRequestFrame> {
      const queued = this.unreadRequests.shift();
      if (queued) return Promise.resolve(queued);
      return new Promise(resolve => this.requestWaiters.push(resolve));
    }

    serverReply(type: string, id: string, data: unknown = null): void {
      this.deliver(JSON.stringify({ type, id, data }));
    }

    serverError(id: string, message: string): void {
      this.serverReply("error", id, { message });
    }

    serverBinary(
      reqId: number,
      frameType: number,
      seq: number,
      payload: Uint8Array,
    ): void {
      const frame = new Uint8Array(12 + payload.length);
      const view = new DataView(frame.buffer);
      view.setUint16(0, reqId);
      view.setUint16(2, frameType);
      view.setUint32(4, seq);
      view.setUint32(8, payload.length);
      frame.set(payload, 12);
      this.deliver(frame.buffer);
    }

    serverClose(code: number, reason = ""): void {
      if (this.readyState === Socket.CLOSED) return;
      this.readyState = Socket.CLOSED;
      queueMicrotask(() => this.onclose?.({ code, reason }));
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
    nextSocket: () => new Promise(resolve => socketWaiters.push(resolve)),
  };
}
