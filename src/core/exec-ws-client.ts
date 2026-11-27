import {
  resolveWebSocketImpl,
  type NormalizedRailwayClientConfig,
  type WebSocketConstructor,
} from "./config.js";
import {
  ExecConnectionLimitError,
  ExecControlUnsupportedError,
  ExecNotStartedError,
  RailwayConnectionError,
} from "./errors.js";
import { connectionProtocol, watchHandshake } from "./ws-handshake.js";
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
/** tcp-proxy's private close code for the sandbox's tunnel limit. */
const MAX_CONNECTIONS_CLOSE_CODE = 4001;
/** What a proxy that predates exec control sends after rejecting the bare hello. */
const LEGACY_REJECT_CLOSE_CODE = 1000;
const UNSUPPORTED_CAPABILITIES = "Unsupported exec control capabilities";
const WS_OPEN = 1;

const notRetryable = new WeakSet<object>();
const reattachable = new WeakSet<object>();

/**
 * Whether a connection failure left nothing running AND is worth one more try.
 * Denials (policy, limits) and routing failures are not.
 */
export function shouldRetryBeforeStart(error: unknown): boolean {
  return error instanceof ExecNotStartedError && !notRetryable.has(error);
}

export type UnconfirmedStartError = RailwayConnectionError & { readonly closeReason: string };

/**
 * A transient close after init_exec and before the start, on an exec that names
 * its durable session: the command may have started, and resending the same
 * init_exec reattaches to it instead of running it twice.
 */
export function shouldReattach(error: unknown): error is UnconfirmedStartError {
  return error instanceof RailwayConnectionError && reattachable.has(error);
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
  /** The proxy retired a reused socket before reading init_exec, so nothing ran. */
  onNotStarted?(error: RetiredBeforeStartError): void;
}

export type RetiredBeforeStartError = ExecNotStartedError & { readonly tokenExpired: boolean };

export interface ExecWsConnection {
  /**
   * True when the proxy negotiated exec control (credit-bounded stdin, typed
   * errors, confirmed exits). False on a legacy connection.
   */
  readonly negotiated: boolean;
  /**
   * Resolves once the command started or the exec ended through a handler; rejects
   * when the proxy closed before starting it, so nothing ran.
   */
  readonly started: Promise<void>;
  /** Send stdin with bounded frames and WebSocket send-buffer backpressure. */
  writeStdin(data: Uint8Array, signal: AbortSignal): Promise<void>;
  /** Half-close stdin (EOF) so commands that read stdin can finish. */
  closeStdin(): void;
  /** Deliver a signal to the command's process group (e.g. "TERM", "KILL"). */
  signal(name: string): void;
  close(): void;
}

export interface ExecInit {
  command: string;
  /** Working directory for the command; omit for the sandbox default. */
  cwd?: string;
  /** Extra environment variables for the command. */
  env?: Record<string, string>;
  /** Durable session name: reattaches if it exists, else starts the command under it. */
  sessionName?: string;
  /** Resume from the server's last-read cursor. Note some loss if previous clients read didn't keep up */
  resumeFromLastRead?: boolean;
  ephemeral?: boolean;
}

/** A negotiated `/ws/exec` socket that runs one exec at a time. */
export interface ExecSocket {
  readonly jwt: string;
  readonly closed: boolean;
  /** Whether `unref()` stops the socket keeping the process alive. */
  readonly canUnref: boolean;
  ref(): void;
  unref(): void;
  begin(init: ExecInit, handlers: ExecWsHandlers, signal?: AbortSignal): ExecWsConnection;
  close(): void;
}

const TOKEN_EXPIRED = "token_expired";
/** Reasons the proxy gives when it retires a reused socket without reading init_exec. */
const RETIRE_REASONS: ReadonlySet<string> = new Set([
  "idle timeout",
  "tunnel stream budget spent",
  "tunnel closed",
  TOKEN_EXPIRED,
]);

