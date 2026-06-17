import {
  resolveWebSocketImpl,
  type NormalizedRailwayClientConfig,
  type WebSocketConstructor,
} from "./config.js";
import {
  RailwayConcurrencyLimitError,
  RailwayConnectionError,
  RailwayRateLimitError,
  RailwaySessionLimitError,
} from "./errors.js";
import type { RailwayWsSocket } from "./ws-socket.js";

/**
 * tcp-proxy `/ws/files` wire protocol: JSON text frames carry requests and
 * replies (`{type, id, data}`); file content rides binary frames with a
 * 12-byte big-endian header (request id u16, frame type u16, sequence u32,
 * payload length u32) followed by the payload.
 */
const BINARY_HEADER_BYTES = 12;
const FRAME_READ_END = 0x02;
const FRAME_WRITE_CHUNK = 0x03;
const FRAME_WRITE_END = 0x04;

/** Private-use WS close code for the sandbox's concurrent-session limit. */
const WS_CLOSE_SESSION_LIMIT = 4001;
/** Server error-frame code for the per-connection concurrency cap. */
const CODE_TOO_MANY_CONCURRENT = "too_many_concurrent_operations";

/** Subprotocol the tcp-proxy bridges expect alongside the JWT. */
const SHELL_SUBPROTOCOL = "railway-shell";

/** Content chunk size the bridge streams and expects (its read limit is 256KB). */
const FILES_CHUNK_BYTES = 64 * 1024;

/**
 * Pause sending upload chunks while the socket holds more than this. Bounds
 * memory on large pushes and keeps the client's keepalive replies from
 * queueing behind seconds of buffered data: the server drops sessions whose
 * replies lag more than a few seconds, so the send buffer must stay shallow
 * relative to drain rate even on a slow link.
 */
const SEND_HIGH_WATER_BYTES = 128 * 1024;
const SEND_POLL_MS = 10;

/**
 * Abandon an operation when the server goes silent this long while a reply is
 * due. Matches the bridge's own 30s per-chunk idle timeout on uploads.
 */
const INACTIVITY_TIMEOUT_MS = 30_000;

/**
 * While an upload waits on a slow source, send an empty content frame at
 * this cadence so the server's per-chunk idle timeout (30s) never fires;
 * sources may pause arbitrarily long between chunks.
 */
const WRITE_HEARTBEAT_MS = 10_000;

/** A `{type: "error"}` reply from the server; message is the remote error text. */
export class FilesRemoteError extends Error {
  /**
   * For uploads: whether the failure happened at `write_start` (before any
   * content was consumed, so a retry is safe) or while streaming.
   */
  readonly stage?: "start" | "stream";

  constructor(message: string, stage?: "start" | "stream") {
    super(message);
    if (stage) this.stage = stage;
  }
}

export interface FilesWsConnection {
  /** Send a request and resolve with the reply frame's `data` value. */
  call(type: string, data: unknown): Promise<unknown>;
  /**
   * Send a `read` request and deliver content chunks as they stream in.
   * Resolves once the final chunk has been delivered.
   */
  read(
    data: Record<string, unknown>,
    onChunk: (bytes: Uint8Array) => void,
  ): Promise<void>;
  /**
   * Run the `write_start` handshake, stream `chunks` as content frames
   * (re-chunked to the bridge's frame size, with send backpressure), and
   * resolve once the server acknowledges the completed write.
   */
  write(
    start: { path: string; mode: number; size: number },
    chunks: AsyncIterable<Uint8Array>,
  ): Promise<void>;
  /** Registers a listener fired once when the socket closes, with the close cause. */
  onClose(listener: (error: Error) => void): void;
  close(): void;
}

