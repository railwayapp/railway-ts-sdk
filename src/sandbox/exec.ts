import type { NormalizedRailwayClientConfig } from "../core/config.js";
import {
  ExecControlUnsupportedError,
  RailwayConnectionError,
  RailwayError,
} from "../core/errors.js";
import {
  connectExecWs,
  shouldRetryBeforeStart,
  type ExecWsConnection,
} from "../core/exec-ws-client.js";
import { requestGraphQL } from "../core/graphql-client.js";
import { ExecInterruptedError } from "./errors.js";
import { loginShellCommand } from "./shell.js";
import {
  RailwayGenerateShellTokenDocument,
  type RailwayGenerateShellTokenMutation,
  type RailwayGenerateShellTokenMutationVariables,
} from "../generated/graphql.js";
import type {
  ExecOptions,
  ExecResult,
  ExecSignal,
  ExecStdin,
  ExecTarget,
} from "./types.js";

const decoder = () => new TextDecoder();
/** TERM to KILL escalation. */
const KILL_GRACE_MS = 5_000;
/** How long termination may take to produce a confirmed exit before the outcome is unknown. */
const TERMINATION_CONFIRM_MS = KILL_GRACE_MS * 2;
/** Pause before the single reconnect after a failure that sent no command. */
const CONNECT_RETRY_DELAY_MS = 250;

/**
 * Reattach carries a durable session id, not a command, but the `/ws/exec`
 * bridge requires a non-empty command. The VM ignores it when the id resolves
 * to a live session; this no-op is what runs only if the id has already expired
 * (a fresh session the caller can't tell apart — see the reattach caveat).
 */
const REATTACH_PLACEHOLDER_COMMAND = ":";

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
  /** Writable only when exec was started with stdin: true. */
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
  pendingSignal?: ExecSignal;
  detached: boolean;
  finished: boolean;
  terminating: boolean;
  stdinController: AbortController;
}

/**
 * Runs an exec over the tcp-proxy `/ws/exec` bridge: a non-PTY session with
 * separated stdout/stderr and a real exit code. A `shell`-scoped JWT (minted by
 * `generateShellToken`) authorizes the path.
 *
 * Durable sessions survive disconnects. Only detach closes a live session
 * without terminating it; timeout/abort send signals and await a remote exit.
 */