/** Opens a one-exec socket and sends init_exec. */
export async function connectExecWs(args: ExecInit & {
  config: NormalizedRailwayClientConfig;
  jwt: string;
  /**
   * Skip `exec_hello` and send `init_exec` first, for a proxy that predates exec
   * control. Stdin is then bounded only by the local send buffer.
   */
  legacy?: boolean;
  /** Cancels connection establishment only; a live command must be signalled. */
  signal?: AbortSignal;
  handlers: ExecWsHandlers;
}): Promise<ExecWsConnection> {
  const { config, jwt, legacy, signal, handlers, ...init } = args;
  const socket = await openExecSocket({ config, jwt, ...(legacy ? { legacy } : {}), ...(signal ? { signal } : {}) });
  return socket.begin(init, handlers, signal);
}

/** Opens and negotiates a socket; the JWT rides as the last `Sec-WebSocket-Protocol` value. */
export function openExecSocket(args: {
  config: NormalizedRailwayClientConfig;
  jwt: string;
  webSocketImpl?: WebSocketConstructor | undefined;
  legacy?: boolean;
  reuse?: boolean;
  /** Ask the proxy to answer before routing; if it agrees, `exec_started` marks the start. */
  pipeline?: boolean;
  /** Cancels connection establishment only. */
  signal?: AbortSignal;
  onIdle?: (socket: ExecSocket) => void;
  onClose?: (socket: ExecSocket) => void;
}): Promise<ExecSocket> {
  const { config, jwt, legacy = false, reuse = false, signal, onIdle, onClose } = args;
  const pipeline = args.pipeline === true && !legacy;
  signal?.throwIfAborted();
  const WS: WebSocketConstructor = args.webSocketImpl ?? resolveWebSocketImpl(config);

  return new Promise<ExecSocket>((resolve, reject) => {
    let ready = false;
    let closed = false;
    let closeInfo = { code: 1000, reason: "" };
    let helloSent = false;
    let negotiated = false;
    let pipelined = false;
    let reusable = false;
    let window = 0;
    let execs = 0;
    let current: ExecState | undefined;
    const protocol = connectionProtocol();
    const socket = new WS(config.tcpProxyWsEndpoint, [
      SHELL_SUBPROTOCOL,
      protocol,
      jwt,
    ]) as unknown as RailwayWsSocket;
    // After construction so a constructor that throws leaves nothing subscribed;
    // the response arrives asynchronously, so none can be missed.
    const handshake = watchHandshake(protocol, "exec");
    socket.binaryType = "arraybuffer";

    let closeNotified = false;
    const closeSocket = () => {
      if (!closed) {
        closed = true;
        socket.close(1000, "");
      }
      // The close event still reaches a running exec's onClose (detach settles there).
      current?.wakeCreditWaiters();
      if (ready && !closeNotified) {
        closeNotified = true;
        onClose?.(execSocket);
      }
    };
    const endExec = (exec: ExecState) => {
      exec.ended = true;
      if (current === exec) current = undefined;
      exec.wakeCreditWaiters();
      exec.releaseStart();
    };

    const closedBeforeStart = (code: number, reason: string, sent: boolean): Error => {
      const detail = `code ${code}${reason ? `: ${reason}` : ""}`;
      const outcome = sent ? "the command did not start" : "no command was sent";
      if (code === MAX_CONNECTIONS_CLOSE_CODE) {
        const limited = new ExecConnectionLimitError({
          message: `tcp-proxy refused the exec connection at the sandbox's connection limit (${detail}); ${outcome}.`,
          closeCode: code,
        });
        notRetryable.add(limited);
        return limited;
      }
      // The proxy routes the session after accepting the socket, so a close
      // here can be a denial, a routing failure, or a deploy, not only an old
      // proxy. An old proxy answers the bare hello with a normal closure.
      if (helloSent && !negotiated && code === LEGACY_REJECT_CLOSE_CODE) {
        return new ExecControlUnsupportedError({
          message: `tcp-proxy does not support exec control (${detail}); ${outcome}.`,
          closeCode: code,
        });
      }
      return notStarted(
        `tcp-proxy exec session closed before the command ${sent ? "started" : "was sent"} (${detail}).`,
        { retryable: TRANSIENT_CLOSE_CODES.has(code), closeCode: code },
      );
    };

    const execSocket: ExecSocket = {
      jwt,
      get closed() { return closed; },
      canUnref: typeof socket.unref === "function",
      ref: () => socket.ref?.(),
      unref: () => socket.unref?.(),
      close: closeSocket,
      begin(init, handlers, beginSignal) {
        if (!closed && socket.readyState !== undefined && socket.readyState !== WS_OPEN) closeSocket();
        if (closed) {
          const detail = `code ${closeInfo.code}${closeInfo.reason ? `: ${closeInfo.reason}` : ""}`;
          throw notStarted(
            `tcp-proxy exec session closed before the command was sent (${detail}).`,
            { retryable: execs > 0 || TRANSIENT_CLOSE_CODES.has(closeInfo.code), closeCode: closeInfo.code },
          );
        }
        if (current) throw new RailwayConnectionError({ message: "Exec socket is already running a command." });
        if (beginSignal?.aborted) {
          if (reusable && onIdle) onIdle(execSocket);
          else closeSocket();
          throw beginSignal.reason;
        }
        const exec = new ExecState(handlers, window, execs > 0, Boolean(init.sessionName) && !init.ephemeral);
        execs++;
        current = exec;
        try {
          socket.send(JSON.stringify({ type: "init_exec", data: initFrameData(init) }));
        } catch (error) {
          closeSocket();
          throw error;
        }
        if (!pipelined) exec.commit();
        else if (beginSignal) {
          exec.onStartAbort(beginSignal, () => {
            // Cancels routing, or reaches the command if it has just started.
            try {
              socket.send(JSON.stringify({ type: "signal", data: { signal: "TERM" } }));
            } catch {
              // closing below is enough
            }
            exec.failStart(beginSignal.reason);
            endExec(exec);
            closeSocket();
          });
        }
        return execConnection(exec);
      },
    };

    const execConnection = (exec: ExecState): ExecWsConnection => {
      const assertOpen = () => {
        if (closed || exec.ended) {
          throw new RailwayConnectionError({
            message: "Exec connection is closed.",
          });
        }
      };
      return {
        negotiated: !legacy,
        started: exec.started,
        async writeStdin(bytes, signal) {
          signal.throwIfAborted();
          assertOpen();
          for (let offset = 0; offset < bytes.length; offset += STDIN_CHUNK_BYTES) {
            while (exec.credits === 0) {
              signal.throwIfAborted();
              assertOpen();
              await exec.waitForCredit(signal);
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
            exec.credits--;
            exec.inputSent = true;
            socket.send(frame);
          }
        },
        closeStdin: () => {
          assertOpen();
          if (exec.stdinClosed) return;
          exec.stdinClosed = true;
          socket.send(JSON.stringify({ type: "stdin_close" }));
        },
        signal: name => {
          assertOpen();
          exec.inputSent = true;
          socket.send(JSON.stringify({ type: "signal", data: { signal: name } }));
        },
        close: () => {
          if (exec.ended) return;
          if (exec.exited && reusable && !exec.broken && !closed && onIdle) {
            endExec(exec);
            onIdle(execSocket);
          } else {
            closeSocket();
          }
        },
      };
    };

    const retiredBeforeStart = (exec: ExecState, reason: string, closeCode?: number): boolean => {
      if (!exec.reused || exec.sawFrame || exec.inputSent) return false;
      if (exec.committed && !exec.handlers.onNotStarted) return false;
      const error = Object.assign(notStarted(
        `tcp-proxy retired the reused exec socket before the command started (${reason}).`,
        { retryable: true, ...(closeCode !== undefined ? { closeCode } : {}) },
      ), { tokenExpired: reason === TOKEN_EXPIRED });
      if (!exec.committed) exec.failStart(error);
      endExec(exec);
      if (exec.committed) exec.handlers.onNotStarted!(error);
      return true;
    };

    const onAbort = () => {
      handshake.dispose();
      closed = true;
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason);
      socket.close(1000, "");
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();

    const markReady = () => {
      if (closed || signal?.aborted) {
        socket.close(1000, "");
        return;
      }
      ready = true;
      signal?.removeEventListener("abort", onAbort);
      resolve(execSocket);
    };

    socket.onopen = () => {
      handshake.dispose();
      if (closed) return;
      if (legacy) {
        // No flow control to negotiate: stdin is paced by bufferedAmount alone.
        window = Number.POSITIVE_INFINITY;
        negotiated = true;
        markReady();
        return;
      }
      // Negotiate BEFORE transmitting a command: an old proxy rejects the
      // command-less hello, and one without pipelining answers only after routing.
      const hello = reuse || pipeline
        ? { type: "exec_hello", data: { ...(reuse ? { reuse: true } : {}), ...(pipeline ? { pipeline: true } : {}) } }
        : { type: "exec_hello" };
      try {
        socket.send(JSON.stringify(hello));
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
      const exec = current;
      if (data instanceof ArrayBuffer) {
        if (exec) {
          exec.sawFrame = true;
          handleBinaryFrame(data, exec.handlers);
        }
        return;
      }
      if (typeof data !== "string") return;
      const frame = parseControlFrame(data);
      if (!frame) return;
      if (!negotiated) {
        if (frame.type !== "exec_capabilities") return;
        const negotiatedWindow = negotiatedStdinWindow(frame.data);
        if (negotiatedWindow === undefined) {
          signal?.removeEventListener("abort", onAbort);
          closed = true;
          reject(new RailwayConnectionError({ message: `${UNSUPPORTED_CAPABILITIES}; no command was sent.` }));
          socket.close(1000, "");
          return;
        }
        negotiated = true;
        window = negotiatedWindow;
        pipelined = pipeline && frame.data?.pipeline === true;
        reusable = reuse && frame.data?.reuse === true;
        markReady();
        return;
      }
      if (!exec) return;
      const { handlers } = exec;
      if (frame.type === "error" && frame.data?.code === TOKEN_EXPIRED &&
        retiredBeforeStart(exec, TOKEN_EXPIRED)) {
        closeSocket();
        return;
      }
      if (frame.type === "exec_started") {
        exec.commit();
        return;
      }
      if (frame.type === "error" && !exec.committed) {
        exec.failStart(notStarted(`tcp-proxy did not start the command (${errorDetail(frame.data)}).`, { retryable: false }));
        endExec(exec);
        closeSocket();
        return;
      }
      exec.sawFrame = true;
      switch (frame.type) {
        case "stdin_credit":
          if (validCreditGrant(frame.data?.chunks, window - exec.credits)) {
            exec.credits += frame.data!.chunks!;
            exec.wakeCreditWaiters();
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
          emitExit(frame.data, exec);
          break;
        // The proxy's typed failure (exit_unconfirmed, output_failed, ...),
        // sent just before it closes. The outcome is unknown, not an exit.
        case "error":
          exec.broken = true;
          handlers.onError(new RailwayConnectionError({
            message: `tcp-proxy exec error (${errorDetail(frame.data)}).`,
          }));
          break;
        case "durable_session":
          emitDurableSession(frame.data, handlers);
          break;
      }
    };

    socket.onclose = event => {
      handshake.dispose();
      closed = true;
      closeInfo = { code: event.code, reason: event.reason };
      signal?.removeEventListener("abort", onAbort);
      if (!ready) {
        const rateLimited = handshake.rateLimitError();
        if (rateLimited) {
          reject(rateLimited);
          return;
        }
        reject(closedBeforeStart(event.code, event.reason, false));
        return;
      }
      const exec = current;
      if (exec && !exec.ended &&
        !(RETIRE_REASONS.has(event.reason) && retiredBeforeStart(exec, event.reason, event.code))) {
        // A transient close may have lost exec_started, so the outcome is unknown
        // unless the exec named its durable session and a retry can reattach.
        const ambiguous = TRANSIENT_CLOSE_CODES.has(event.code);
        if (!exec.committed && ambiguous && exec.reattachable) {
          const detail = `code ${event.code}${event.reason ? `: ${event.reason}` : ""}`;
          const error = Object.assign(new RailwayConnectionError({
            message: `tcp-proxy exec session closed before the command was confirmed started (${detail}).`,
            closeCode: event.code,
          }), { closeReason: event.reason });
          reattachable.add(error);
          exec.failStart(error);
          endExec(exec);
        } else if (!exec.committed && !ambiguous) {
          exec.failStart(closedBeforeStart(event.code, event.reason, true));
          endExec(exec);
        } else {
          endExec(exec);
          exec.handlers.onClose({ code: event.code, reason: event.reason });
        }
      }
      closeSocket();
    };

    socket.onerror = event => {
      if (ready) return;
      handshake.dispose();
      closed = true;
      signal?.removeEventListener("abort", onAbort);
      reject(handshake.rateLimitError() ?? notStarted(
        "tcp-proxy exec WebSocket connection failed; no command was sent.",
        { retryable: true, cause: event },
      ));
      socket.close(1000, "");
    };
  });
}

/** Per-exec state on a socket; credits reset to the negotiated window for each exec. */
class ExecState {
  credits: number;
  ended = false;
  exited = false;
  broken = false;
  sawFrame = false;
  inputSent = false;
  stdinClosed = false;
  committed = false;
  readonly started: Promise<void>;
  #start!: { resolve: () => void; reject: (error: unknown) => void };
  #stopWatchingAbort: (() => void) | undefined;
  #creditWaiters: Array<() => void> = [];

  constructor(
    readonly handlers: ExecWsHandlers,
    window: number,
    readonly reused: boolean,
    readonly reattachable: boolean,
  ) {
    this.credits = window;
    this.started = new Promise((resolve, reject) => {
      this.#start = { resolve, reject };
    });
    this.started.catch(() => {});
  }

  commit(): void {
    this.committed = true;
    this.releaseStart();
  }

  releaseStart(): void {
    this.#stopWatchingAbort?.();
    this.#start.resolve();
  }

  failStart(error: unknown): void {
    this.#stopWatchingAbort?.();
    this.#start.reject(error);
  }

  onStartAbort(signal: AbortSignal, onAbort: () => void): void {
    signal.addEventListener("abort", onAbort, { once: true });
    this.#stopWatchingAbort = () => signal.removeEventListener("abort", onAbort);
  }

  wakeCreditWaiters(): void {
    const waiters = this.#creditWaiters;
    this.#creditWaiters = [];
    for (const wake of waiters) wake();
  }

  // Credits pace input to the remote command. A command that is slow to read
  // stdin is legitimate, so this waits without a deadline; abort and close
  // still end the wait.
  waitForCredit(abort: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, rejectWait) => {
      const onWaitAbort = () => {
        this.#creditWaiters = this.#creditWaiters.filter(w => w !== wake);
        rejectWait(abort.reason);
      };
      const wake = () => {
        abort.removeEventListener("abort", onWaitAbort);
        resolve();
      };
      this.#creditWaiters.push(wake);
      abort.addEventListener("abort", onWaitAbort, { once: true });
    });
  }
}

function initFrameData(init: ExecInit) {
  const data: {
    command: string;
    cwd?: string;
    env?: Record<string, string>;
    durable_session_name?: string;
    resume_from_last_read?: boolean;
    ephemeral?: boolean;
  } = { command: init.command };
  if (init.cwd) data.cwd = init.cwd;
  if (init.env && Object.keys(init.env).length > 0) data.env = init.env;
  if (init.sessionName) data.durable_session_name = init.sessionName;
  if (init.resumeFromLastRead) data.resume_from_last_read = true;
  if (init.ephemeral) data.ephemeral = true;
  return data;
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
  reuse?: boolean;
  pipeline?: boolean;
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
function negotiatedStdinWindow(data: ControlFrameData | undefined): number | undefined {
  if (typeof data?.version !== "number" || data.version < MIN_EXEC_CONTROL_VERSION ||
    typeof data.stdin_chunk_bytes !== "number" || data.stdin_chunk_bytes < STDIN_CHUNK_BYTES ||
    !validCreditGrant(data.stdin_chunks, MAX_STDIN_CHUNKS)) {
    return undefined;
  }
  return data.stdin_chunks;
}

function errorDetail(data: ControlFrameData | undefined): string {
  const code = typeof data?.code === "string" ? data.code : "unknown";
  return typeof data?.message === "string" && data.message ? `${code}: ${data.message}` : code;
}

function emitExit(data: ControlFrameData | undefined, exec: ExecState): void {
  const code = data?.exit_code;
  if (typeof code !== "number" || !Number.isInteger(code) || code < -1 || code > 2_147_483_647) {
    exec.handlers.onError(new RailwayConnectionError({ message: "Exec exit frame has no valid remote exit code; the command's outcome is unknown." }));
    return;
  }
  // Before the handler: it may close the connection, which pools the socket only after an exit.
  exec.exited = true;
  exec.handlers.onExit(code, data?.reason ?? "");
}

function emitDurableSession(
  data: ControlFrameData | undefined,
  handlers: ExecWsHandlers,
): void {
  if (data?.durable_session_name) {
    handlers.onDurableSession?.(data.durable_session_name);
  }
}
