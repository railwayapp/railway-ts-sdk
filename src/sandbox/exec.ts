import type { NormalizedRailwayClientConfig } from "../core/config.js";
import { RailwayConnectionError, RailwayGraphQLError } from "../core/errors.js";
import { requestGraphQL } from "../core/graphql-client.js";
import {
  executeGraphQLSubscription,
  isRetryableSubscriptionError,
  STOP_SUBSCRIPTION,
} from "../core/graphql-ws-client.js";
import {
  RailwaySandboxExecDocument,
  RailwaySandboxExecKillDocument,
  RailwaySandboxExecOutputDocument,
  type RailwaySandboxExecKillMutation,
  type RailwaySandboxExecKillMutationVariables,
  type RailwaySandboxExecMutation,
  type RailwaySandboxExecMutationVariables,
  type RailwaySandboxExecOutputSubscription,
  type RailwaySandboxExecOutputSubscriptionVariables,
} from "../generated/graphql.js";
import { SandboxExecInterruptedError } from "./errors.js";
import type { ExecOptions, ExecResult, ExecTarget } from "./types.js";

/**
 * The server caps each inline stream of a fast-returning COMPLETED exec at
 * 16KB without setting `truncated`; flag it client-side when a stream hits
 * the cap so callers know the inline output may be incomplete.
 */
const MAX_INLINE_OUTPUT_LENGTH = 16_000;
/** Server-injected stderr marker for bytes dropped from the retained buffer. */
const GAP_MARKER_PATTERN = /\[output truncated: \d+ bytes dropped\]/;
const SIGKILL = 9;
/** After a timeout SIGTERM, escalate to SIGKILL if the command has not exited. */
const KILL_GRACE_MS = 10_000;
const RETRY_INITIAL_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 4_000;
/** Consecutive failed attempts with no frames received before the stream gives up. */
const MAX_CONSECUTIVE_FAILURES = 5;
/** Pause before re-subscribing when an attempt completed without yielding frames. */
const EMPTY_RESUBSCRIBE_DELAY_MS = 250;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/** Module-internal access to ExecHandle's private constructor. */
let constructHandle: (args: {
  execId: Promise<string>;
  result: Promise<ExecResult>;
  kill: (signal?: number) => Promise<boolean>;
}) => ExecHandle;

/**
 * An in-flight exec. Awaiting it (or any Promise method) yields the final
 * `ExecResult`; `execId` and `kill()` manage the command while it runs.
 */
export class ExecHandle implements Promise<ExecResult> {
  /** Server-assigned id for this exec; use it to reattach via `exec({ execId })`. */
  readonly execId: Promise<string>;
  readonly [Symbol.toStringTag] = "ExecHandle";
  readonly #result: Promise<ExecResult>;
  readonly #kill: (signal?: number) => Promise<boolean>;

  /** Constructed by `Sandbox.exec`; not constructible from outside the SDK. */
  private constructor(args: {
    execId: Promise<string>;
    result: Promise<ExecResult>;
    kill: (signal?: number) => Promise<boolean>;
  }) {
    this.execId = args.execId;
    this.#result = args.result;
    this.#kill = args.kill;
    // Side taps: a handle held only for kill()/callbacks must not surface
    // unhandled rejections. Awaiting the handle still rejects normally.
    this.execId.catch(() => {});
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
   * Signal the running command (server defaults to SIGTERM). Resolves with
   * whether the signal was delivered; the handle itself still settles when
   * the command exits.
   */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  kill(signal?: number): Promise<boolean> {
    return this.#kill(signal);
  }

  static {
    constructHandle = args => new ExecHandle(args);
  }
}

interface ExecContext {
  config: NormalizedRailwayClientConfig;
  environmentId: string;
  sandboxId: string;
}

export function startExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
): ExecHandle {
  const startedAt = Date.now();

  let resolveExecId!: (value: string) => void;
  let rejectExecId!: (reason?: unknown) => void;
  const execId = new Promise<string>((resolve, reject) => {
    resolveExecId = resolve;
    rejectExecId = reject;
  });

  const result = runExec(context, target, options, startedAt, resolveExecId).catch(
    error => {
      // Settle execId for callers blocked on kill(); no-op once resolved.
      rejectExecId(error);
      throw error;
    },
  );

  return constructHandle({
    execId,
    result,
    kill: async signal =>
      killExec({ ...context, execId: await execId, signal }),
  });
}

