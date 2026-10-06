import {
  resolveWebSocketImpl,
  type NormalizedRailwayClientConfig,
  type WebSocketConstructor,
} from "./config.js";
import { ExecControlUnsupportedError, ExecNotStartedError, RailwayConnectionError } from "./errors.js";
import type { RailwayWsSocket } from "./ws-socket.js";

/**
 * tcp-proxy `/ws/exec` wire protocol: stdout/stderr ride binary frames tagged
 * by a leading byte; init, stdin-EOF, and exit are JSON text frames.
 */
const STDOUT_FRAME = 0x01;
const STDIN_FRAME = 0x02;
const STDERR_FRAME = 0x03;
// /ws/exec keeps coder/websocket's default 32 KiB message limit (unlike
// /ws/files). Leave room for the leading stdin tag within every message.
const STDIN_CHUNK_BYTES = 16 * 1024;
const SEND_HIGH_WATER_BYTES = 128 * 1024;
/** How long the local WebSocket send buffer may stay above the high-water mark. */
const SEND_STALL_TIMEOUT_MS = 30_000;
const SEND_POLL_MS = 10;
/** Lowest exec-control version this client speaks. */
const MIN_EXEC_CONTROL_VERSION = 2;
const MAX_STDIN_CHUNKS = 64;
/**
 * Close codes for a session the server dropped before it started, where a new
 * connection can succeed: going away (deploys), abnormal closure, service
 * restart, try again later.
 */
const TRANSIENT_CLOSE_CODES: ReadonlySet<number> = new Set([1001, 1006, 1012, 1013]);
/** What a proxy that predates exec control sends after rejecting the bare hello. */
const LEGACY_REJECT_CLOSE_CODE = 1000;

const notRetryable = new WeakSet<object>();

/**
 * Whether a connection failure left nothing running AND is worth one more try.
 * Denials (policy, limits) and routing failures are not.
 */
export function shouldRetryBeforeStart(error: unknown): boolean {
  return error instanceof ExecNotStartedError && !notRetryable.has(error);
}

