import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExecConnectionLimitError, ExecNotStartedError } from "../src/core/errors.js";
import { ExecInterruptedError, Sandbox } from "../src/index.js";
import { clearRailwayEnv, createFetchMock, sandboxInfo } from "./test-helpers.js";
import { createExecWsMock, type MockExecSocket } from "./exec-ws-mock.js";

const auth = { token: "token_123", environmentId: "environment_123" };
const jwt = (name: string) => {
  const payload = Buffer.from(JSON.stringify({ iat: 1_000, exp: 1_300, jti: name })).toString("base64url");
  return `eyJhbGciOiJFUzI1NiJ9.${payload}.${name}`;
};
const shellToken = (name: string) => ({ data: { generateShellToken: jwt(name) } });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const pipelineCaps = { version: 3, stdin_chunks: 8, stdin_chunk_bytes: 16384, reuse: true, pipeline: true };
const reuseCaps = { version: 3, stdin_chunks: 8, stdin_chunk_bytes: 16384, reuse: true };
const validSessionName = /^[a-z0-9][a-z0-9-]{0,63}$/;

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function sandboxWith(
  responses: unknown[],
  wsOptions: Parameters<typeof createExecWsMock>[0],
  pooled = true,
) {
  const ws = createExecWsMock(wsOptions);
  const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }, ...responses]);
  const sandbox = await Sandbox.create({
    ...auth,
    fetch: mock.fetch,
    webSocketImpl: ws.webSocketImpl,
    execSocketPool: pooled ? {} : false,
  });
  return { sandbox, ws, mock };
}

const types = (socket: MockExecSocket) => socket.sentText.map(f => f.type);
const inits = (socket: MockExecSocket) => socket.sentText.filter(f => f.type === "init_exec");
const initData = (socket: MockExecSocket, index = 0) =>
  inits(socket)[index]!.data as Record<string, unknown>;

function settledFlag(promise: PromiseLike<unknown>) {
  const state = { settled: false };
  promise.then(() => { state.settled = true; }, () => { state.settled = true; });
  return state;
}

describe("pooled exec on a proxy without pipelining", () => {
  it("waits for capabilities before sending init_exec", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, manualCapabilities: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await tick();
    await tick();
    expect(a.sentText).toEqual([{ type: "exec_hello", data: { reuse: true, pipeline: true } }]);

    a.serverFrame({ type: "exec_capabilities", data: reuseCaps });
    await vi.waitFor(() => expect(types(a)).toEqual(["exec_hello", "init_exec", "stdin_close"]));
    a.serverStdout("hi\n");
    a.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
  });

  it("sends no command when aborted before capabilities", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, manualCapabilities: true });
    const controller = new AbortController();
    const exec = sandbox.exec("touch /ran", { signal: controller.signal });
    const a = await ws.nextSocket();
    await tick();
    const reason = new Error("stop");
    controller.abort(reason);
    await expect(exec).rejects.toBe(reason);
    expect(types(a)).toEqual(["exec_hello"]);
    expect(a.readyState).toBe(3);
    expect(ws.sockets).toHaveLength(1);
  });

  it("signals the command at once on kill() after capabilities", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await tick();
    await exec.kill("TERM");
    expect(a.sentText.filter(f => f.type === "signal")).toEqual([{ type: "signal", data: { signal: "TERM" } }]);
    a.serverExit(-1);
    await expect(exec).resolves.toMatchObject({ exitCode: -1 });
  });

  it("commits at capabilities and closes after exit when the proxy does not reuse", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], {});
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    expect(types(a)).toEqual(["exec_hello", "init_exec", "stdin_close"]);
    a.serverStdout("hi\n");
    a.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
    await vi.waitFor(() => expect(a.readyState).toBe(3));
  });

  it("does not retry a close after capabilities", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await tick();
    a.serverClose(1006);
    await expect(exec).rejects.toBeInstanceOf(ExecInterruptedError);
    await tick();
    expect(ws.sockets).toHaveLength(1);
  });

  it("retries a close before capabilities, which sent no command", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { manualCapabilities: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await tick();
    a.serverClose(1006);
    const b = await ws.nextSocket();
    expect(inits(a)).toHaveLength(0);
    b.serverFrame({ type: "exec_capabilities", data: { version: 2, stdin_chunks: 8, stdin_chunk_bytes: 16384 } });
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0 });
  });

  it("rejects invalid capabilities before sending a command", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { manualCapabilities: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await tick();
    a.serverFrame({ type: "exec_capabilities", data: { version: 1 } });
    const error = (await exec.catch(e => e)) as Error;
    expect(error.message).toContain("Unsupported exec control capabilities; no command was sent");
    expect(inits(a)).toHaveLength(0);
  });
});