export function startExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
): ExecHandle {
  if (
    typeof target !== "string" &&
    (options.cwd !== undefined ||
      options.ephemeral === true ||
      (options.env && Object.keys(options.env).length > 0))
  ) {
    throw new RailwayError(
      "cwd/env/ephemeral apply only to fresh execs; a reattached session is already running.",
    );
  }
  if (
    options.timeoutSec !== undefined &&
    (!Number.isFinite(options.timeoutSec) || options.timeoutSec <= 0 ||
      options.timeoutSec * 1000 > 2_147_483_647)
  ) {
    throw new TypeError(
      "`timeoutSec` must be a positive number of seconds that fits in a JavaScript timer.",
    );
  }
  if (
    options.maxOutputBytes !== undefined &&
    (!Number.isSafeInteger(options.maxOutputBytes) || options.maxOutputBytes < 0)
  ) {
    throw new TypeError("`maxOutputBytes` must be a non-negative safe integer.");
  }

  let resolveSessionName!: (value: string) => void;
  let rejectSessionName!: (reason?: unknown) => void;
  const sessionName = new Promise<string>((resolve, reject) => {
    resolveSessionName = resolve;
    rejectSessionName = reject;
  });

  const control: ExecControl = {
    detached: false,
    finished: false,
    terminating: false,
    stdinController: new AbortController(),
  };
  let resolveConnection!: (connection: ExecWsConnection) => void;
  let rejectConnection!: (error: unknown) => void;
  const ready = new Promise<ExecWsConnection>((resolve, reject) => {
    resolveConnection = resolve;
    rejectConnection = reject;
  });
  ready.catch(() => {});
  if (options.ephemeral) {
    rejectSessionName(
      new RailwayError("Ephemeral execs have no durable session name."),
    );
  }

  const kill = async (signal: ExecSignal): Promise<boolean> => {
    if (control.finished || control.detached) return false;
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
    // Prove that this command is reattachable before closing its only transport.
    const name = await sessionName;
    if (control.terminating) {
      throw new RailwayError("Cannot detach an exec while it is terminating.");
    }
    control.detached = true;
    control.stdinController.abort(
      new RailwayError("Exec stdin is no longer writable."),
    );
    control.connection?.close();
    return name;
  };

  let stdinEnded = !options.stdin;
  let stdinTail = Promise.resolve();
  const assertWritable = () => {
    if (control.finished || control.detached || control.terminating) {
      throw new RailwayError("Exec stdin is no longer writable.");
    }
  };
  const enqueueStdin = (
    send: (connection: ExecWsConnection) => void | Promise<void>,
  ) => {
    stdinTail = stdinTail.then(async () => {
      const connection = await ready;
      assertWritable();
      await send(connection);
    });
    stdinTail.catch(() => {});
    return stdinTail;
  };
  const stdin: ExecStdin = {
    async write(data) {
      if (stdinEnded) {
        throw new RailwayError(
          "Exec stdin is closed; pass stdin: true to enable writes.",
        );
      }
      assertWritable();
      return enqueueStdin(connection => connection.writeStdin(
        typeof data === "string" ? new TextEncoder().encode(data) : data,
        control.stdinController.signal,
      ));
    },
    async end() {
      // Ending stdin of a command that already exited (e.g. `head -1`) is a no-op.
      if (control.finished) return;
      if (stdinEnded) return stdinTail;
      stdinEnded = true;
      return enqueueStdin(connection => connection.closeStdin());
    },
  };

  const result = runExec(
    context,
    target,
    options,
    resolveSessionName,
    rejectSessionName,
    control,
    resolveConnection,
  ).then(
    value => {
      control.finished = true;
      return value;
    },
    error => {
      control.finished = true;
      rejectConnection(error);
      rejectSessionName(error);
      throw error;
    },
  );

  return constructHandle({ sessionName, result, kill, detach, stdin });
}

