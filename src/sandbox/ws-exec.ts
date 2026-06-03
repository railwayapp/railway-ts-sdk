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
import { createExecHandle, type ExecContext, type ExecHandle } from "./exec.js";
import type { ExecOptions, ExecResult, ExecTarget } from "./types.js";

const decoder = () => new TextDecoder();

/**
 * Reattach carries a durable session id, not a command, but the `/ws/exec`
 * bridge requires a non-empty command. The VM ignores it when the id resolves
 * to a live session; this no-op is what runs only if the id has already expired
 * (a fresh session the caller can't tell apart — see the reattach caveat).
 */
const REATTACH_PLACEHOLDER_COMMAND = ":";

interface ExecControl {
  connection?: ExecWsConnection;
  killed: boolean;
}

/**
 * Runs an exec over the tcp-proxy `/ws/exec` bridge: a non-PTY session with
 * separated stdout/stderr and a real exit code. A `shell`-scoped JWT (minted by
 * `generateShellToken`) authorizes the path.
 *
 * When durable sessions are enabled server-side, the VM-assigned id is surfaced
 * as `execId` and `exec({ execId }, { transport: "ws" })` reattaches to it
 * (replaying the retained output tail, then following live). `kill()`/
 * `timeoutSec` close the socket — with durable on that only detaches (the
 * process keeps running, reattachable); with it off the session is torn down.
 */
export function startWsExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
): ExecHandle {
  let resolveExecId!: (value: string) => void;
  let rejectExecId!: (reason?: unknown) => void;
  const execId = new Promise<string>((resolve, reject) => {
    resolveExecId = resolve;
    rejectExecId = reject;
  });

  const control: ExecControl = { killed: false };

  const kill = async (): Promise<boolean> => {
    control.killed = true;
    if (!control.connection) return false;
    control.connection.close();
    return true;
  };

  const result = runWsExec(context, target, options, resolveExecId, control).catch(
    error => {
      rejectExecId(error);
      throw error;
    },
  );

  return createExecHandle({ execId, result, kill });
}

async function runWsExec(
  context: ExecContext,
  target: ExecTarget,
  options: ExecOptions,
  onExecId: (id: string) => void,
  control: ExecControl,
): Promise<ExecResult> {
  const reattach = typeof target !== "string";
  const command = reattach ? REATTACH_PLACEHOLDER_COMMAND : target;
  const durableSessionId = reattach ? target.execId : undefined;

  // Resolve execId once: to the resume id immediately on reattach, otherwise to
  // the VM-assigned durable id when it arrives, falling back to a client id if
  // durable sessions are off (no assigned id is ever sent).
  let execIdResolved = false;
  const resolveExecIdOnce = (id: string) => {
    if (execIdResolved) return;
    execIdResolved = true;
    onExecId(id);
  };
  if (reattach) resolveExecIdOnce(durableSessionId!);
  const fallbackExecId = globalThis.crypto.randomUUID();

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
    resolveExecIdOnce(fallbackExecId);
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
    ...(durableSessionId ? { durableSessionId } : {}),
    handlers: {
      onDurableSession: id => resolveExecIdOnce(id),
      onStdout: bytes => {
        if (settled) return;
        resolveExecIdOnce(fallbackExecId);
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
        resolveExecIdOnce(fallbackExecId);
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

  // A kill() that landed during token mint / connect has no socket to signal;
  // honor it now that one exists.
  if (control.killed) {
    connection.close();
    return done;
  }

  // The SDK provides no stdin; EOF it so commands reading stdin can finish.
  connection.closeStdin();

  if (options.timeoutSec !== undefined) {
    timer = setTimeout(() => {
      timedOut = true;
      connection.close();
    }, options.timeoutSec * 1000);
  }

  return done;
}
