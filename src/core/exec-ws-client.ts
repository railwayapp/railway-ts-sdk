import {
  resolveWebSocketImpl,
  type NormalizedRailwayClientConfig,
  type WebSocketConstructor,
} from "./config.js";
import { RailwayConnectionError } from "./errors.js";

/**
 * tcp-proxy `/ws/exec` wire protocol: stdout/stderr ride binary frames tagged
 * by a leading byte; init, stdin-EOF, and exit are JSON text frames.
 */
const STDOUT_FRAME = 0x01;
const STDERR_FRAME = 0x03;

/** Subprotocol the tcp-proxy bridges expect alongside the JWT. */
const SHELL_SUBPROTOCOL = "railway-shell";

/** Minimal surface shared by native `WebSocket` and the `ws` package. */
interface ExecSocket {
  binaryType: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  send(data: string | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
}

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
    ]) as unknown as ExecSocket;
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
      if (data instanceof ArrayBuffer) {
        const view = new Uint8Array(data);
        if (view.length <= 1) return;
        if (view[0] === STDOUT_FRAME) handlers.onStdout(view.subarray(1));
        else if (view[0] === STDERR_FRAME) handlers.onStderr(view.subarray(1));
        return;
      }
      if (typeof data === "string") {
        let frame: {
          type?: string;
          data?: {
            exit_code?: number;
            reason?: string;
            durable_session_name?: string;
          };
        };
        try {
          frame = JSON.parse(data);
        } catch {
          return;
        }
        if (frame.type === "exit") {
          handlers.onExit(frame.data?.exit_code ?? 0, frame.data?.reason ?? "");
        } else if (
          frame.type === "durable_session" &&
          frame.data?.durable_session_name
        ) {
          handlers.onDurableSession?.(frame.data.durable_session_name);
        }
      }
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