async function killExec(args: {
  config: NormalizedRailwayClientConfig;
  environmentId: string;
  sandboxId: string;
  execId: string;
  signal?: number | undefined;
}): Promise<boolean> {
  const variables: RailwaySandboxExecKillMutationVariables = {
    id: args.sandboxId,
    environmentId: args.environmentId,
    execId: args.execId,
  };
  if (args.signal !== undefined) variables.signal = args.signal;

  const data = await requestGraphQL<
    RailwaySandboxExecKillMutation,
    RailwaySandboxExecKillMutationVariables
  >(args.config, RailwaySandboxExecKillDocument, variables);

  return data.sandboxExecKill;
}

async function runExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
  startedAt: number,
  onExecId: (id: string) => void,
): Promise<ExecResult> {
  let execId: string;

  if (typeof target === "string") {
    const variables: RailwaySandboxExecMutationVariables = {
      id: context.sandboxId,
      environmentId: context.environmentId,
      command: target,
    };
    if (options.timeoutSec !== undefined) variables.timeoutSec = options.timeoutSec;

    const data = await requestGraphQL<
      RailwaySandboxExecMutation,
      RailwaySandboxExecMutationVariables
    >(context.config, RailwaySandboxExecDocument, variables);
    const exec = data.sandboxExec;
    onExecId(exec.execId);

    if (exec.state === "INTERRUPTED") {
      throw new SandboxExecInterruptedError({
        execId: exec.execId,
        sandboxId: context.sandboxId,
      });
    }

    if (exec.state === "COMPLETED") {
      if (exec.stdout) options.onStdout?.(exec.stdout);
      if (exec.stderr) options.onStderr?.(exec.stderr);
      return {
        exitCode: exec.exitCode ?? null,
        stdout: exec.stdout,
        stderr: exec.stderr,
        truncated:
          exec.truncated ||
          exec.stdout.length >= MAX_INLINE_OUTPUT_LENGTH ||
          exec.stderr.length >= MAX_INLINE_OUTPUT_LENGTH,
        timedOut: exec.timedOut,
      };
    }

    execId = exec.execId;
  } else {
    execId = target.execId;
    onExecId(execId);
  }

  // Still running (or reattaching): stream from the beginning of the retained
  // buffer for a complete result, ignoring the mutation's preview output.
  return streamExec(context, execId, options, startedAt);
}

