import {
  resolveWebSocketImpl,
  type NormalizedRailwayClientConfig,
  type WebSocketConstructor,
} from "./config.js";
import { RailwayConnectionError } from "./errors.js";
import type { RailwayWsSocket } from "./ws-socket.js";

/**
 * tcp-proxy `/ws/exec` wire protocol: stdout/stderr ride binary frames tagged
 * by a leading byte; init, stdin-EOF, and exit are JSON text frames.
 */
const STDOUT_FRAME = 0x01;
const STDERR_FRAME = 0x03;

/** Subprotocol the tcp-proxy bridges expect alongside the JWT. */
const SHELL_SUBPROTOCOL = "railway-shell";

export interface ExecWsHandlers {
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
  /** Resume an existing durable session by name; omit/empty to start fresh. */
  sessionName?: string;
  /** Resume from the server's last-read cursor. Note some loss if previous clients read didn't keep up */
  resumeFromLastRead?: boolean;
  handlers: ExecWsHandlers;
}): Promise<ExecWsConnection> {
  const { config, jwt, command, sessionName, resumeFromLastRead, handlers } = args;
  const WS: WebSocketConstructor = resolveWebSocketImpl(config);

  return new Promise<ExecWsConnection>((resolve, reject) => {
    let opened = false;
    const socket = new WS(config.tcpProxyWsEndpoint, [
      SHELL_SUBPROTOCOL,
      jwt,
    ]) as unknown as RailwayWsSocket;
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      opened = true;
      const data: {
        command: string;
        durable_session_name?: string;
        resume_from_last_read?: boolean;
      } = { command };
      if (sessionName) data.durable_session_name = sessionName;
      if (resumeFromLastRead) data.resume_from_last_read = true;
      socket.send(JSON.stringify({ type: "init_exec", data }));
      resolve({
        closeStdin: () => socket.send(JSON.stringify({ type: "stdin_close" })),
        signal: name =>
          socket.send(JSON.stringify({ type: "signal", data: { signal: name } })),
        close: () => socket.close(1000, ""),
      });
    };

    socket.onmessage = event => {
      const { data } = event;
      if (data instanceof ArrayBuffer) handleBinaryFrame(data, handlers);
      else if (typeof data === "string") handleTextFrame(data, handlers);
    };

    socket.onclose = event => {
      if (!opened) {
        reject(
          new RailwayConnectionError({
            message: `tcp-proxy exec WebSocket closed before opening (code ${event.code}${
              event.reason ? `: ${event.reason}` : ""
            }).`,
            closeCode: event.code,
          }),
        );
        return;
      }
      handlers.onClose({ code: event.code, reason: event.reason });
    };

    socket.onerror = event => {
      if (opened) return;
      reject(
        new RailwayConnectionError({
          message: "tcp-proxy exec WebSocket connection failed.",
          cause: event,
        }),
      );
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
  exit_code?: number;
  reason?: string;
  durable_session_name?: string;
}

/** Text frame: JSON control message — exit, or a durable session assignment. */
function handleTextFrame(text: string, handlers: ExecWsHandlers): void {
  let frame: { type?: string; data?: ControlFrameData };
  try {
    frame = JSON.parse(text);
  } catch {
    return;
  }
  if (frame.type === "exit") emitExit(frame.data, handlers);
  else if (frame.type === "durable_session") {
    emitDurableSession(frame.data, handlers);
  }
}

function emitExit(
  data: ControlFrameData | undefined,
  handlers: ExecWsHandlers,
): void {
  handlers.onExit(data?.exit_code ?? 0, data?.reason ?? "");
}

function emitDurableSession(
  data: ControlFrameData | undefined,
  handlers: ExecWsHandlers,
): void {
  if (data?.durable_session_name) {
    handlers.onDurableSession?.(data.durable_session_name);
  }
}
