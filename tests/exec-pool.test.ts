import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeRailwayClientConfig } from "../src/core/config.js";
import { RailwayRateLimitError } from "../src/core/errors.js";
import { ExecSocketPool } from "../src/core/exec-socket-pool.js";
import type { ExecSocket } from "../src/core/exec-ws-client.js";
import { ExecInterruptedError, Sandbox } from "../src/index.js";
import { clearRailwayEnv, createFetchMock, refusedUpgradeWebSocket, sandboxInfo } from "./test-helpers.js";
import { createExecWsMock, type MockExecSocket } from "./exec-ws-mock.js";

const auth = { token: "token_123", environmentId: "environment_123" };
/** A JWT-shaped token: the SDK reads only `iat`/`exp` from the payload. */
const jwt = (name: string, lifetimeSec = 300) => {
  const payload = Buffer.from(JSON.stringify({ iat: 1_000, exp: 1_000 + lifetimeSec, jti: name })).toString("base64url");
  return `eyJhbGciOiJFUzI1NiJ9.${payload}.${name}`;
};
const shellToken = (name: string) => ({ data: { generateShellToken: jwt(name) } });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function pooledSandbox(
  responses: unknown[],
  pool: { idleTimeoutMs?: number },
  wsOptions: Parameters<typeof createExecWsMock>[0] = { reusePeer: true },
) {
  const ws = createExecWsMock(wsOptions);
  const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }, ...responses]);
  const sandbox = await Sandbox.create({
    ...auth,
    fetch: mock.fetch,
    webSocketImpl: ws.webSocketImpl,
    execSocketPool: pool,
  });
  return { sandbox, ws, mock };
}

const inits = (socket: MockExecSocket) => socket.sentText.filter(f => f.type === "init_exec");

async function runOn(socket: MockExecSocket, initCount: number, stdout: string, code = 0) {
  await vi.waitFor(() => expect(inits(socket)).toHaveLength(initCount));
  socket.serverStdout(stdout);
  socket.serverExit(code);
}

