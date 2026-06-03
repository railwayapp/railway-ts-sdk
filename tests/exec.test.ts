import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveWebSocketUrl } from "../src/core/graphql-ws-client.js";
import {
  ExecHandle,
  RailwayConnectionError,
  RailwayGraphQLError,
  Sandbox,
  SandboxExecInterruptedError,
} from "../src/index.js";
import {
  clearRailwayEnv,
  createFetchMock,
  sandboxInfo,
  type FetchCall,
} from "./test-helpers.js";
import { createWsMock, type WsServerAction } from "./ws-mock.js";

const auth = { token: "token_123", environmentId: "environment_123" };

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function execResponse(
  overrides: Record<string, unknown> = {},
): { data: { sandboxExec: Record<string, unknown> } } {
  return {
    data: {
      sandboxExec: {
        execId: "exec_123",
        state: "COMPLETED",
        exitCode: 0,
        stdout: "",
        stderr: "",
        cursor: "0",
        truncated: false,
        timedOut: false,
        ...overrides,
      },
    },
  };
}

const frame = (data: string, seq: string, isStderr = false) => ({
  data,
  isStderr,
  seq,
  exitCode: null,
});
// The server's terminal frame carries no data and an empty seq.
const terminal = (exitCode: number) => ({
  data: null,
  isStderr: false,
  seq: "",
  exitCode,
});
const output = (...frames: unknown[]) => ({
  data: { sandboxExecOutput: frames },
});

async function createSandbox(args: {
  responses?: unknown[];
  script?: WsServerAction[][];
} = {}) {
  const ws = createWsMock(args.script ?? []);
  const mock = createFetchMock([
    { data: { sandboxCreate: sandboxInfo() } },
    ...(args.responses ?? []),
  ]);
  const sandbox = await Sandbox.create({
    ...auth,
    fetch: mock.fetch,
    webSocketImpl: ws.webSocketImpl,
  });
  return { sandbox, ws, mock };
}

function silence<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {});
  return promise;
}

function expectInterrupted(error: unknown, ids?: { execId: string; sandboxId: string }): void {
  expect(error).toBeInstanceOf(SandboxExecInterruptedError);
  if (ids) expect(error).toMatchObject(ids);
}

