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
    ...(pooled ? { execSocketPool: {} } : {}),
  });
  return { sandbox, ws, mock };
}

const types = (socket: MockExecSocket) => socket.sentText.map(f => f.type);
const inits = (socket: MockExecSocket) => socket.sentText.filter(f => f.type === "init_exec");

describe("pipelined exec start", () => {
  it("sends init_exec right after the hello without waiting for capabilities", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualCapabilities: true });
    const exec = sandbox.exec("echo hi");
    const socket = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(socket)).toHaveLength(1));
    expect(socket.sentText[0]).toEqual({ type: "exec_hello", data: { reuse: true, pipeline: true } });
    expect(types(socket)).toEqual(["exec_hello", "init_exec", "stdin_close"]);

    socket.serverFrame({ type: "exec_capabilities", data: pipelineCaps });
    socket.serverStarted();
    socket.serverStdout("hi\n");
    socket.serverExit(0);
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

  it("retries once on a fresh socket when the proxy closes before exec_started", async () => {
    const { sandbox, ws, mock } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(1012, "service restart");

    const b = await ws.nextSocket();
    expect(b.protocols.at(-1)!.split(".")[2]).toBe("b");
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverStarted();
    b.serverStdout("hi\n");
    b.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
    expect(mock.calls).toHaveLength(3);
  });

  it("gives up after one retry before exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(1001, "going away");
    const b = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverClose(1001, "going away");
    const error = (await exec.catch(e => e)) as Error;
    expect(error).toBeInstanceOf(ExecNotStartedError);
    expect(error.message).toContain("before the command started");
    expect(ws.sockets).toHaveLength(2);
  });

  it("does not retry a close after exec_started", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await tick();
    a.serverClose(1012, "service restart");
    await expect(exec).rejects.toBeInstanceOf(ExecInterruptedError);
    await tick();
    expect(ws.sockets).toHaveLength(1);
  });

  it("treats an abrupt close after init_exec and before exec_started as outcome unknown", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
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

  it("commits at capabilities on a proxy that does not pipeline and closes after exit", async () => {
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

  it("does not retry a close after capabilities from a proxy that does not pipeline", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { reusePeer: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await tick();
    a.serverClose(1012, "service restart");
    await expect(exec).rejects.toBeInstanceOf(ExecInterruptedError);
    await tick();
    expect(ws.sockets).toHaveLength(1);
  });

  it("retries a close before capabilities on any proxy", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a"), shellToken("b")], { manualCapabilities: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverClose(1013, "try again later");
    const b = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(b)).toHaveLength(1));
    b.serverFrame({ type: "exec_capabilities", data: { version: 2, stdin_chunks: 8, stdin_chunk_bytes: 16384 } });
    b.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0 });
  });

  it("does not claim no command was sent when pipelined capabilities are invalid", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { manualCapabilities: true });
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    a.serverFrame({ type: "exec_capabilities", data: { version: 1 } });
    const error = (await exec.catch(e => e)) as Error;
    expect(error).toBeInstanceOf(ExecInterruptedError);
    expect(error.message).not.toContain("no command was sent");
    expect(error.message).toContain("Unsupported exec control capabilities");
    await vi.waitFor(() => expect(a.readyState).toBe(3));
  });

  it("holds stdin until capabilities arrive", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualCapabilities: true });
    const exec = sandbox.exec("cat", { stdin: true });
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    const write = exec.stdin.write("data");
    await tick();
    expect(a.sentStdin).toHaveLength(0);

    a.serverFrame({ type: "exec_capabilities", data: pipelineCaps });
    a.serverStarted();
    await write;
    expect(new TextDecoder().decode(a.sentStdin[0])).toBe("data");
    a.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0 });
  });

  it("closes the socket and sends nothing further on abort before exec_started", async () => {
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
    expect(types(a)).toEqual(sent);
    expect(ws.sockets).toHaveLength(1);
  });

  it("sends a kill() made before exec_started once the command starts", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { reusePeer: true, pipelinePeer: true, manualStart: true });
    const exec = sandbox.exec("sleep 10");
    const a = await ws.nextSocket();
    await vi.waitFor(() => expect(inits(a)).toHaveLength(1));
    await exec.kill("TERM");
    await tick();
    expect(types(a)).not.toContain("signal");
    a.serverStarted();
    await vi.waitFor(() => expect(types(a)).toContain("signal"));
    a.serverExit(-1);
    await expect(exec).resolves.toMatchObject({ exitCode: -1 });
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

  it("waits for exec_started on a reused socket and retries a pre-start close", async () => {
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

  it("leaves the wire unchanged without execSocketPool", async () => {
    const { sandbox, ws } = await sandboxWith([shellToken("a")], { manualCapabilities: true }, false);
    const exec = sandbox.exec("echo hi");
    const a = await ws.nextSocket();
    await tick();
    expect(a.sentText).toEqual([{ type: "exec_hello" }]);
    a.serverFrame({ type: "exec_capabilities", data: { version: 2, stdin_chunks: 8, stdin_chunk_bytes: 16384 } });
    await vi.waitFor(() => expect(types(a)).toEqual(["exec_hello", "init_exec", "stdin_close"]));
    a.serverExit(0);
    await expect(exec).resolves.toMatchObject({ exitCode: 0 });
  });
});