interface PendingOp {
  /** JSON reply frames addressed to this op (including `error`). */
  onReply(type: string, data: unknown): void;
  /** Binary content frames addressed to this op. */
  onBinary?(frameType: number, payload: Uint8Array): void;
  /** Settle with a transport failure (socket closed mid-operation). */
  fail(error: Error): void;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Opens a tcp-proxy `/ws/files` session and resolves once the socket is live.
 * The JWT travels as the last `Sec-WebSocket-Protocol` value, per the bridge's
 * token-extraction contract; a `files:*`-scoped token authorizes the path.
 *
 * The bridge demultiplexes by request id, so multiple operations may be in
 * flight concurrently on one connection; a pool caps that concurrency.
 */
export function connectFilesWs(args: {
  config: NormalizedRailwayClientConfig;
  jwt: string;
  endpoint: string;
}): Promise<FilesWsConnection> {
  const { config, jwt, endpoint } = args;
  const WS: WebSocketConstructor = resolveWebSocketImpl(config);

  return new Promise<FilesWsConnection>((resolve, reject) => {
    let opened = false;
    let closed = false;
    let nextId = 1;
    const pending = new Map<string, PendingOp>();
    const closeListeners: ((error: Error) => void)[] = [];
    let closeError: Error | undefined;

    const socket = new WS(endpoint, [
      SHELL_SUBPROTOCOL,
      jwt,
    ]) as unknown as RailwayWsSocket;
    socket.binaryType = "arraybuffer";

    // The `ws` package surfaces a non-101 upgrade status here (undici hides it);
    // a 429 becomes a typed RailwayRateLimitError so the pool can back off.
    captureUnexpectedResponse(socket, (status, retryAfterMs) => {
      if (opened || closed) return;
      closed = true;
      reject(handshakeError(status, retryAfterMs));
    });

    const failAll = (error: Error) => {
      const ops = [...pending.values()];
      pending.clear();
      for (const op of ops) op.fail(error);
    };

    const closeSocket = () => {
      try {
        socket.close(1000, "");
      } catch {
        // ignore
      }
    };

    /**
     * Registers an op and returns its frame id plus an inactivity guard. The
     * timer only runs while armed: replies are server-driven, but during an
     * upload the server is intentionally silent, so the guard stays off until
     * the final chunk is sent.
     */
    const register = (op: PendingOp) => {
      // Binary frames echo the id as a u16, so wrap before 65536. Requests
      // on a connection are sequential, so a wrapped id is never in flight
      // alongside its predecessor.
      const id = String(nextId);
      nextId = nextId >= 65535 ? 1 : nextId + 1;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const disarm = () => {
        if (timer) clearTimeout(timer);
        timer = undefined;
      };
      const arm = () => {
        disarm();
        timer = setTimeout(() => {
          pending.delete(id);
          op.fail(
            new RailwayConnectionError({
              message: `tcp-proxy files operation timed out after ${INACTIVITY_TIMEOUT_MS}ms of inactivity.`,
            }),
          );
          closeSocket();
        }, INACTIVITY_TIMEOUT_MS);
      };
      pending.set(id, op);
      return { id, arm, disarm };
    };

    const sendJson = (type: string, id: string, data: unknown) => {
      socket.send(JSON.stringify({ type, id, data }));
    };

    /**
     * Waits until the socket's send buffer drains below the high-water mark.
     * A buffer that stays full past the inactivity window means the peer
     * stopped draining (e.g. a half-open connection that never fires close);
     * fail it like any dead transport instead of stalling forever.
     */
    const awaitDrain = async () => {
      const start = Date.now();
      while (!closed && (socket.bufferedAmount ?? 0) > SEND_HIGH_WATER_BYTES) {
        if (Date.now() - start > INACTIVITY_TIMEOUT_MS) {
          closeSocket();
          throw new RailwayConnectionError({
            message: `tcp-proxy files send buffer stalled for ${INACTIVITY_TIMEOUT_MS}ms.`,
          });
        }
        await sleep(SEND_POLL_MS);
      }
    };

    const connection: FilesWsConnection = {
      call(type, data) {
        return new Promise((resolveCall, rejectCall) => {
          const { id, arm, disarm } = register({
            onReply: (replyType, replyData) => {
              disarm();
              pending.delete(id);
              if (replyType === "error") {
                rejectCall(remoteError(replyData));
              } else {
                resolveCall(replyData);
              }
            },
            fail: error => {
              disarm();
              rejectCall(error);
            },
          });
          sendJson(type, id, data);
          arm();
        });
      },

      read(data, onChunk) {
        return new Promise<void>((resolveRead, rejectRead) => {
          const { id, arm, disarm } = register({
            onReply: (replyType, replyData) => {
              // The bridge replies to reads only with binary frames or an
              // error; any other JSON frame is ignored.
              if (replyType !== "error") return;
              disarm();
              pending.delete(id);
              rejectRead(remoteError(replyData));
            },
            onBinary: (frameType, payload) => {
              arm();
              try {
                if (payload.length > 0) onChunk(payload);
              } catch (error) {
                disarm();
                pending.delete(id);
                rejectRead(error);
                closeSocket();
                return;
              }
              if (frameType === FRAME_READ_END) {
                disarm();
                pending.delete(id);
                resolveRead();
              }
            },
            fail: error => {
              disarm();
              rejectRead(error);
            },
          });
          sendJson("read", id, data);
          arm();
        });
      },

      async write(start, chunks) {
        let settled = false;
        let notifySettled!: () => void;
        const settledSignal = new Promise<"settled">(resolve => {
          notifySettled = () => resolve("settled");
        });
        let settle!: { resolve(): void; reject(error: Error): void };
        const done = new Promise<void>((resolveWrite, rejectWrite) => {
          settle = {
            resolve: () => {
              settled = true;
              notifySettled();
              resolveWrite();
            },
            reject: error => {
              settled = true;
              notifySettled();
              rejectWrite(error);
            },
          };
        });
        // Side tap: `done` is also rejected while the chunk loop is in
        // flight; the loop re-awaits it, so a bare rejection must not
        // surface as unhandled.
        done.catch(() => {});

        let ready!: { resolve(): void; reject(error: Error): void };
        const writeReady = new Promise<void>((resolveReady, rejectReady) => {
          ready = { resolve: resolveReady, reject: rejectReady };
        });

        let awaitingReady = true;
        const { id, arm, disarm } = register({
          onReply: (replyType, replyData) => {
            if (replyType === "error") {
              disarm();
              pending.delete(id);
              const error = remoteError(
                replyData,
                awaitingReady ? "start" : "stream",
              );
              if (awaitingReady) ready.reject(error);
              settle.reject(error);
              return;
            }
            if (awaitingReady && replyType === "write_ready") {
              awaitingReady = false;
              disarm();
              ready.resolve();
              return;
            }
            if (replyType === "ok") {
              disarm();
              pending.delete(id);
              if (awaitingReady) {
                // The server acked a write whose content was never sent;
                // resolving would claim success for a file it never received.
                const error = new FilesRemoteError(
                  "protocol error: ok before write_ready",
                  "start",
                );
                ready.reject(error);
                settle.reject(error);
                return;
              }
              settle.resolve();
            }
          },
          fail: error => {
            disarm();
            if (awaitingReady) ready.reject(error);
            settle.reject(error);
          },
        });

        sendJson("write_start", id, start);
        arm();
        await writeReady;

        const reqId = Number(id);
        let seq = 0;
        const sendContent = (payload: Uint8Array, last: boolean) => {
          socket.send(
            binaryFrame(
              reqId,
              last ? FRAME_WRITE_END : FRAME_WRITE_CHUNK,
              seq++,
              payload,
            ),
          );
        };

        // Keep the server's per-chunk idle timer fresh while the source is
        // slow; zero-payload content frames are valid no-ops server-side.
        const heartbeat = setInterval(() => {
          if (settled || closed) return;
          try {
            sendContent(new Uint8Array(0), false);
          } catch {
            // socket is closing; the close handler settles the write
          }
        }, WRITE_HEARTBEAT_MS);

        let completed: boolean;
        try {
          completed = await streamUpload({
            iterator: rechunk(chunks)[Symbol.asyncIterator](),
            settledSignal,
            isSettled: () => settled,
            awaitDrain,
            send: sendContent,
          });
        } catch (error) {
          // The caller's source (or a stalled transport) failed; free the
          // server's file handle. The partial file remains on disk.
          pending.delete(id);
          disarm();
          closeSocket();
          throw error;
        } finally {
          clearInterval(heartbeat);
        }
        // The end marker is out; guard the wait for the server's ack.
        if (completed) arm();
        return done;
      },

      onClose(listener) {
        if (closeError) listener(closeError);
        else closeListeners.push(listener);
      },

      close: closeSocket,
    };

    socket.onopen = () => {
      opened = true;
      if (socket.bufferedAmount === undefined) {
        config.log(
          "files: webSocketImpl exposes no bufferedAmount; upload pacing is disabled",
        );
      }
      resolve(connection);
    };

    socket.onmessage = event => {
      const { data } = event;
      if (data instanceof ArrayBuffer) {
        handleBinaryFrame(data);
      } else if (typeof data === "string") {
        handleTextFrame(data);
      }
    };

    socket.onclose = event => {
      closed = true;
      if (!opened) {
        const clean = sanitizeReason(event.reason);
        reject(
          new RailwayConnectionError({
            message: `tcp-proxy files WebSocket closed before opening (code ${event.code}${
              clean ? `: ${clean}` : ""
            }).`,
            closeCode: event.code,
            ...(event.reason && { closeReason: event.reason }),
          }),
        );
        return;
      }
      const error = filesCloseError(event.code, event.reason);
      closeError = error;
      failAll(error);
      for (const listener of closeListeners) listener(error);
      closeListeners.length = 0;
    };

    socket.onerror = event => {
      if (opened) return;
      reject(
        new RailwayConnectionError({
          message: "tcp-proxy files WebSocket connection failed.",
          cause: event,
        }),
      );
    };

    function handleTextFrame(text: string): void {
      let frame: { type?: string; id?: string; data?: unknown };
      try {
        frame = JSON.parse(text);
      } catch {
        return;
      }
      if (!frame.type || !frame.id) return;
      pending.get(frame.id)?.onReply(frame.type, frame.data);
    }

    function handleBinaryFrame(buffer: ArrayBuffer): void {
      if (buffer.byteLength < BINARY_HEADER_BYTES) return;
      const view = new DataView(buffer);
      const reqId = view.getUint16(0);
      const frameType = view.getUint16(2);
      const payloadLen = view.getUint32(8);
      const available = buffer.byteLength - BINARY_HEADER_BYTES;
      const payload = new Uint8Array(
        buffer,
        BINARY_HEADER_BYTES,
        Math.min(payloadLen, available),
      );
      pending.get(String(reqId))?.onBinary?.(frameType, payload);
    }
  });
}

function errorMessage(data: unknown): string {
  const message = (data as { message?: string } | undefined)?.message;
  return message || "unknown error";
}

/** Typed error for a non-101 upgrade rejection (only the `ws` package exposes it). */
function handshakeError(status: number, retryAfterMs: number | undefined): Error {
  if (status === 429) {
    return new RailwayRateLimitError({
      message: "tcp-proxy files WebSocket rate limited (HTTP 429).",
      httpStatus: 429,
      ...(retryAfterMs !== undefined && { retryAfterMs }),
    });
  }
  return new RailwayConnectionError({
    message: `tcp-proxy files WebSocket handshake failed (HTTP ${status}).`,
  });
}

/**
 * Hooks the `ws` package's `unexpected-response` (undici exposes no upgrade
 * status). It does not emit close/error afterwards, so drain the response and
 * settle via `onResponse`; under undici this never fires and the failure falls
 * to onerror/onclose as a RailwayConnectionError (which the pool retries).
 */
function captureUnexpectedResponse(
  socket: unknown,
  onResponse: (status: number, retryAfterMs: number | undefined) => void,
): void {
  const s = socket as {
    on?: (event: string, listener: (...args: unknown[]) => void) => void;
  };
  if (typeof s.on !== "function") return;
  s.on("unexpected-response", (...args: unknown[]) => {
    const res = (args.length > 1 ? args[1] : args[0]) as
      | {
          statusCode?: number;
          headers?: Record<string, string | string[] | undefined>;
          resume?: () => void;
          destroy?: () => void;
        }
      | undefined;
    res?.resume?.();
    res?.destroy?.();
    onResponse(
      res?.statusCode ?? 0,
      parseRetryAfterMs(res?.headers?.["retry-after"]),
    );
  });
}

function parseRetryAfterMs(
  value: string | string[] | undefined,
): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1000;
  const date = Date.parse(raw);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - Date.now());
}