async function runExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
  onSessionName: (name: string) => void,
  onNoSessionName: (reason: unknown) => void,
  control: ExecControl,
  onConnection: (connection: ExecWsConnection) => void,
): Promise<ExecResult> {
  options.signal?.throwIfAborted();
  const init = execParameters(target, options);

  // Never fabricate a durable id when the server did not assign one.
  let sessionNameResolved = options.ephemeral === true;
  const resolveSessionNameOnce = (name: string) => {
    if (sessionNameResolved) return;
    sessionNameResolved = true;
    onSessionName(name);
  };

  const input: RailwayGenerateShellTokenMutationVariables["input"] = {
    environmentId: context.environmentId,
    instanceId: context.sandboxId,
    kind: "sandbox",
    scope: "shell",
  };
  const mintShellToken = async () => {
    let tokenData: RailwayGenerateShellTokenMutation;
    try {
      tokenData = await requestGraphQL<
        RailwayGenerateShellTokenMutation,
        RailwayGenerateShellTokenMutationVariables
      >(context.config, RailwayGenerateShellTokenDocument, { input }, options.signal);
    } catch (error) {
      // A custom fetch may reject an aborted request with its own AbortError;
      // callers are promised the signal's reason.
      options.signal?.throwIfAborted();
      throw error;
    }
    options.signal?.throwIfAborted();
    return tokenData.generateShellToken;
  };
  const jwt = await mintShellToken();

  // Unbounded unless the caller asks for a cap, as in 3.12. Long-running or
  // streamed commands should pass `captureOutput: false` instead.
  const maxBytes = options.maxOutputBytes ?? Number.POSITIVE_INFINITY;
  const stdout = new OutputCapture(options.captureOutput !== false, maxBytes);
  const stderr = new OutputCapture(options.captureOutput !== false, maxBytes);
  let exitCode: number | null = null;
  let timedOut = false;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let escalation: ReturnType<typeof setTimeout> | undefined;
  let terminationDeadline: ReturnType<typeof setTimeout> | undefined;
  let failure: { reason: unknown } | undefined;
  let callbackFailed = false;
  const stdoutDecoder = decoder();
  const stderrDecoder = decoder();

  let resolveResult!: (value: ExecResult) => void;
  let rejectResult!: (reason: unknown) => void;
  const done = new Promise<ExecResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  done.catch(() => {});

  const settle = (outcome?: { error: unknown }) => {
    if (settled) return;
    settled = true;
    control.finished = true;
    control.stdinController.abort(
      new RailwayError("Exec stdin connection is closed."),
    );
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
    if (escalation) clearTimeout(escalation);
    if (terminationDeadline) clearTimeout(terminationDeadline);
    options.signal?.removeEventListener("abort", onAbort);
    try {
      control.connection?.close();
    } catch {
      // ignore
    }
    if (outcome) rejectResult(outcome.error);
    else if (failure) rejectResult(failure.reason);
    else resolveResult({
      exitCode,
      stdout: stdout.finish(),
      stderr: stderr.finish(),
      truncated: stdout.truncated || stderr.truncated,
      timedOut,
    });
  };

  const signalRemote = (signal: ExecSignal) => {
    if (!control.connection) {
      control.pendingSignal = signal;
      return;
    }
    try {
      control.connection.signal(signal);
    } catch (error) {
      settle({ error });
    }
  };

  const terminate = (reason?: { reason: unknown }) => {
    if (settled || control.detached) return;
    failure ??= reason;
    if (control.terminating || exitCode !== null) return;
    control.terminating = true;
    if (timer) clearTimeout(timer);
    control.stdinController.abort(
      new RailwayError("Exec stdin is no longer writable."),
    );
    // Keep the socket open: closing it merely detaches a durable process.
    context.config.log(`exec: sending TERM in sandbox=${context.sandboxId}`);
    signalRemote("TERM");
    if (settled) return;
    escalation = setTimeout(() => {
      context.config.log(`exec: no exit ${KILL_GRACE_MS}ms after TERM; sending KILL in sandbox=${context.sandboxId}`);
      signalRemote("KILL");
    }, KILL_GRACE_MS);
    terminationDeadline = setTimeout(() => {
      // A timeout resolves as it did in 3.12 (`timedOut: true`, `exitCode: null`
      // = unknown); only an abort or a callback failure rejects.
      if (timedOut && !failure) {
        settle();
        return;
      }
      settle({
        error: new RailwayConnectionError({
          message: `Exec termination was not confirmed within ${TERMINATION_CONFIRM_MS}ms; the command's outcome is unknown.`,
          cause: failure?.reason,
        }),
      });
    }, TERMINATION_CONFIRM_MS);
  };
  const onAbort = () => terminate({ reason: options.signal?.reason });

  const emit = (callback: ExecOptions["onStdout"], chunk: string) => {
    if (!chunk || callbackFailed) return;
    try {
      callback?.(chunk);
    } catch (error) {
      // As in 3.12: reject right away. Settling closes the socket, which ends an
      // ephemeral exec and leaves a durable one running (reattachable).
      callbackFailed = true;
      settle({ error });
    }
  };

  const handlers: Parameters<typeof connectExecWs>[0]["handlers"] = {
      onError: error => settle({
        error: new ExecInterruptedError({
          reason: error.message,
          stdout: stdout.finish(),
          stderr: stderr.finish(),
          cause: failure?.reason ?? error,
        }),
      }),
      onStdinError: error => terminate({ reason: error }),
      onDurableSession: name => resolveSessionNameOnce(name),
      onStdout: bytes => {
        if (settled) return;
        stdout.append(bytes);
        emit(options.onStdout, stdoutDecoder.decode(bytes, { stream: true }));
      },
      onStderr: bytes => {
        if (settled) return;
        stderr.append(bytes);
        emit(options.onStderr, stderrDecoder.decode(bytes, { stream: true }));
      },
      onExit: code => {
        if (settled) return;
        exitCode = code;
        emit(options.onStdout, stdoutDecoder.decode());
        emit(options.onStderr, stderrDecoder.decode());
        settle();
      },
      onClose: info => {
        if (control.detached) {
          settle();
          return;
        }
        settle({
          error: new ExecInterruptedError({
            closeCode: info.code,
            reason: info.reason,
            stdout: stdout.finish(),
            stderr: stderr.finish(),
            cause: failure?.reason,
          }),
        });
      },
  };
  // A connection that fails before the command is sent left nothing running, so
  // one reconnect on a fresh token is safe. Only transient failures (a dropped
  // socket, a deploy) are retried; denials, routing failures, the readiness
  // timeout, an old proxy, and aborts are not. One attempt, unlike the files
  // client's three, because each one mints a token and may wait out routing.
  const connectWithRetry = async () => {
    try {
      return await connectExecWs({ config: context.config, jwt, ...init, handlers });
    } catch (error) {
      if (!shouldRetryBeforeStart(error)) throw error;
      options.signal?.throwIfAborted();
      context.config.log(
        `exec: ${(error as Error).message} Retrying once in sandbox=${context.sandboxId}`,
      );
      await abortableDelay(CONNECT_RETRY_DELAY_MS, options.signal);
      return connectExecWs({
        config: context.config,
        jwt: await mintShellToken(),
        ...init,
        handlers,
      });
    }
  };

  let connection: ExecWsConnection;
  try {
    connection = await connectWithRetry();
  } catch (error) {
    if (!(error instanceof ExecControlUnsupportedError)) throw error;
    // The proxy predates exec control and refused the bare hello, so nothing ran.
    // Writable stdin and ephemeral execs depend on it; a plain exec does not.
    const required = [options.stdin && "stdin", options.ephemeral && "ephemeral"].filter(Boolean);
    if (required.length > 0) {
      throw new ExecControlUnsupportedError({
        message: `This tcp-proxy does not support exec control, which ${required.join(" and ")} require${required.length > 1 ? "" : "s"}. No command was sent.`,
        ...(error.closeCode !== undefined ? { closeCode: error.closeCode } : {}),
        cause: error,
      });
    }
    context.config.log(
      `exec: tcp-proxy predates exec control; reconnecting in legacy mode in sandbox=${context.sandboxId}`,
    );
    // One legacy attempt; no further retry stacks on the fallback.
    connection = await connectExecWs({
      config: context.config,
      jwt: await mintShellToken(),
      ...init,
      legacy: true,
      handlers,
    });
  }
  control.connection = connection;
  onConnection(connection);

  // Handlers can settle before the connect continuation runs.
  if (settled || control.detached) {
    connection.close();
    return done;
  }
  if (control.pendingSignal) signalRemote(control.pendingSignal);
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) onAbort();

  try {
    if (!options.stdin) connection.closeStdin();
  } catch (error) {
    settle({ error });
  }

  if (!settled && !control.terminating && options.timeoutSec !== undefined) {
    timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, options.timeoutSec * 1000);
  }

  return done;
}