describe("exec socket pool", () => {
  it("runs consecutive execs on one socket when the proxy grants reuse", async () => {
    const { sandbox, ws, mock } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("echo one");
    const socket = await ws.nextSocket();
    expect(socket.sentText[0]).toEqual({ type: "exec_hello", data: { reuse: true } });
    await runOn(socket, 1, "one\n");
    await expect(first).resolves.toMatchObject({ exitCode: 0, stdout: "one\n" });
    expect(socket.readyState).toBe(1);

    const second = sandbox.exec("echo two");
    await runOn(socket, 2, "two\n", 3);
    await expect(second).resolves.toMatchObject({ exitCode: 3, stdout: "two\n" });
    expect(ws.sockets).toHaveLength(1);
    expect(socket.sentText.filter(f => f.type === "exec_hello")).toHaveLength(1);
    expect(mock.calls).toHaveLength(2);
  });

  it("falls back to one socket per exec on a proxy without reuse", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {}, {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await expect(first).resolves.toMatchObject({ exitCode: 0 });
    await vi.waitFor(() => expect(a.readyState).toBe(3));

    const second = sandbox.exec("echo two");
    const b = await ws.nextSocket();
    await runOn(b, 1, "two\n");
    await expect(second).resolves.toMatchObject({ exitCode: 0, stdout: "two\n" });
    expect(ws.sockets).toHaveLength(2);
  });

  it("opens another socket for each exec that finds none idle", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const execs = [sandbox.exec("one"), sandbox.exec("two"), sandbox.exec("three")];
    await vi.waitFor(() => expect(ws.sockets).toHaveLength(3));
    for (const socket of ws.sockets) await runOn(socket, 1, "ok\n");
    await expect(Promise.all(execs)).resolves.toHaveLength(3);

    const next = sandbox.exec("four");
    await vi.waitFor(() => expect(ws.sockets.flatMap(inits)).toHaveLength(4));
    expect(ws.sockets).toHaveLength(3);
    const reused = ws.sockets.find(socket => inits(socket).length === 2)!;
    reused.serverExit(0);
    await expect(next).resolves.toMatchObject({ exitCode: 0 });
  });

  it("reuses the most recently idle socket so surplus ones age out", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const burst = [sandbox.exec("one"), sandbox.exec("two"), sandbox.exec("three")];
    await vi.waitFor(() => expect(ws.sockets).toHaveLength(3));
    for (const socket of ws.sockets) await runOn(socket, 1, "ok\n");
    await Promise.all(burst);

    const last = ws.sockets[2]!;
    for (let i = 2; i <= 4; i++) {
      const exec = sandbox.exec(`echo ${i}`);
      await runOn(last, i, "ok\n");
      await exec;
    }
    expect(ws.sockets.map(socket => inits(socket).length)).toEqual([1, 1, 4]);
  });

  it("surfaces a rate-limited upgrade on the pooled path without retrying", async () => {
    const refused = refusedUpgradeWebSocket({ status: 429, retryAfter: "15" });
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }, shellToken("a"), shellToken("b")]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch, webSocketImpl: refused.webSocketImpl, execSocketPool: {} });
    const error = (await sandbox.exec("echo hi").catch(e => e)) as RailwayRateLimitError;
    expect(error).toBeInstanceOf(RailwayRateLimitError);
    expect(error.retryAfterMs).toBe(15_000);
    expect(refused.attempts()).toBe(1);
  });

  it("drops a socket that ended an exec with an error frame", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverFrame({ type: "error", data: { code: "output_failed", message: "boom" } });
    await expect(first).rejects.toBeInstanceOf(ExecInterruptedError);
    await vi.waitFor(() => expect(a.readyState).toBe(3));

    const second = sandbox.exec("echo two");
    const b = await ws.nextSocket();
    await runOn(b, 1, "two\n");
    await expect(second).resolves.toMatchObject({ stdout: "two\n" });
  });

  it("does not pool a detached exec's socket", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("sleep 100");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverDurableSession("sess-1");
    await expect(first.detach()).resolves.toBe("sess-1");
    await vi.waitFor(() => expect(a.readyState).toBe(3));

    const second = sandbox.exec("echo two");
    const b = await ws.nextSocket();
    await runOn(b, 1, "two\n");
    await expect(second).resolves.toMatchObject({ stdout: "two\n" });
  });

  it("does not hand out a busy socket after detach() on a finished exec", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverDurableSession("sess-1");
    await runOn(a, 1, "one\n");
    await first;

    const second = sandbox.exec("sleep 100");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    await first.detach();
    const third = sandbox.exec("echo three");
    const b = await ws.nextSocket();
    await runOn(b, 1, "three\n");
    await expect(third).resolves.toMatchObject({ stdout: "three\n" });
    a.serverExit(0);
    await expect(second).resolves.toMatchObject({ exitCode: 0 });
  });

  it("does not let a finished exec's detach() arm an idle timer under a later exec", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], { idleTimeoutMs: 1_000 });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverDurableSession("sess-1");
    await runOn(a, 1, "one\n");
    await first;
    await first.detach();

    const second = sandbox.exec("sleep 100");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(a.readyState).toBe(1);
    a.serverExit(0);
    await expect(second).resolves.toMatchObject({ exitCode: 0 });
  });

  it("sends no command on an idle socket that is closing", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a"), shellToken("b")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;
    a.readyState = 2;

    const second = sandbox.exec("echo two");
    const b = await ws.nextSocket();
    await runOn(b, 1, "two\n");
    await expect(second).resolves.toMatchObject({ stdout: "two\n" });
    expect(inits(a)).toHaveLength(1);
  });

  it("opens a fresh socket after the proxy closed an idle one", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;
    a.serverClose(1000, "idle timeout");
    await tick();

    const second = sandbox.exec("echo two");
    const b = await ws.nextSocket();
    await runOn(b, 1, "two\n");
    await expect(second).resolves.toMatchObject({ stdout: "two\n" });
    expect(inits(a)).toHaveLength(1);
  });

  it.each(["idle timeout", "tunnel stream budget spent", "tunnel closed"])('retries on a fresh socket after a "%s" close races the next init_exec', async reason => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;

    const second = sandbox.exec("echo two");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverClose(1000, reason);
    const b = await ws.nextSocket();
    await runOn(b, 1, "two\n");
    await expect(second).resolves.toMatchObject({ exitCode: 0, stdout: "two\n" });
  });

  it("redials on a fresh socket, not another idle one", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const burst = [sandbox.exec("one"), sandbox.exec("two")];
    await vi.waitFor(() => expect(ws.sockets).toHaveLength(2));
    for (const socket of ws.sockets) await runOn(socket, 1, "ok\n");
    await Promise.all(burst);

    const next = sandbox.exec("three");
    await vi.waitFor(() => expect(ws.sockets.flatMap(inits)).toHaveLength(3));
    const picked = ws.sockets.find(socket => inits(socket).length === 2)!;
    const other = ws.sockets.find(socket => socket !== picked)!;
    picked.serverClose(1000, "idle timeout");
    const fresh = await ws.nextSocket();
    await runOn(fresh, 1, "three\n");
    await expect(next).resolves.toMatchObject({ exitCode: 0, stdout: "three\n" });
    expect(inits(other)).toHaveLength(1);
  });

  it("sends no command on the redialled socket once the exec settled", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {}, { reusePeer: true, manualOpen: true });
    const first = sandbox.exec("echo one");
    const a = await vi.waitFor(() => ws.sockets[0] ?? Promise.reject(new Error("no socket")));
    a.serverOpen();
    await runOn(a, 1, "one\n");
    await first;

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const second = sandbox.exec("sleep 100", { timeoutSec: 1 });
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverClose(1000, "idle timeout");
    const b = await vi.waitFor(() => ws.sockets[1] ?? Promise.reject(new Error("no socket")));
    await vi.advanceTimersByTimeAsync(11_000);
    await expect(second).resolves.toMatchObject({ timedOut: true, exitCode: null });

    b.serverOpen();
    await vi.advanceTimersByTimeAsync(0);
    expect(inits(b)).toHaveLength(0);
    expect(b.readyState).toBe(3);
  });

  it("rejects a queued stdin write when the exec settles during a redial", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {}, { reusePeer: true, manualOpen: true });
    const first = sandbox.exec("echo one");
    const a = await vi.waitFor(() => ws.sockets[0] ?? Promise.reject(new Error("no socket")));
    a.serverOpen();
    await runOn(a, 1, "one\n");
    await first;

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const second = sandbox.exec("cat", { stdin: true, timeoutSec: 1 });
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverClose(1000, "idle timeout");
    await vi.waitFor(() => expect(ws.sockets).toHaveLength(2));
    const write = second.stdin.write("data");
    write.catch(() => {});
    await vi.advanceTimersByTimeAsync(11_000);
    await expect(second).resolves.toMatchObject({ timedOut: true });
    await expect(write).rejects.toThrow("no longer writable");
  });

  it("redials when the reused socket is retired before the exec has a connection", async () => {
    let initCount = 0;
    let first: MockExecSocket | undefined;
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {}, {
      reusePeer: true,
      onSend: frame => {
        if (frame.type === "init_exec" && ++initCount === 2) first!.serverClose(1000, "idle timeout");
      },
    });
    const one = sandbox.exec("echo one");
    first = await ws.nextSocket();
    await runOn(first, 1, "one\n");
    await one;

    const two = sandbox.exec("echo two");
    const b = await ws.nextSocket();
    await runOn(b, 1, "two\n");
    await expect(two).resolves.toMatchObject({ exitCode: 0, stdout: "two\n" });
    expect(b.sentText.filter(f => f.type === "stdin_close")).toHaveLength(1);
  });

  it("refreshes the shell token and retries when a reused socket's token expired", async () => {
    const { sandbox, ws, mock } = await pooledSandbox([shellToken("a"), shellToken("b")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;

    const second = sandbox.exec("echo two");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverFrame({ type: "error", data: { code: "token_expired", message: "jwt expired" } });
    a.serverClose(1008, "token_expired");
    const b = await ws.nextSocket();
    expect(b.protocols.at(-1)!.split(".")[2]).toBe("b");
    await runOn(b, 1, "two\n");
    await expect(second).resolves.toMatchObject({ exitCode: 0, stdout: "two\n" });
    expect(mock.calls).toHaveLength(3);
  });

  it("resends an ended stdin's EOF on the redialled socket", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;

    const second = sandbox.exec("cat", { stdin: true });
    await second.stdin.end();
    a.serverClose(1000, "idle timeout");
    const b = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    await vi.waitFor(() => expect(b.sentText.filter(f => f.type === "stdin_close")).toHaveLength(1));
    b.serverExit(0);
    await expect(second).resolves.toMatchObject({ exitCode: 0 });
    expect(b.sentText.filter(f => f.type === "stdin_close")).toHaveLength(1);
  });

  it("does not retry a reused exec once its stdin was sent", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;

    const second = sandbox.exec("cat", { stdin: true });
    await second.stdin.write("data");
    a.serverClose(1000, "idle timeout");
    await expect(second).rejects.toBeInstanceOf(ExecInterruptedError);
    expect(ws.sockets).toHaveLength(1);
  });

  it("resets stdin credits for each exec on a reused socket", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], {}, { reusePeer: true, manualCredits: true });
    const first = sandbox.exec("cat", { stdin: true });
    const a = await ws.nextSocket();
    for (let i = 0; i < 8; i++) await first.stdin.write("x");
    a.serverExit(0);
    await first;

    const second = sandbox.exec("cat", { stdin: true });
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    for (let i = 0; i < 8; i++) await second.stdin.write("y");
    expect(a.sentStdin).toHaveLength(16);
    a.serverExit(0);
    await second;
  });

  it("keeps an idle socket whose token outlives the caller's and closes one that does not", async () => {
    const ws = createExecWsMock({ reusePeer: true });
    const config = normalizeRailwayClientConfig({ ...auth, fetch: createFetchMock([]).fetch, webSocketImpl: ws.webSocketImpl });
    const pool = new ExecSocketPool(config, {});
    const runToIdle = async (socket: ExecSocket) => {
      const exit = new Promise<void>(resolve => {
        const connection = socket.begin({ command: "true" }, {
          onError() {}, onStdinError() {}, onStdout() {}, onStderr() {}, onClose() {},
          onExit: () => { connection.close(); resolve(); },
        });
      });
      ws.sockets.at(-1)!.serverExit(0);
      await exit;
    };
    const newer = await pool.acquire({ jwt: jwt("b", 600) });
    await runToIdle(newer);

    const reused = await pool.acquire({ jwt: jwt("a", 300) });
    expect(reused).toBe(newer);
    expect(ws.sockets).toHaveLength(1);
    await runToIdle(reused);

    await expect(pool.acquire({ jwt: jwt("c", 900) })).resolves.not.toBe(newer);
    expect(newer.closed).toBe(true);
  });

  it("closes idle sockets after the configured idle time", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a")], { idleTimeoutMs: 1_000 });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;
    expect(a.readyState).toBe(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(a.readyState).toBe(3);
  });

  it("closes pooled sockets when the sandbox is destroyed", async () => {
    const { sandbox, ws } = await pooledSandbox([shellToken("a"), { data: { sandboxDestroy: true } }], {});
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await runOn(a, 1, "one\n");
    await first;
    await sandbox.destroy();
    expect(a.readyState).toBe(3);
  });

  it("rejects an invalid idle timeout", async () => {
    await expect(normalize({ idleTimeoutMs: 0 })).rejects.toThrow(TypeError);
    await expect(normalize({ idleTimeoutMs: -1 })).rejects.toThrow(TypeError);
  });
});

function normalize(execSocketPool: { idleTimeoutMs?: number }) {
  return Sandbox.connect("sbx", { ...auth, fetch: createFetchMock([]).fetch, execSocketPool });
}