describe("exec fast path (COMPLETED)", () => {
  it("resolves from the mutation without opening a WebSocket", async () => {
    const { sandbox, ws, mock } = await createSandbox({
      responses: [
        execResponse({ stdout: "hello\n", stderr: "oops\n", exitCode: 0 }),
      ],
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const handle = sandbox.exec("echo hello", {
      timeoutSec: 30,
      onStdout: chunk => stdoutChunks.push(chunk),
      onStderr: chunk => stderrChunks.push(chunk),
    });
    expect(handle).toBeInstanceOf(ExecHandle);
    const result = await handle;

    expect(result).toEqual({
      exitCode: 0,
      stdout: "hello\n",
      stderr: "oops\n",
      truncated: false,
      timedOut: false,
    });
    expect(stdoutChunks).toEqual(["hello\n"]);
    expect(stderrChunks).toEqual(["oops\n"]);
    expect(ws.sockets).toHaveLength(0);
    expect(await handle.execId).toBe("exec_123");
    expect(mock.calls[1]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
      command: "echo hello",
      timeoutSec: 30,
    });
  });

  it("does not leak streaming fields into ExecResult", async () => {
    const { sandbox } = await createSandbox({ responses: [execResponse()] });

    const result = await sandbox.exec("true");

    expect(Object.keys(result).sort()).toEqual([
      "exitCode",
      "stderr",
      "stdout",
      "timedOut",
      "truncated",
    ]);
  });

  it.each(["stdout", "stderr"] as const)(
    "flags the server's silent 16KB inline cap on %s as truncated",
    async stream => {
      const { sandbox } = await createSandbox({
        responses: [execResponse({ [stream]: "x".repeat(16_000) })],
      });

      const result = await sandbox.exec("yes x | head -c 100000");

      expect(result.truncated).toBe(true);
    },
  );

  it("rejects with SandboxExecInterruptedError on INTERRUPTED state", async () => {
    const { sandbox } = await createSandbox({
      responses: [execResponse({ state: "INTERRUPTED", exitCode: null })],
    });

    const error = await sandbox.exec("true").catch(error => error);

    expectInterrupted(error, { execId: "exec_123", sandboxId: "sandbox_123" });
  });

  it("rejects execId when the mutation fails", async () => {
    const { sandbox } = await createSandbox({
      responses: [{ errors: [{ message: "boom" }] }],
    });

    const handle = sandbox.exec("true");

    await expect(handle.execId).rejects.toBeInstanceOf(RailwayGraphQLError);
    await expect(handle.result()).rejects.toBeInstanceOf(RailwayGraphQLError);
  });
});

describe("exec streaming (RUNNING)", () => {
  it("streams from cursor 0, ignores the preview, and resolves on the terminal frame", async () => {
    const { sandbox, ws } = await createSandbox({
      responses: [
        execResponse({
          state: "RUNNING",
          exitCode: null,
          stdout: "preview-not-authoritative",
          cursor: "42",
        }),
      ],
      script: [
        [
          { next: output(frame("line-1\n", "7"), frame("line-2\n", "14")) },
          { next: output(frame("warn\n", "19", true)) },
          { next: output(terminal(0)) },
        ],
      ],
    });
    const stdoutChunks: string[] = [];

    const result = await sandbox.exec("long", {
      onStdout: chunk => stdoutChunks.push(chunk),
    });

    expect(result).toEqual({
      exitCode: 0,
      stdout: "line-1\nline-2\n",
      stderr: "warn\n",
      truncated: false,
      timedOut: false,
    });
    expect(stdoutChunks).toEqual(["line-1\n", "line-2\n"]);
    expect(ws.calls).toHaveLength(1);
    expect(ws.calls[0]?.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
      execId: "exec_123",
      cursor: "0",
    });
    expect(ws.calls[0]?.query).toContain("subscription RailwaySandboxExecOutput");
  });

  it("sends the bearer token in connectionParams", async () => {
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [[{ next: output(terminal(0)) }]],
    });

    await sandbox.exec("long");

    expect(ws.initPayloads).toEqual([{ Authorization: "Bearer token_123" }]);
  });

  it("handles data and terminal frames batched in a single message", async () => {
    const { sandbox } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [
        [{ next: output(frame("a\n", "2"), frame("b\n", "4"), terminal(0)) }],
      ],
    });

    const result = await sandbox.exec("long");

    expect(result.stdout).toBe("a\nb\n");
    expect(result.exitCode).toBe(0);
  });

  it("re-subscribes from the last seq when the server completes without a terminal frame", async () => {
    const hugeSeq = "18446744073709551615";
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [
        [{ next: output(frame("first\n", hugeSeq)) }, { complete: true }],
        [{ next: output(frame("second\n", "18446744073709551699")) }, { next: output(terminal(5)) }],
      ],
    });

    const result = await sandbox.exec("long");

    expect(result.stdout).toBe("first\nsecond\n");
    expect(result.exitCode).toBe(5);
    expect(ws.calls).toHaveLength(2);
    expect(ws.calls[0]?.variables.cursor).toBe("0");
    expect(ws.calls[1]?.variables.cursor).toBe(hugeSeq);
  });

  // 4500 is also backboard's masked-resolver-error close; a single one must
  // be treated as transient, like any abnormal closure.
  it.each([1006, 4500])(
    "resumes after a transport drop (close %i) without losing the cursor",
    async code => {
      const { sandbox, ws } = await createSandbox({
        responses: [execResponse({ state: "RUNNING", exitCode: null })],
        script: [
          [{ next: output(frame("a\n", "2")) }, { close: { code } }],
          [{ next: output(terminal(0)) }],
        ],
      });

      const result = await sandbox.exec("long");

      expect(result.stdout).toBe("a\n");
      expect(ws.calls).toHaveLength(2);
      expect(ws.calls[1]?.variables.cursor).toBe("2");
    },
  );

  it("gives up after repeated transient failures with no progress", async () => {
    vi.useFakeTimers();
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [
        [{ close: { code: 1006 } }],
        [{ close: { code: 1006 } }],
        [{ close: { code: 1006 } }],
        [{ close: { code: 1006 } }],
        [{ close: { code: 1006 } }],
      ],
    });

    const promise = silence(sandbox.exec("long").result());
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(promise).rejects.toBeInstanceOf(RailwayConnectionError);
    expect(ws.calls).toHaveLength(5);
  });

  it("rejects immediately on a fatal close code", async () => {
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [[{ close: { code: 4401, reason: "Unauthorized" } }]],
    });

    const error = await sandbox.exec("long").catch(error => error);

    expect(error).toBeInstanceOf(RailwayConnectionError);
    expect(error).toMatchObject({ closeCode: 4401 });
    expect(ws.calls).toHaveLength(1);
  });

  it("maps the lost-exec subscription error to SandboxExecInterruptedError", async () => {
    const { sandbox } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [
        [
          {
            error: [
              {
                message:
                  'Sandbox exec "exec_123" was interrupted (sandbox "sandbox_123" restarted); output is no longer recoverable.',
              },
            ],
          },
        ],
      ],
    });

    const error = await sandbox.exec("long").catch(error => error);

    expectInterrupted(error, { execId: "exec_123", sandboxId: "sandbox_123" });
  });

  it("maps an interrupted close reason to SandboxExecInterruptedError without retrying", async () => {
    // backboard's WS layer surfaces resolver throws as a 4500 close whose
    // reason carries the server message (observed live against localdev).
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [
        [
          {
            close: {
              code: 4500,
              reason:
                'Sandbox exec "exec_123" was interrupted (sandbox "sandbox_123" restarted); output is no',
            },
          },
        ],
      ],
    });

    const error = await sandbox.exec("long").catch(error => error);

    expectInterrupted(error);
    expect(ws.calls).toHaveLength(1);
  });

  it("maps a persistent masked 4500 close to SandboxExecInterruptedError", async () => {
    // In prod the close reason is masked to "Internal server error"; the
    // lost exec is recognized by 4500 persisting across the retry budget.
    vi.useFakeTimers();
    const close = [{ close: { code: 4500, reason: "Internal server error" } }] as const;
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [[...close], [...close], [...close], [...close], [...close]],
    });

    const promise = silence(sandbox.exec("long").result());
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(promise).rejects.toBeInstanceOf(SandboxExecInterruptedError);
    expect(ws.calls).toHaveLength(5);
  });

  it("marks gap frames as truncated and passes the marker through to stderr", async () => {
    const marker = "\n[output truncated: 4096 bytes dropped]\n";
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [
        [{ next: output(frame(marker, "5000", true)) }, { complete: true }],
        [{ next: output(terminal(0)) }],
      ],
    });

    const result = await sandbox.exec("long");

    expect(result.truncated).toBe(true);
    expect(result.stderr).toBe(marker);
    // Gap frames advance the cursor like any data frame.
    expect(ws.calls[1]?.variables.cursor).toBe("5000");
  });

  it("rejects with the callback's error when onStdout throws", async () => {
    const { sandbox, ws } = await createSandbox({
      responses: [execResponse({ state: "RUNNING", exitCode: null })],
      script: [[{ next: output(frame("a\n", "2")) }]],
    });

    const error = await sandbox
      .exec("long", {
        onStdout: () => {
          throw new Error("callback boom");
        },
      })
      .catch(error => error);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("callback boom");
    expect(ws.calls).toHaveLength(1);
  });
});

