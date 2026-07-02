import type { NormalizedRailwayClientConfig } from "../core/config.js";
import { RailwayError } from "../core/errors.js";
import {
  connectExecWs,
  type ExecWsConnection,
} from "../core/exec-ws-client.js";
import { requestGraphQL } from "../core/graphql-client.js";
import {
  RailwayGenerateShellTokenDocument,
  type RailwayGenerateShellTokenMutation,
  type RailwayGenerateShellTokenMutationVariables,
} from "../generated/graphql.js";
import type { ExecOptions, ExecResult, ExecSignal, ExecTarget } from "./types.js";

const decoder = () => new TextDecoder();

/**
 * Reattach carries a durable session id, not a command, but the `/ws/exec`
 * bridge requires a non-empty command. The VM ignores it when the id resolves
 * to a live session; this no-op is what runs only if the id has already expired
 * (a fresh session the caller can't tell apart — see the reattach caveat).
 */
const REATTACH_PLACEHOLDER_COMMAND = ":";

/**
 * Interactive stdin for a running exec, enabled with `ExecOptions.stdin: true`.
 * Writes go to the command's process over the exec WebSocket; `end()` delivers
 * EOF (commands like `cat` only exit after it).
 */
export interface ExecStdin {
  /** Write to the command's stdin. Strings are UTF-8 encoded. */
  write(data: string | Uint8Array): Promise<void>;
  /** Half-close stdin (EOF) so commands that read stdin can finish. */
  end(): Promise<void>;
}

/** Module-internal access to ExecHandle's private constructor. */
let constructHandle: (args: {
  sessionName: Promise<string>;
  result: Promise<ExecResult>;
  kill: (signal: ExecSignal) => Promise<boolean>;
  detach: () => Promise<string>;
  stdin: ExecStdin;
}) => ExecHandle;

/**
 * An in-flight exec. Awaiting it (or any Promise method) yields the final
 * `ExecResult`; `sessionName` and `kill()` manage the command while it runs.
 */
export class ExecHandle implements Promise<ExecResult> {
  /** Durable session name for this exec; reattach via `exec({ sessionName })`. */
  readonly sessionName: Promise<string>;
  /**
   * Interactive stdin. Only live when the exec was started with
   * `stdin: true`; otherwise `write()` rejects (stdin was EOF'd at start).
   */
  readonly stdin: ExecStdin;
  readonly [Symbol.toStringTag] = "ExecHandle";
  readonly #result: Promise<ExecResult>;
  readonly #kill: (signal: ExecSignal) => Promise<boolean>;
  readonly #detach: () => Promise<string>;