/** Collapses the terminal CRLF formatting the server uses so SDK errors read cleanly. */
function sanitizeReason(reason: string): string {
  return reason.replace(/\s+/g, " ").trim();
}

/** Typed error for a post-open socket close; the session limit gets its own type. */
function filesCloseError(code: number, reason: string): Error {
  const clean = sanitizeReason(reason);
  if (code === WS_CLOSE_SESSION_LIMIT) {
    return new RailwaySessionLimitError({
      message:
        clean ||
        "Sandbox is at its connection limit (too many concurrent sessions). Close an existing session and retry.",
      closeCode: code,
      ...(reason && { closeReason: reason }),
    });
  }
  return new RailwayConnectionError({
    message: `tcp-proxy files WebSocket closed (code ${code}${clean ? `: ${clean}` : ""}).`,
    closeCode: code,
    ...(reason && { closeReason: reason }),
  });
}

/** Maps a server `error` reply to a typed error, special-casing the concurrency cap. */
function remoteError(data: unknown, stage?: "start" | "stream"): Error {
  const code = (data as { code?: string } | undefined)?.code;
  if (code === CODE_TOO_MANY_CONCURRENT) {
    const limit = (data as { limit?: number } | undefined)?.limit;
    return new RailwayConcurrencyLimitError({
      message: errorMessage(data),
      ...(typeof limit === "number" && { limit }),
    });
  }
  return new FilesRemoteError(errorMessage(data), stage);
}