describe("exec fast path callbacks", () => {
  it("rejects the result but resolves execId when a callback throws on the fast path", async () => {
    const { sandbox } = await createSandbox({
      responses: [execResponse({ stdout: "hi\n" })],
    });

    const handle = sandbox.exec("echo hi", {
      onStdout: () => {
        throw new Error("fast boom");
      },
    });

    await expect(handle.result()).rejects.toThrow("fast boom");
    await expect(handle.execId).resolves.toBe("exec_123");
  });
});

describe("exec reattach", () => {
  it("opens the subscription without a mutation and backfills from cursor 0", async () => {
    const { sandbox, ws, mock } = await createSandbox({
      script: [
        [
          { next: output(frame("history\n", "8"), frame("live\n", "13")) },
          { next: output(terminal(0)) },
        ],
      ],
    });

    const handle = sandbox.exec({ execId: "exec_attached" });
    const result = await handle;

    expect(await handle.execId).toBe("exec_attached");
    expect(result.stdout).toBe("history\nlive\n");
    // Only the sandboxCreate call — no exec mutation.
    expect(mock.calls).toHaveLength(1);
    expect(ws.calls[0]?.variables).toMatchObject({
      execId: "exec_attached",
      cursor: "0",
    });
  });

  it("resolves execId even when the reattached stream is interrupted", async () => {
    const { sandbox } = await createSandbox({
      script: [
        [{ error: [{ message: 'Sandbox exec "x" was interrupted; output is no longer recoverable.' }] }],
      ],
    });

    const handle = sandbox.exec({ execId: "exec_lost" });

    await expect(handle.execId).resolves.toBe("exec_lost");
    await expect(handle.result()).rejects.toBeInstanceOf(
      SandboxExecInterruptedError,
    );
  });
});