async function streamExec(
  context: ExecContext,
  execId: string,
  options: ExecOptions,
  startedAt: number,
): Promise<ExecResult> {
  let cursor = "0";
  let stdout = "";
  let stderr = "";
  let truncated = false;
  let timedOut = false;

  let sawTerminal = false;
  let exitCode: number | null = null;
  let callbackError: { error: unknown } | undefined;
  let attemptDelivered = false;
  let consecutiveFailures = 0;

  const handleFrames = (data: RailwaySandboxExecOutputSubscription) => {
    // A message can still arrive between an early stop and the subscription
    // teardown; never mutate state or re-fire callbacks after stopping.
    if (sawTerminal || callbackError) return STOP_SUBSCRIPTION;
    for (const frame of data.sandboxExecOutput) {
      attemptDelivered = true;
      if (frame.exitCode != null) {
        // Terminal frame: carries no data and an empty seq — never advance
        // the cursor from it.
        sawTerminal = true;
        exitCode = frame.exitCode;
        return STOP_SUBSCRIPTION;
      }
      if (frame.data == null) continue;
      consecutiveFailures = 0;
      cursor = frame.seq;
      try {
        if (frame.isStderr) {
          if (GAP_MARKER_PATTERN.test(frame.data)) truncated = true;
          stderr += frame.data;
          options.onStderr?.(frame.data);
        } else {
          stdout += frame.data;
          options.onStdout?.(frame.data);
        }
      } catch (error) {
        callbackError = { error };
        return STOP_SUBSCRIPTION;
      }
    }
    return undefined;
  };

  const timers: ReturnType<typeof setTimeout>[] = [];
  if (options.timeoutSec !== undefined) {
    // The server no longer enforces timeoutSec; preserve the old observable
    // semantics client-side: kill at the deadline, then resolve with
    // `timedOut: true` once the terminal frame arrives. Kill failures are
    // swallowed — the stream stays the source of truth and the promise
    // settles when the command exits or the stream fails.
    const fireInMs = Math.max(startedAt + options.timeoutSec * 1000 - Date.now(), 0);
    timers.push(
      setTimeout(() => {
        timedOut = true;
        void killExec({ ...context, execId }).catch(() => {});
        timers.push(
          setTimeout(() => {
            void killExec({ ...context, execId, signal: SIGKILL }).catch(() => {});
          }, KILL_GRACE_MS),
        );
      }, fireInMs),
    );
  }

  try {
    for (;;) {
      attemptDelivered = false;
      try {
        await executeGraphQLSubscription<
          RailwaySandboxExecOutputSubscription,
          RailwaySandboxExecOutputSubscriptionVariables
        >(
          context.config,
          RailwaySandboxExecOutputDocument,
          {
            id: context.sandboxId,
            environmentId: context.environmentId,
            execId,
            cursor,
          },
          handleFrames,
        );
      } catch (error) {
        if (isInterruptedSubscriptionError(error)) {
          throw new SandboxExecInterruptedError({
            execId,
            sandboxId: context.sandboxId,
          });
        }
        if (!isRetryableSubscriptionError(error)) throw error;
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          // backboard masks resolver throws as a bare 4500 close, and the
          // only resolver error on this subscription is the lost exec. A
          // 4500 persisting across the whole retry budget with no frames
          // means the exec is gone (VM restart, unknown execId) — surface it
          // as interrupted rather than a transport failure. Transient server
          // hiccups recover within the retries and never reach this.
          if (
            error instanceof RailwayConnectionError &&
            error.closeCode === 4500
          ) {
            throw new SandboxExecInterruptedError({
              execId,
              sandboxId: context.sandboxId,
            });
          }
          throw error;
        }
        await sleep(
          Math.min(
            RETRY_INITIAL_DELAY_MS * 2 ** (consecutiveFailures - 1),
            RETRY_MAX_DELAY_MS,
          ),
        );
        continue;
      }

      if (callbackError) throw callbackError.error;
      if (sawTerminal) {
        return { exitCode, stdout, stderr, truncated, timedOut };
      }
      // The server caps one subscription at ~15 minutes and completes without
      // a terminal frame; re-attach from the last cursor. Pause briefly when
      // the attempt yielded nothing so a misbehaving server cannot hot-loop us.
      if (!attemptDelivered) await sleep(EMPTY_RESUBSCRIBE_DELAY_MS);
    }
  } finally {
    for (const timer of timers) clearTimeout(timer);
  }
}

/**
 * The lost-exec error reaches the client either as a GraphQL error over the
 * subscription or — because backboard's WS layer closes the socket on
 * resolver throws — as a 4500 close whose reason carries the server message
 * ("...was interrupted..."). Match the message in both shapes, with extension
 * fields as a fallback in case it is ever masked or reworded.
 */
function isInterruptedSubscriptionError(error: unknown): boolean {
  if (error instanceof RailwayGraphQLError) {
    return error.errors.some(
      item =>
        /interrupt/i.test(item.message) ||
        item.extensions?.code === "SANDBOX_EXEC_INTERRUPTED" ||
        item.extensions?.status === 410,
    );
  }
  if (error instanceof RailwayConnectionError) {
    return /interrupt/i.test(error.message);
  }
  return false;
}