  /** Constructed by `Sandbox.exec`; not constructible from outside the SDK. */
  private constructor(args: {
    sessionName: Promise<string>;
    result: Promise<ExecResult>;
    kill: (signal: ExecSignal) => Promise<boolean>;
    detach: () => Promise<string>;
    stdin: ExecStdin;
  }) {
    this.sessionName = args.sessionName;
    this.stdin = args.stdin;
    this.#result = args.result;
    this.#kill = args.kill;
    this.#detach = args.detach;
    // Side taps: a handle held only for kill()/callbacks must not surface
    // unhandled rejections. Awaiting the handle still rejects normally.
    this.sessionName.catch(() => {});
    this.#result.catch(() => {});
  }

  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  then<TResult1 = ExecResult, TResult2 = never>(
    onfulfilled?: ((value: ExecResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.#result.then(onfulfilled, onrejected);
  }

  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<ExecResult | TResult> {
    return this.#result.catch(onrejected);
  }

  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  finally(onfinally?: (() => void) | null): Promise<ExecResult> {
    return this.#result.finally(onfinally);
  }

  /** The final result as a plain promise; identical to awaiting the handle. */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  result(): Promise<ExecResult> {
    return this.#result;
  }

  /**
   * Terminate the running command with a signal (default `TERM`) delivered to
   * its process group — a real kill, regardless of durable sessions. The handle
   * then settles with the command's exit (a signalled process reports exit code
   * `-1`). To stop streaming WITHOUT ending the command, use `detach()`.
   */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  kill(signal: ExecSignal = "TERM"): Promise<boolean> {
    return this.#kill(signal);
  }

  /**
   * Stop streaming and close the WebSocket without ending the command — the
   * durable session keeps running server-side. Resolves with its `sessionName`
   * so you can reattach later via `exec({ sessionName })`; rejects if the server
   * assigned no durable session (reattach is impossible). The handle itself
   * settles with the output captured up to the detach.
   */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  detach(): Promise<string> {
    return this.#detach();
  }

  static {
    constructHandle = args => new ExecHandle(args);
  }
}

export interface ExecContext {
  config: NormalizedRailwayClientConfig;
  environmentId: string;
  sandboxId: string;
}

interface ExecControl {
  connection?: ExecWsConnection;
  /** Invoked once the socket is live; lets queued stdin writes proceed. */
  onConnection?: (connection: ExecWsConnection) => void;
  pendingSignal?: ExecSignal;
  detached: boolean;
}

const stdinEncoder = new TextEncoder();

/**
 * Runs an exec over the tcp-proxy `/ws/exec` bridge: a non-PTY session with
 * separated stdout/stderr and a real exit code. A `shell`-scoped JWT (minted by
 * `generateShellToken`) authorizes the path.
 *
 * When durable sessions are enabled server-side, the VM-assigned id is surfaced
 * as `sessionName` and `exec({ sessionName })` reattaches to it (replaying the
 * retained output tail, then following live). `kill()`/`timeoutSec` close the
 * socket —
 * with durable on that only detaches (the process keeps running, reattachable);
 * with it off the session is torn down.
 */
export function startExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
): ExecHandle {
  if (
    typeof target !== "string" &&
    (options.cwd !== undefined ||
      (options.env && Object.keys(options.env).length > 0))
  ) {
    throw new RailwayError(
      "cwd/env apply only to fresh execs; a reattached session is already running.",
    );
  }

  let resolveSessionName!: (value: string) => void;
  let rejectSessionName!: (reason?: unknown) => void;
  const sessionName = new Promise<string>((resolve, reject) => {
    resolveSessionName = resolve;
    rejectSessionName = reject;
  });

  const control: ExecControl = { detached: false };

  // stdin writes can land before the socket exists (token mint + connect are
  // async); they wait on the live connection rather than being dropped.
  let rejectConnection!: (reason: unknown) => void;
  const connectionReady = new Promise<ExecWsConnection>((resolve, reject) => {
    rejectConnection = reject;
    control.onConnection = resolve;
  });
  // A handle held only for its result must not surface unhandled rejections.
  connectionReady.catch(() => {});

  const stdin: ExecStdin =
    options.stdin === true
      ? {
          write: async data => {
            const connection = await connectionReady;
            connection.writeStdin(
              typeof data === "string" ? stdinEncoder.encode(data) : data,
            );
          },
          end: async () => {
            const connection = await connectionReady;
            connection.closeStdin();
          },
        }
      : {
          write: () =>
            Promise.reject(
              new RailwayError(
                "stdin was EOF'd at exec start; pass `stdin: true` in ExecOptions to keep it open.",
              ),
            ),
          end: () => Promise.resolve(),
        };

  const kill = async (signal: ExecSignal): Promise<boolean> => {
    if (!control.connection) {
      control.pendingSignal = signal; // delivered once the socket exists
      return true;
    }
    try {
      control.connection.signal(signal);
      return true;
    } catch {
      return false;
    }
  };

  const detach = async (): Promise<string> => {
    control.detached = true;
    control.connection?.close();
    return sessionName;
  };

  const result = runExec(
    context,
    target,
    options,
    resolveSessionName,
    rejectSessionName,
    control,
  ).catch(error => {
    rejectSessionName(error);
    rejectConnection(error);
    throw error;
  });

  return constructHandle({ sessionName, result, kill, detach, stdin });
}

async function runExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
  onSessionName: (name: string) => void,
  onNoSessionName: (reason: unknown) => void,
  control: ExecControl,
): Promise<ExecResult> {
  const reattach = typeof target !== "string";
  const command = reattach ? REATTACH_PLACEHOLDER_COMMAND : target;
  const sessionName = reattach ? target.sessionName : undefined;

  // Resolve the session name once: to the resume name immediately on reattach,
  // otherwise to the VM-assigned durable name when it arrives, falling back to a
  // client id if durable sessions are off (no assigned name is ever sent).
  let sessionNameResolved = false;
  const resolveSessionNameOnce = (name: string) => {
    if (sessionNameResolved) return;
    sessionNameResolved = true;
    onSessionName(name);
  };
  if (reattach) resolveSessionNameOnce(sessionName!);

  const input: RailwayGenerateShellTokenMutationVariables["input"] = {
    environmentId: context.environmentId,
    instanceId: context.sandboxId,
    kind: "sandbox",
    scope: "shell",
  };
  const tokenData = await requestGraphQL<
    RailwayGenerateShellTokenMutation,
    RailwayGenerateShellTokenMutationVariables
  >(context.config, RailwayGenerateShellTokenDocument, { input });
  const jwt = tokenData.generateShellToken;

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  let timedOut = false;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stdoutDecoder = decoder();
  const stderrDecoder = decoder();

  let resolveResult!: (value: ExecResult) => void;
  let rejectResult!: (reason: unknown) => void;
  const done = new Promise<ExecResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const settle = (outcome: ExecResult | { error: unknown }) => {
    if (settled) return;
    settled = true;
    // Durable sessions assign a name up front; if none arrived by the time the
    // exec settles, the server can't do durable — fail `sessionName` rather than
    // hand back a fabricated id that can never reattach.
    if (!sessionNameResolved) {
      sessionNameResolved = true;
      onNoSessionName(
        new RailwayError(
          "Server did not return a durable session for this exec.",
        ),
      );
    }
    if (timer) clearTimeout(timer);
    try {
      control.connection?.close();
    } catch {
      // ignore
    }
    if ("error" in outcome) rejectResult(outcome.error);
    else resolveResult(outcome);
  };

  const connection = await connectExecWs({
    config: context.config,
    jwt,
    command,
    ...(reattach
      ? {}
      : { cwd: options.cwd, env: options.env }),
    ...(sessionName
      ? {
          sessionName,
          resumeFromLastRead: options.resumeFromLastRead ?? false,
        }
      : {}),
    handlers: {
      onDurableSession: name => resolveSessionNameOnce(name),
      onStdout: bytes => {
        if (settled) return;
        try {
          const chunk = stdoutDecoder.decode(bytes, { stream: true });
          stdout += chunk;
          options.onStdout?.(chunk);
        } catch (error) {
          settle({ error });
        }
      },
      onStderr: bytes => {
        if (settled) return;
        try {
          const chunk = stderrDecoder.decode(bytes, { stream: true });
          stderr += chunk;
          options.onStderr?.(chunk);
        } catch (error) {
          settle({ error });
        }
      },
      onExit: code => {
        exitCode = code;
        settle({ exitCode, stdout, stderr, truncated: false, timedOut });
      },
      onClose: () =>
        settle({ exitCode, stdout, stderr, truncated: false, timedOut }),
    },
  });
  control.connection = connection;
  control.onConnection?.(connection);

  // A detach()/kill() that landed during token mint / connect has no socket
  // yet; honor it now that one exists.
  if (control.detached) {
    connection.close();
    return done;
  }
  if (control.pendingSignal) connection.signal(control.pendingSignal);

  if (options.stdin !== true) {
    // No interactive stdin requested; EOF it so commands reading stdin finish.
    connection.closeStdin();
  }

  if (options.timeoutSec !== undefined) {
    timer = setTimeout(() => {
      timedOut = true;
      connection.close();
    }, options.timeoutSec * 1000);
  }

  return done;
}
