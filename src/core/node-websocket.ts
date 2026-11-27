/**
 * A minimal RFC 6455 client over node:http(s), used on Node.js for pooled exec
 * sockets because its TCP socket can be unref'd while idle. Node's built-in
 * WebSocket (undici) exposes no handle to unref. Node built-ins load through
 * `process.getBuiltinModule`, so other runtimes and bundles never import them.
 */

import type { WebSocketConstructor } from "./config.js";
import { recordHandshakeResponse } from "./ws-handshake.js";
import type { RailwayWsSocket } from "./ws-socket.js";

type Socket = import("node:net").Socket;

interface Builtins {
  http: typeof import("node:http");
  https: typeof import("node:https");
  crypto: typeof import("node:crypto");
}

const ACCEPT_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;
const CLOSE_TIMEOUT_MS = 30_000;

let builtins: Builtins | null | undefined;

function loadBuiltins(): Builtins | null {
  if (builtins === undefined) {
    // Bun, Deno and workers expose some node: modules but not a client upgrade we rely on.
    const isNode = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent?.startsWith("Node.js/") === true;
    const load = isNode && typeof process !== "undefined" ? process.getBuiltinModule : undefined;
    builtins = load
      ? { http: load("node:http"), https: load("node:https"), crypto: load("node:crypto") }
      : null;
  }
  return builtins;
}

/** The unref-capable client, or undefined outside Node.js. */
export function nodeWebSocket(): WebSocketConstructor | undefined {
  return loadBuiltins() ? NodeWebSocket : undefined;
}