function binaryFrame(
  reqId: number,
  frameType: number,
  seq: number,
  payload: Uint8Array,
): Uint8Array {
  const frame = new Uint8Array(BINARY_HEADER_BYTES + payload.length);
  const view = new DataView(frame.buffer);
  view.setUint16(0, reqId);
  view.setUint16(2, frameType);
  view.setUint32(4, seq);
  view.setUint32(8, payload.length);
  frame.set(payload, BINARY_HEADER_BYTES);
  return frame;
}

/** Splits arbitrary-size source chunks into bridge-size frames; drops empties. */
async function* rechunk(
  chunks: AsyncIterable<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  for await (const chunk of chunks) {
    for (let offset = 0; offset < chunk.length; offset += FILES_CHUNK_BYTES) {
      yield chunk.subarray(
        offset,
        Math.min(offset + FILES_CHUNK_BYTES, chunk.length),
      );
    }
  }
}

/**
 * Streams upload content with one-chunk lookahead so the final frame can
 * carry the end marker. Each pull races the settled signal: when the server
 * fails the write (or the connection drops) mid-pull, the transfer must not
 * stay suspended on a source that never yields again. Returns true once the
 * end marker has been sent, false when the write settled early.
 */
async function streamUpload(args: {
  iterator: AsyncIterator<Uint8Array>;
  settledSignal: Promise<"settled">;
  isSettled: () => boolean;
  awaitDrain: () => Promise<void>;
  send: (payload: Uint8Array, last: boolean) => void;
}): Promise<boolean> {
  const { iterator, isSettled, awaitDrain, send } = args;
  let held: Uint8Array | undefined;
  for (;;) {
    const next = await nextChunkOrSettled(args);
    if (next === null) return false;
    if (next.done) break;
    if (held) {
      await awaitDrain();
      if (isSettled()) return false;
      send(held, false);
    }
    held = next.value;
  }
  if (isSettled()) return false;
  await awaitDrain();
  if (isSettled()) return false;
  send(held ?? new Uint8Array(0), true);
  return true;
}

/**
 * Pulls the next source chunk, racing the settled signal. When the write
 * settled while waiting, releases the source and returns null, so a source
 * that never yields again cannot suspend the transfer.
 */
async function nextChunkOrSettled(args: {
  iterator: AsyncIterator<Uint8Array>;
  settledSignal: Promise<"settled">;
  isSettled: () => boolean;
}): Promise<IteratorResult<Uint8Array> | null> {
  const { iterator, settledSignal, isSettled } = args;
  const nextChunk = iterator.next();
  void Promise.resolve(nextChunk).catch(() => {}); // may settle after losing the race
  const next = await Promise.race([nextChunk, settledSignal]);
  if (next !== "settled" && !isSettled()) return next;
  // Release the source (runs generator/stream cleanup).
  void Promise.resolve(iterator.return?.(undefined)).catch(() => {});
  return null;
}