describe("pooled exec on a pipelining proxy", () => {
  it("sends init_exec after early capabilities, before the command starts", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualCapabilities: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const state = settledFlag(exec);
    const a = await ws.nextSocket();
    await tick();
    expect(types(a)).toEqual(["exec_hello"]);

    a.serverFrame({ type: "exec_capabilities", data: pipelineCaps });
    await vi.waitFor(() => expect(types(a)).toEqual(["exec_hello", "init_exec", "stdin_close"]));
    await tick();
    expect(state.settled).toBe(false);

    a.serverStarted();
    a.serverStdout("hi\n");
    a.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
  });

  it("runs exec_started, output and exit, then keeps the socket for the next exec", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true });
    const first = sandbox.exec("echo one");
    const socket = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(socket)).toHaveLength(1));
    socket.serverStdout("one\n");
    socket.serverExit(0);
    await expect(first).resolves.toMatchObject({ exitCode: 0, stdout: "one\n" });
    expect(socket.readyState).toBe(1);

    const second = sandbox.exec("echo two");
    await vi.waitFor(() => expect(inits(socket)).toHaveLength(2));
    socket.serverStdout("two\n");
    socket.serverExit(0);
    await expect(second).resolves.toMatchObject({ exitCode: 0, stdout: "two\n" });
    expect(ws.sockets).toHaveLength(1);
  });

  it("names each fresh durable exec with its own random session name", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true });
    const first = sandbox.exec("echo one", { env: { A: "1" }, cwd: "/work" });
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverExit(0);
    await first;
    const second = sandbox.exec("echo two");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverExit(0);
    await second;
    const third = sandbox.exec("echo three", { ephemeral: true });
    await vi.waitFor(() => expect(inits(a)).toHaveLength(3));
    a.serverExit(0);
    await third;

    const one = initData(a, 0);
    const two = initData(a, 1);
    expect(one).toMatchObject({ env: { A: "1" }, cwd: "/work" });
    expect(one.durable_session_name).toMatch(validSessionName);
    expect(two.durable_session_name).toMatch(validSessionName);
    expect(one.durable_session_name).not.toBe(two.durable_session_name);
    expect(initData(a, 2)).not.toHaveProperty("durable_session_name");
  });

  it.each([1006, 1001, 1012, 1013])("reattaches with the same name after a %i close between init_exec and exec_started", async code => {
    const { sandbox, ws, mock } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi", { env: { A: "1" }, cwd: "/work" });
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(code);

    const b = await ws.nextSocket();
    expect(b.protocols.at(-1)!.split(".")[2]).toBe("b");
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    expect(initData(b)).toEqual(initData(a));
    expect(initData(b).durable_session_name).toMatch(validSessionName);
    b.serverStarted();
    b.serverStdout("hi\n");
    b.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
    expect(mock.calls).toHaveLength(3);
  });

  it.each([1006, 1012])("rejects an ephemeral exec as outcome unknown after a %i close between init_exec and exec_started", async code => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi", { ephemeral: true });
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(code);
    const error = (await exec.catch(e => e)) as Error;
    expect(error).toBeInstanceOf(ExecInterruptedError);
    expect(error).not.toBeInstanceOf(ExecNotStartedError);
    await tick();
    expect(ws.sockets).toHaveLength(1);
  });

  it("reports outcome unknown when the reattach also drops before exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(1006);
    const b = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverClose(1001, "going away");
    const error = (await exec.catch(e => e)) as Error;
    expect(error).toBeInstanceOf(ExecInterruptedError);
    expect(error).not.toBeInstanceOf(ExecNotStartedError);
    await tick();
    expect(ws.sockets).toHaveLength(2);
  });

  it("reports outcome unknown for a drop before exec_started on the retry after a close before capabilities", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualCapabilities: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await tick();
    a.serverClose(1006);
    const b = await ws.nextSocket();
    b.serverFrame({ type: "exec_capabilities", data: pipelineCaps });
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverClose(1006);
    await expect(exec).rejects.toBeInstanceOf(ExecInterruptedError);
    await tick();
    expect(ws.sockets).toHaveLength(2);
  });

  it("reports outcome unknown for a drop before exec_started after a retired socket's redial", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverStarted();
    a.serverExit(0);
    await first;

    const second = sandbox.exec("echo two");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverClose(1000, "idle timeout");
    const b = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverClose(1006);
    await expect(second).rejects.toBeInstanceOf(ExecInterruptedError);
    await tick();
    expect(ws.sockets).toHaveLength(2);
  });

  it("does not retry a close after exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await tick();
    a.serverClose(1006);
    await expect(exec).rejects.toBeInstanceOf(ExecInterruptedError);
    await tick();
    expect(ws.sockets).toHaveLength(1);
  });

  it("fails with ExecConnectionLimitError when the proxy refuses at its limit before exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(4001, "max SSH connections");
    await expect(exec).rejects.toBeInstanceOf(ExecConnectionLimitError);
    expect(ws.sockets).toHaveLength(1);
  });

  it("rejects an error frame before exec_started as not started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverFrame({ type: "error", data: { code: "route_failed", message: "no route" } });
    a.serverClose(1011, "route_failed");
    const error = (await exec.catch(e => e)) as Error;
    expect(error).toBeInstanceOf(ExecNotStartedError);
    expect(error.message).toContain("route_failed");
    expect(ws.sockets).toHaveLength(1);
  });

  it("sends kill() before exec_started at once and rejects as not started when the proxy cancels", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await expect(exec.kill("TERM")).resolves.toBe(true);
    expect(a.sentText.at(-1)).toEqual({ type: "signal", data: { signal: "TERM" } });
    const error = (await exec.catch(e => e)) as Error;
    expect(error).toBeInstanceOf(ExecNotStartedError);
    expect(error.message).toContain("cancelled before start");
    await tick();
    expect(ws.sockets).toHaveLength(1);
  });

  it("follows the started command when kill() before exec_started races the start", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverStarted();
    await exec.kill("TERM");
    expect(types(a)).toContain("signal");
    a.serverExit(-1);
    await expect(exec).resolves.toMatchObject({ exitCode: -1 });
  });

  it("sends the signal and closes the socket on abort before exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const controller = new AbortController();
    const exec = sandbox.exec("sleep 10", { signal: controller.signal });
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    const sent = types(a);
    const reason = new Error("stop");
    controller.abort(reason);
    await expect(exec).rejects.toBe(reason);
    expect(a.readyState).toBe(3);
    expect(types(a)).toEqual([...sent, "signal"]);
    expect(ws.sockets).toHaveLength(1);
  });

  it("holds stdin until exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("cat", { stdin: true });
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    const write = exec.stdin.write("data");
    await tick();
    expect(a.sentStdin).toHaveLength(0);

    a.serverStarted();
    await write;
    expect(new TextDecoder().decode(a.sentStdin[0])).toBe("data");
    a.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0 });
  });

  it("starts timeoutSec at exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const exec = sandbox.exec("sleep 10", { timeoutSec: 1 });
    const a = await vi.waitFor(() => ws.sockets[0] ?? Promise.reject(new Error("no socket")));
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(types(a)).not.toContain("signal");
    a.serverStarted();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(a.sentText.filter(f => f.type === "signal")).toEqual([{ type: "signal", data: { signal: "TERM" } }]);
    a.serverExit(-1);
    await expect(exec).resolves.toMatchObject({ timedOut: true, exitCode: -1 });
  });

  it("reattaches by name after a pre-start close on a reused socket", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverStarted();
    a.serverExit(0);
    await first;

    const second = sandbox.exec("echo two");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverClose(1001, "going away");
    const b = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    expect(initData(b)).toEqual(initData(a, 1));
    b.serverStarted();
    b.serverExit(0);
    await expect(second).resolves.toMatchObject({ exitCode: 0 });
  });

  it.each(["idle timeout", "tunnel stream budget spent", "tunnel closed"])('redials without a new token after a "%s" retire on a pipelined socket', async reason => {
    const { sandbox, ws, mock } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true });
    const first = sandbox.exec("echo one");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverExit(0);
    await first;

    const second = sandbox.exec("echo two");
    await vi.waitFor(() => expect(inits(a)).toHaveLength(2));
    a.serverClose(1000, reason);
    const b = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverExit(0);
    await expect(second).resolves.toMatchObject({ exitCode: 0 });
    expect(mock.calls).toHaveLength(2);
  });
});

describe("exec with execSocketPool: false", () => {
  it("leaves the wire unchanged", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { manualCapabilities: true, pipelinePeer: true }, false);
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await tick();
    expect(a.sentText).toEqual([{ type: "exec_hello" }]);
    a.serverFrame({ type: "exec_capabilities", data: { version: 2, stdin_chunks: 8, stdin_chunk_bytes: 16384 } });
    await vi.waitFor(() => expect(types(a)).toEqual(["exec_hello", "init_exec", "stdin_close"]));
    expect(Object.keys(initData(a))).toEqual(["command"]);
    a.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0 });
  });

  it("does not retry a 1006 after init_exec", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], {}, false);
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(1006);
    await expect(exec).rejects.toBeInstanceOf(ExecInterruptedError);
    await tick();
    expect(ws.sockets).toHaveLength(1);
  });
});