class NodeWebSocket implements RailwayWsSocket {
  binaryType = "arraybuffer";
  readyState = CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  readonly #builtins: Builtins;
  readonly #request: import("node:http").ClientRequest;
  #socket: Socket | undefined;
  #unref = false;
  #buffer: Buffer = Buffer.alloc(0);
  #fragments: Buffer[] = [];
  #fragmentOpcode = 0;
  #closeSent = false;
  #received: { code: number; reason: string } | undefined;
  #closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(url: string, protocols: string | string[] = []) {
    this.#builtins = loadBuiltins()!;
    const { http, https, crypto } = this.#builtins;
    const offered = typeof protocols === "string" ? [protocols] : protocols;
    const target = new URL(url);
    const secure = target.protocol === "wss:" || target.protocol === "https:";
    target.protocol = secure ? "https:" : "http:";
    const key = crypto.randomBytes(16).toString("base64");
    this.#request = (secure ? https : http).request(target, {
      agent: false,
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": key,
        ...(offered.length > 0 ? { "Sec-WebSocket-Protocol": offered.join(", ") } : {}),
      },
    });
    this.#request.on("upgrade", (response, socket: Socket, head: Buffer) => {
      const accept = crypto.createHash("sha1").update(key + ACCEPT_GUID).digest("base64");
      const protocol = response.headers["sec-websocket-protocol"];
      if (response.headers["sec-websocket-accept"] !== accept ||
        (protocol !== undefined && !offered.includes(protocol))) {
        socket.destroy();
        this.#fail();
        return;
      }
      this.#open(socket, head);
    });
    this.#request.on("response", response => {
      const retryAfter = response.headers["retry-after"];
      recordHandshakeResponse(offered, response.statusCode ?? 0, retryAfter);
      response.resume();
      this.#fail();
    });
    this.#request.on("error", () => this.#fail());
    this.#request.end();
  }

  get bufferedAmount(): number {
    return this.#socket?.writableLength ?? 0;
  }

  ref(): void {
    this.#unref = false;
    this.#socket?.ref();
  }

  unref(): void {
    this.#unref = true;
    this.#socket?.unref();
  }

  send(data: string | ArrayBufferView): void {
    if (this.readyState === CONNECTING) throw new Error("WebSocket is not open");
    if (this.readyState !== OPEN) return;
    if (typeof data === "string") this.#write(0x1, Buffer.from(data));
    else this.#write(0x2, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  }

  close(code?: number, reason = ""): void {
    if (this.readyState === CONNECTING) {
      this.#request.destroy();
      this.#fail();
      return;
    }
    if (this.readyState !== OPEN) return;
    this.readyState = CLOSING;
    this.#sendClose(code, reason);
    this.#closeTimer = setTimeout(() => this.#socket?.destroy(), CLOSE_TIMEOUT_MS);
    this.#closeTimer.unref();
  }

  #open(socket: Socket, head: Buffer): void {
    this.#socket = socket;
    socket.setNoDelay(true);
    if (this.#unref) socket.unref();
    socket.on("data", (chunk: Buffer) => this.#receive(chunk));
    socket.on("error", () => {});
    socket.on("close", () => this.#closed());
    this.readyState = OPEN;
    this.onopen?.();
    if (head.length > 0) this.#receive(head);
  }

  #fail(): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    queueMicrotask(() => {
      this.onerror?.({ type: "error" });
      this.onclose?.({ code: 1006, reason: "" });
    });
  }

  #closed(): void {
    clearTimeout(this.#closeTimer);
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.onclose?.(this.#received ?? { code: 1006, reason: "" });
  }

  #receive(chunk: Buffer): void {
    this.#buffer = this.#buffer.length > 0 ? Buffer.concat([this.#buffer, chunk]) : chunk;
    while (this.readyState === OPEN || this.readyState === CLOSING) {
      const frame = parseFrame(this.#buffer);
      if (!frame) return;
      this.#buffer = this.#buffer.subarray(frame.size);
      if (!frame.valid || !this.#frame(frame.fin, frame.opcode, frame.payload)) {
        this.#socket?.destroy();
        return;
      }
    }
  }

  /** False on a protocol error. */
  #frame(fin: boolean, opcode: number, payload: Buffer): boolean {
    switch (opcode) {
      case 0x0:
        if (this.#fragmentOpcode === 0) return false;
        this.#fragments.push(Buffer.from(payload));
        if (fin) {
          const opcode = this.#fragmentOpcode;
          const message = Buffer.concat(this.#fragments);
          this.#fragmentOpcode = 0;
          this.#fragments = [];
          this.#deliver(opcode, message);
        }
        return true;
      case 0x1:
      case 0x2:
        if (this.#fragmentOpcode !== 0) return false;
        if (fin) {
          this.#deliver(opcode, payload);
        } else {
          this.#fragmentOpcode = opcode;
          this.#fragments = [Buffer.from(payload)];
        }
        return true;
      case 0x8:
        this.#received = payload.length >= 2
          ? { code: payload.readUInt16BE(0), reason: payload.subarray(2).toString("utf8") }
          : { code: 1005, reason: "" };
        if (!this.#closeSent) this.#sendClose(payload.length >= 2 ? this.#received.code : undefined, "");
        this.readyState = CLOSING;
        this.#socket?.end();
        return true;
      case 0x9:
        if (this.readyState === OPEN) this.#write(0xa, payload);
        return true;
      case 0xa:
        return true;
      default:
        return false;
    }
  }

  #deliver(opcode: number, payload: Buffer): void {
    if (this.readyState !== OPEN) return;
    const data = opcode === 0x1
      ? payload.toString("utf8")
      : payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
    this.onmessage?.({ data });
  }

  #sendClose(code: number | undefined, reason: string): void {
    this.#closeSent = true;
    if (code === undefined) {
      this.#write(0x8, Buffer.alloc(0));
      return;
    }
    const reasonBytes = Buffer.from(reason);
    const payload = Buffer.alloc(2 + reasonBytes.length);
    payload.writeUInt16BE(code, 0);
    reasonBytes.copy(payload, 2);
    this.#write(0x8, payload);
  }

  /** Client frames are always masked. */
  #write(opcode: number, payload: Buffer): void {
    const length = payload.length;
    const lengthBytes = length < 126 ? 0 : length < 0x10000 ? 2 : 8;
    const offset = 2 + lengthBytes;
    const frame = Buffer.alloc(offset + 4 + length);
    frame[0] = 0x80 | opcode;
    if (lengthBytes === 0) {
      frame[1] = 0x80 | length;
    } else if (lengthBytes === 2) {
      frame[1] = 0x80 | 126;
      frame.writeUInt16BE(length, 2);
    } else {
      frame[1] = 0x80 | 127;
      frame.writeBigUInt64BE(BigInt(length), 2);
    }
    const mask = frame.subarray(offset, offset + 4);
    this.#builtins.crypto.randomFillSync(mask);
    for (let i = 0; i < length; i++) frame[offset + 4 + i] = payload[i]! ^ mask[i & 3]!;
    this.#socket?.write(frame);
  }
}

/** One frame from the front of `buffer`, or undefined until it has fully arrived. */
function parseFrame(buffer: Buffer):
  | { fin: boolean; opcode: number; payload: Buffer; size: number; valid: boolean }
  | undefined {
  if (buffer.length < 2) return undefined;
  const first = buffer[0]!;
  const second = buffer[1]!;
  let length = second & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < 4) return undefined;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buffer.length < 10) return undefined;
    const big = buffer.readBigUInt64BE(2);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) return { fin: true, opcode: 0, payload: Buffer.alloc(0), size: 0, valid: false };
    length = Number(big);
    offset = 10;
  }
  // Servers never mask, and no extension that sets RSV bits is negotiated.
  const valid = (second & 0x80) === 0 && (first & 0x70) === 0;
  if (buffer.length < offset + length) return undefined;
  return {
    fin: (first & 0x80) !== 0,
    opcode: first & 0x0f,
    payload: buffer.subarray(offset, offset + length),
    size: offset + length,
    valid,
  };
}