/** Only fresh execs apply process settings; reattach uses the existing process. */
function execParameters(target: ExecTarget, options: ExecOptions) {
  return {
    ...(options.signal ? { signal: options.signal } : {}),
    ...(typeof target === "string"
      ? {
          command: loginShellCommand(target),
          ...(options.ephemeral ? { ephemeral: true } : {}),
          ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
          ...(options.env ? { env: options.env } : {}),
        }
      : {
          command: REATTACH_PLACEHOLDER_COMMAND,
          sessionName: target.sessionName,
          resumeFromLastRead: options.resumeFromLastRead ?? false,
        }),
  };
}

/** Retains a UTF-8 prefix without splitting the final character at the byte cap. */
class OutputCapture {
  truncated = false;
  private text = "";
  private bytes = 0;
  private readonly decoder = new TextDecoder();
  private finished = false;

  constructor(
    private readonly enabled: boolean,
    private readonly maxBytes: number,
  ) {}

  append(bytes: Uint8Array): void {
    if (!this.enabled) return;
    const available = Math.min(bytes.length, this.maxBytes - this.bytes);
    this.text += this.decoder.decode(bytes.subarray(0, available), { stream: true });
    this.bytes += available;
    if (available < bytes.length) this.truncated = true;
  }

  finish(): string {
    if (!this.finished) {
      const tail = this.decoder.decode();
      if (!this.truncated) this.text += tail;
      this.finished = true;
    }
    return this.text;
  }
}


function abortableDelay(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