describe("exec kill", () => {
  it("sends the kill mutation and resolves the handle on the terminal frame", async () => {
    const { sandbox, ws, mock } = await createSandbox({
      responses: [
        execResponse({ state: "RUNNING", exitCode: null }),
        { data: { sandboxExecKill: true } },
      ],
    });

    const subscribed = ws.nextSubscribe();
    const handle = sandbox.exec("sleep 600");
    await subscribed;

    await expect(handle.kill(15)).resolves.toBe(true);
    expect(mock.calls[2]?.body.query).toContain("mutation RailwaySandboxExecKill");
    expect(mock.calls[2]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
      execId: "exec_123",
      signal: 15,
    });

    ws.serverNext(output(terminal(-1)));
    const result = await handle;
    expect(result.exitCode).toBe(-1);
    expect(result.timedOut).toBe(false);
  });

  it("enforces timeoutSec client-side: SIGTERM, SIGKILL escalation, timedOut result", async () => {
    vi.useFakeTimers();
    const { sandbox, ws, mock } = await createSandbox({
      responses: [
        execResponse({ state: "RUNNING", exitCode: null }),
        { data: { sandboxExecKill: true } },
        { data: { sandboxExecKill: true } },
      ],
    });

    const subscribed = ws.nextSubscribe();
    const handle = sandbox.exec("sleep 600", { timeoutSec: 30 });
    await subscribed;

    await vi.advanceTimersByTimeAsync(30_000);
    expect(mock.calls[2]?.body.query).toContain("mutation RailwaySandboxExecKill");
    expect(mock.calls[2]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
      execId: "exec_123",
    });

    // SIGKILL escalation after the grace period.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mock.calls[3]?.body.variables).toMatchObject({ signal: 9 });

    ws.serverNext(output(terminal(-1)));
    const result = await handle;
    expect(result).toMatchObject({ exitCode: -1, timedOut: true });
  });
});

describe("WebSocket URL derivation", () => {
  it("preserves TLS when rewriting the scheme", () => {
    expect(deriveWebSocketUrl("https://backboard.railway.com/graphql/v2")).toBe(
      "wss://backboard.railway.com/graphql/v2",
    );
    expect(deriveWebSocketUrl("http://127.0.0.1:8082/graphql/internal")).toBe(
      "ws://127.0.0.1:8082/graphql/internal",
    );
  });
});