function notStarted(
  message: string,
  options: { retryable: boolean; closeCode?: number; cause?: unknown },
): ExecNotStartedError {
  const error = new ExecNotStartedError({
    message,
    ...(options.closeCode !== undefined ? { closeCode: options.closeCode } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  });
  if (!options.retryable) notRetryable.add(error);
  return error;
}

/** Subprotocol the tcp-proxy bridges expect alongside the JWT. */
const SHELL_SUBPROTOCOL = "railway-shell";

export interface ExecWsHandlers {
  onError(error: RailwayConnectionError): void;
  onStdinError(error: RailwayConnectionError): void;
  onStdout(bytes: Uint8Array): void;
  onStderr(bytes: Uint8Array): void;
  /** The command exited with this code. */
  onExit(code: number, reason: string): void;
  /** The socket closed without an exit frame having settled the command. */
  onClose(info: { code: number; reason: string }): void;
  /**
   * The VM assigned (or confirmed) a durable session id for this exec — only
   * emitted when durable sessions are enabled server-side. Use it as the resume
   * handle. No-op by default.
   */
  onDurableSession?(id: string): void;
}

export interface ExecWsConnection {
  /**
   * True when the proxy negotiated exec control (credit-bounded stdin, typed
   * errors, confirmed exits). False on a legacy connection.
   */
  readonly negotiated: boolean;
  /** Send stdin with bounded frames and WebSocket send-buffer backpressure. */
  writeStdin(data: Uint8Array, signal: AbortSignal): Promise<void>;
  /** Half-close stdin (EOF) so commands that read stdin can finish. */
  closeStdin(): void;
  /** Deliver a signal to the command's process group (e.g. "TERM", "KILL"). */
  signal(name: string): void;
  close(): void;
}

/**
 * Opens a tcp-proxy `/ws/exec` session for `command` and resolves once it is
 * live (socket open and the init frame sent). The JWT travels as the last
 * `Sec-WebSocket-Protocol` value, per the bridge's token-extraction contract;
 * a `shell`-scoped token authorizes `/ws/exec`.
 */
export function connectExecWs(args: {
  config: NormalizedRailwayClientConfig;
  jwt: string;
  command: string;
  /** Working directory for the command; omit for the sandbox default. */
  cwd?: string;
  /** Extra environment variables for the command. */
  env?: Record<string, string>;
  /** Resume an existing durable session by name; omit/empty to start fresh. */
  sessionName?: string;
  /** Resume from the server's last-read cursor. Note some loss if previous clients read didn't keep up */
  resumeFromLastRead?: boolean;
  ephemeral?: boolean;
  /**
   * Skip `exec_hello` and send `init_exec` first, for a proxy that predates exec
   * control. Stdin is then bounded only by the local send buffer.
   */
  legacy?: boolean;
  /** Cancels connection establishment only; a live command must be signalled. */
  signal?: AbortSignal;
  handlers: ExecWsHandlers;
}): Promise<ExecWsConnection> {
  const {
    config, jwt, command, cwd, env, sessionName, resumeFromLastRead,
    ephemeral, legacy = false, signal, handlers,
  } = args;
  signal?.throwIfAborted();
  const WS: WebSocketConstructor = resolveWebSocketImpl(config);

  return new Promise<ExecWsConnection>((resolve, reject) => {
    let opened = false;
    let closed = false;
    let helloSent = false;
    let credits = 0;
    let window = 0;
    let creditWaiters: Array<() => void> = [];
    const wakeCreditWaiters = () => {
      const waiters = creditWaiters;
      creditWaiters = [];
      for (const wake of waiters) wake();
    };
    // Credits pace input to the remote command. A command that is slow to read
    // stdin is legitimate, so this waits without a deadline; abort and close
    // still end the wait.
    const waitForCredit = (abort: AbortSignal) => new Promise<void>((resolve, rejectWait) => {
      const onWaitAbort = () => {
        creditWaiters = creditWaiters.filter(w => w !== wake);
        rejectWait(abort.reason);
      };
      const wake = () => {
        abort.removeEventListener("abort", onWaitAbort);
        resolve();
      };
      creditWaiters.push(wake);
      abort.addEventListener("abort", onWaitAbort, { once: true });
    });
    const socket = new WS(config.tcpProxyWsEndpoint, [
      SHELL_SUBPROTOCOL,
      jwt,
    ]) as unknown as RailwayWsSocket;
    socket.binaryType = "arraybuffer";
    const assertOpen = () => {
      if (closed) {
        throw new RailwayConnectionError({
          message: "Exec connection is closed.",
        });
      }
    };
    const onAbort = () => {
      closed = true;
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason);
      socket.close(1000, "");
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();

    const start = () => {
      if (closed || signal?.aborted) {
        socket.close(1000, "");
        return;
      }
      opened = true;
      signal?.removeEventListener("abort", onAbort);
      const data: {
        command: string;
        cwd?: string;
        env?: Record<string, string>;
        durable_session_name?: string;
        resume_from_last_read?: boolean;
        ephemeral?: boolean;
      } = { command };
      if (cwd) data.cwd = cwd;
      if (env && Object.keys(env).length > 0) data.env = env;
      if (sessionName) data.durable_session_name = sessionName;
      if (resumeFromLastRead) data.resume_from_last_read = true;
      if (ephemeral) data.ephemeral = true;
      try {
        socket.send(JSON.stringify({ type: "init_exec", data }));
      } catch (error) {
        closed = true;
        reject(error);
        socket.close(1000, "");
        return;
      }
      resolve({
        negotiated: !legacy,
        async writeStdin(bytes, signal) {
          signal.throwIfAborted();
          assertOpen();
          for (let offset = 0; offset < bytes.length; offset += STDIN_CHUNK_BYTES) {
            while (credits === 0) {
              signal.throwIfAborted();
              assertOpen();
              await waitForCredit(signal);
            }
            const started = Date.now();
            while ((socket.bufferedAmount ?? 0) > SEND_HIGH_WATER_BYTES) {
              signal.throwIfAborted();
              assertOpen();
              if (Date.now() - started >= SEND_STALL_TIMEOUT_MS) {
                throw new RailwayConnectionError({
                  message: `Exec stdin send buffer stalled for ${SEND_STALL_TIMEOUT_MS}ms.`,
                });
              }
              await new Promise(resolve => setTimeout(resolve, SEND_POLL_MS));
            }
            signal.throwIfAborted();
            assertOpen();
            const chunk = bytes.subarray(offset, offset + STDIN_CHUNK_BYTES);
            const frame = new Uint8Array(chunk.length + 1);
            frame[0] = STDIN_FRAME;
            frame.set(chunk, 1);
            credits--;
            socket.send(frame);
          }
        },
        closeStdin: () => {
          assertOpen();
          socket.send(JSON.stringify({ type: "stdin_close" }));
        },
        signal: name => {
          assertOpen();
          socket.send(JSON.stringify({ type: "signal", data: { signal: name } }));
        },
        close: () => {
          closed = true;
          wakeCreditWaiters();
          socket.close(1000, "");
        },
      });
    };

    socket.onopen = () => {
      if (closed) return;
      if (legacy) {
        // No flow control to negotiate: stdin is paced by bufferedAmount alone.
        credits = window = Number.POSITIVE_INFINITY;
        start();
        return;
      }
      // Negotiate BEFORE transmitting a command. An old proxy rejects the
      // command-less hello, so unsupported peers cannot start an orphan exec.
      try {
        socket.send(JSON.stringify({ type: "exec_hello" }));
        helloSent = true;
      } catch (error) {
        signal?.removeEventListener("abort", onAbort);
        closed = true;
        reject(error);
        socket.close(1000, "");
      }
    };

    socket.onmessage = event => {
      if (closed) return;
      const { data } = event;
      if (data instanceof ArrayBuffer) {
        if (opened) handleBinaryFrame(data, handlers);
        return;
      }
      if (typeof data !== "string") return;
      const frame = parseControlFrame(data);
      if (!frame) return;
      if (!opened) {
        if (frame.type !== "exec_capabilities") return;
        try {
          credits = window = negotiatedStdinWindow(frame.data);
        } catch (error) {
          signal?.removeEventListener("abort", onAbort);
          closed = true;
          reject(error);
          socket.close(1000, "");
          return;
        }
        start();
        return;
      }
      switch (frame.type) {
        case "stdin_credit":
          if (validCreditGrant(frame.data?.chunks, window - credits)) {
            credits += frame.data!.chunks!;
            wakeCreditWaiters();
          } else {
            handlers.onError(new RailwayConnectionError({
              message: "Invalid exec stdin credit frame.",
            }));
          }
          break;
        case "stdin_error":
          handlers.onStdinError(new RailwayConnectionError({
            message: "Remote exec stdin write failed.",
          }));
          break;
        case "exit":
          emitExit(frame.data, handlers);
          break;
        // The proxy's typed failure (exit_unconfirmed, output_failed, ...),
        // sent just before it closes. The outcome is unknown, not an exit.
        case "error":
          handlers.onError(new RailwayConnectionError({
            message: `tcp-proxy exec error (${
              typeof frame.data?.code === "string" ? frame.data.code : "unknown"
            })${
              typeof frame.data?.message === "string" && frame.data.message
                ? `: ${frame.data.message}`
                : ""
            }.`,
          }));
          break;
        case "durable_session":
          emitDurableSession(frame.data, handlers);
          break;
      }
    };

    socket.onclose = event => {
      closed = true;
      wakeCreditWaiters();
      signal?.removeEventListener("abort", onAbort);
      if (!opened) {
        const detail = `code ${event.code}${event.reason ? `: ${event.reason}` : ""}`;
        // The proxy routes the session after accepting the socket, so a close
        // here can be a denial, a routing failure, or a deploy, not only an old
        // proxy. An old proxy answers the bare hello with a normal closure.
        if (helloSent && event.code === LEGACY_REJECT_CLOSE_CODE) {
          reject(new ExecControlUnsupportedError({
            message: `tcp-proxy does not support exec control (${detail}); no command was sent.`,
            closeCode: event.code,
          }));
          return;
        }
        reject(notStarted(
          `tcp-proxy exec session closed before the command was sent (${detail}).`,
          { retryable: TRANSIENT_CLOSE_CODES.has(event.code), closeCode: event.code },
        ));
        return;
      }
      handlers.onClose({ code: event.code, reason: event.reason });
    };

    socket.onerror = event => {
      if (opened) return;
      closed = true;
      signal?.removeEventListener("abort", onAbort);
      reject(notStarted(
        "tcp-proxy exec WebSocket connection failed; no command was sent.",
        { retryable: true, cause: event },
      ));
      socket.close(1000, "");
    };
  });
}

/** Binary frame: a leading tag byte selects the stream, the rest is payload. */
function handleBinaryFrame(buffer: ArrayBuffer, handlers: ExecWsHandlers): void {
  const view = new Uint8Array(buffer);
  if (view.length <= 1) return;
  if (view[0] === STDOUT_FRAME) handlers.onStdout(view.subarray(1));
  else if (view[0] === STDERR_FRAME) handlers.onStderr(view.subarray(1));
}

interface ControlFrameData {
  version?: number;
  stdin_chunk_bytes?: number;
  stdin_chunks?: number;
  chunks?: number;
  exit_code?: number;
  reason?: string;
  durable_session_name?: string;
  code?: string;
  message?: string;
}

function parseControlFrame(text: string): { type?: string; data?: ControlFrameData } | undefined {
  try {
    return JSON.parse(text) ?? undefined;
  } catch {
    return undefined;
  }
}

function validCreditGrant(chunks: unknown, available: number): chunks is number {
  return typeof chunks === "number" && Number.isSafeInteger(chunks) &&
    chunks > 0 && chunks <= available;
}

/**
 * Accepts any later protocol version and any chunk limit at least as large as
 * the chunks this client sends, so a newer proxy does not break deployed SDKs.
 */
function negotiatedStdinWindow(data: ControlFrameData | undefined): number {
  if (typeof data?.version !== "number" || data.version < MIN_EXEC_CONTROL_VERSION ||
    typeof data.stdin_chunk_bytes !== "number" || data.stdin_chunk_bytes < STDIN_CHUNK_BYTES ||
    !validCreditGrant(data.stdin_chunks, MAX_STDIN_CHUNKS)) {
    throw new RailwayConnectionError({
      message: "Unsupported exec control capabilities; no command was sent.",
    });
  }
  return data.stdin_chunks;
}

function emitExit(
  data: ControlFrameData | undefined,
  handlers: ExecWsHandlers,
): void {
  const code = data?.exit_code;
  if (typeof code !== "number" || !Number.isInteger(code) || code < -1 || code > 2_147_483_647) {
    handlers.onError(new RailwayConnectionError({ message: "Exec exit frame has no valid remote exit code; the command's outcome is unknown." }));
    return;
  }
  handlers.onExit(code, data?.reason ?? "");
}

function emitDurableSession(
  data: ControlFrameData | undefined,
  handlers: ExecWsHandlers,
): void {
  if (data?.durable_session_name) {
    handlers.onDurableSession?.(data.durable_session_name);
  }
}
