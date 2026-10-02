import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveTcpProxyWsEndpoint } from "../src/core/config.js";
import {
  ExecHandle,
  Sandbox,
  type ExecOptions,
  type ExecTarget,
} from "../src/index.js";
import { clearRailwayEnv, createFetchMock, sandboxInfo } from "./test-helpers.js";
import { createExecWsMock } from "./exec-ws-mock.js";

const auth = { token: "token_123", environmentId: "environment_123" };

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

const shellToken = (token: string) => ({ data: { generateShellToken: token } });

async function wsSandbox(responses: unknown[] = [], wsOptions: Parameters<typeof createExecWsMock>[0] = {}) {
  const ws = createExecWsMock(wsOptions);
  const mock = createFetchMock([
    { data: { sandboxCreate: sandboxInfo() } },
    ...responses,
  ]);
  const sandbox = await Sandbox.create({
    ...auth,
    fetch: mock.fetch,
    webSocketImpl: ws.webSocketImpl,
  });
  return { sandbox, ws, mock };
}

/** Creates a ws-backed sandbox, starts an exec, and waits for its socket. */
async function execSocket(
  target: ExecTarget,
  options?: ExecOptions,
  responses: unknown[] = [shellToken("jwt_abc")],
  wsOptions: Parameters<typeof createExecWsMock>[0] = {},
) {
  const { sandbox, ws, mock } = await wsSandbox(responses, wsOptions);
  const handle =
    typeof target === "string"
      ? sandbox.exec(target, options)
      : sandbox.exec(target, options);
  const socket = await ws.nextSocket();
  await tick();
  return { sandbox, ws, mock, handle, socket };
}

describe("deriveTcpProxyWsEndpoint", () => {
  it("maps a backboard endpoint to the ssh exec endpoint", () => {
    expect(
      deriveTcpProxyWsEndpoint("https://backboard.railway.com/graphql/v2"),
    ).toBe("wss://ssh.railway.com:2226/ws/exec");
  });

  it("handles non-backboard hosts by prefixing ssh.", () => {
    expect(deriveTcpProxyWsEndpoint("https://api.railway-develop.com/graphql")).toBe(
      "wss://ssh.api.railway-develop.com:2226/ws/exec",
    );
  });
});

describe("exec", () => {
  it("rejects unsupported peers before sending a command", async () => {
    const { handle, socket } = await execSocket("side-effect", {}, undefined, { manualCapabilities: true });
    expect(socket.sentText).toEqual([{ type: "exec_hello" }]);
    socket.serverClose(1000, "old proxy");
    await expect(handle).rejects.toThrow(/no command was sent/);
  });

  it("aborts capability negotiation without sending a command", async () => {
    const controller = new AbortController();
    const { handle, socket } = await execSocket("side-effect", { signal: controller.signal }, undefined, { manualCapabilities: true });
    controller.abort();
    socket.serverFrame({ type: "exec_capabilities", data: { version: 2, stdin_chunks: 8, stdin_chunk_bytes: 16384 } });
    await expect(handle).rejects.toBe(controller.signal.reason);
    expect(socket.sentText).toEqual([{ type: "exec_hello" }]);
  });

  it("keeps signals deliverable when stdin exhausts remote credits", async () => {
    const controller = new AbortController();
    const { handle, socket } = await execSocket("sleep 60", { stdin: true, signal: controller.signal }, undefined, { manualCredits: true });
    vi.useFakeTimers();
    const write = handle.stdin.write(new Uint8Array(4 * 1024 * 1024));
    const rejected = expect(write).rejects.toThrow(/no longer writable/);
    await vi.advanceTimersByTimeAsync(100);
    expect(socket.sentStdin).toHaveLength(8);
    controller.abort();
    await vi.advanceTimersByTimeAsync(5000);
    expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "TERM" } });
    expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "KILL" } });
    expect(socket.sentStdin).toHaveLength(8);
    socket.serverExit(-1);
    await expect(handle).rejects.toBe(controller.signal.reason);
    await rejected;
  });

  it.each([undefined, null, "0", 0.5, -2])("rejects an invalid remote exit code (%s)", async code => {
    const { handle, socket } = await execSocket("cmd");
    socket.serverFrame({ type: "exit", data: { exit_code: code } });
    await expect(handle).rejects.toThrow(/no valid remote exit code/);
  });

  it("retains partial output and abort cause when the exit frame is malformed", async () => {
    const controller = new AbortController();
    const { handle, socket } = await execSocket("cmd", { signal: controller.signal });
    socket.serverStdout("partial");
    await tick();
    controller.abort();
    socket.serverFrame({ type: "exit", data: {} });
    await expect(handle).rejects.toMatchObject({
      name: "ExecInterruptedError", stdout: "partial", cause: controller.signal.reason,
    });
  });

  it("mints a shell-scoped token and opens /ws/exec with the command init frame", async () => {
    const { mock, handle, socket } = await execSocket("echo hi");
    expect(handle).toBeInstanceOf(ExecHandle);

    expect(mock.calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        instanceId: "sandbox_123",
        kind: "sandbox",
        scope: "shell",
      },
    });
    expect(socket.url).toBe("wss://ssh.railway.com:2226/ws/exec");
    expect(socket.protocols).toEqual(["railway-shell", "jwt_abc"]);
    expect(socket.sentText.find(f => f.type === "init_exec")).toEqual({
      type: "init_exec",
      data: { command: "bash -lc 'echo hi'" },
    });
    // No stdin provided, so stdin is EOF'd up front.
    expect(socket.sentText.some(f => f.type === "stdin_close")).toBe(true);

    socket.serverDurableSession("sess_hi");
    socket.serverStdout("hi\n");
    socket.serverExit(0);

    await expect(handle).resolves.toEqual({
      exitCode: 0,
      stdout: "hi\n",
      stderr: "",
      truncated: false,
      timedOut: false,
    });
    expect(await handle.sessionName).toBe("sess_hi");
  });

  it("rejects sessionName when the server assigns no durable session", async () => {
    const { handle, socket } = await execSocket("echo hi");

    // No durable_session frame ⇒ the server can't do durable sessions.
    socket.serverStdout("hi\n");
    socket.serverExit(0);

    // The command still succeeds; only the (unusable) session name fails.
    await expect(handle).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
    await expect(handle.sessionName).rejects.toThrow(/durable/i);
  });

  it("keeps stdout and stderr separate and reports the real exit code", async () => {
    const out: string[] = [];
    const err: string[] = [];
    const { handle, socket } = await execSocket("build", {
      onStdout: c => out.push(c),
      onStderr: c => err.push(c),
    });

    socket.serverStdout("compiling\n");
    socket.serverStderr("warning: x\n");
    socket.serverExit(2);

    const result = await handle;
    expect(result).toMatchObject({
      exitCode: 2,
      stdout: "compiling\n",
      stderr: "warning: x\n",
      timedOut: false,
    });
    expect(out.join("")).toBe("compiling\n");
    expect(err.join("")).toBe("warning: x\n");
  });

  it("signals on timeout and reports timedOut only after the remote exit", async () => {
    vi.useFakeTimers();
    const { sandbox, ws } = await wsSandbox([shellToken("jwt_abc")]);
    const handle = sandbox.exec("sleep 100", { timeoutSec: 1 });
    const socket = await ws.nextSocket();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "TERM" } });
    expect(socket.readyState).toBe(1);
    socket.serverExit(-1);
    await expect(handle).resolves.toMatchObject({ timedOut: true, exitCode: -1 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("escalates timeout to KILL and rejects an unconfirmed termination", async () => {
    vi.useFakeTimers();
    const { sandbox, ws } = await wsSandbox([shellToken("jwt")]);
    const handle = sandbox.exec("trap '' TERM; sleep 100", { timeoutSec: 1 });
    const socket = await ws.nextSocket();
    const rejection = expect(handle).rejects.toThrow(/termination was not confirmed/);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "KILL" } });
    expect(socket.readyState).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    await rejection;
    expect(socket.readyState).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not treat a disconnect during timeout termination as a confirmed exit", async () => {
    vi.useFakeTimers();
    const { sandbox, ws } = await wsSandbox([shellToken("jwt")]);
    const handle = sandbox.exec("sleep 100", { timeoutSec: 1 });
    const socket = await ws.nextSocket();
    await vi.advanceTimersByTimeAsync(1_000);
    socket.serverClose(1006);
    await expect(handle).rejects.toThrow(/closed before the command reported an exit/);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("accepts a confirmed KILL exit after a process ignores TERM", async () => {
    vi.useFakeTimers();
    const { sandbox, ws } = await wsSandbox([shellToken("jwt")]);
    const handle = sandbox.exec("trap '' TERM; sleep 100", { timeoutSec: 1 });
    const socket = await ws.nextSocket();
    await vi.advanceTimersByTimeAsync(6_000);
    socket.serverExit(-1);
    await expect(handle).resolves.toMatchObject({ timedOut: true, exitCode: -1 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pipes text and binary stdin before connection readiness, then sends EOF in order", async () => {
    const { sandbox, ws } = await wsSandbox([shellToken("jwt")]);
    const handle = sandbox.exec("cat", { stdin: true });
    const text = handle.stdin.write("hello 🌍\n");
    const binary = handle.stdin.write(new Uint8Array([0, 255, 10]));
    const end = handle.stdin.end();
    const socket = await ws.nextSocket();
    await Promise.all([text, binary, end]);
    expect(socket.sentStdin).toEqual([
      new TextEncoder().encode("hello 🌍\n"),
      new Uint8Array([0, 255, 10]),
    ]);
    expect(socket.sentText.filter(f => f.type === "stdin_close")).toHaveLength(1);
    await handle.stdin.end();
    await expect(handle.stdin.write("late")).rejects.toThrow(/stdin is closed/);
    socket.serverExit(0);
    await handle;
  });

  it("leaves piped stdin open and rejects writes to default-closed stdin", async () => {
    const piped = await execSocket("cat", { stdin: true });
    expect(piped.socket.sentText.some(f => f.type === "stdin_close")).toBe(false);
    await piped.handle.stdin.end();
    piped.socket.serverExit(0);
    await piped.handle;

    const closed = await execSocket("cat");
    await expect(closed.handle.stdin.write("hello")).rejects.toThrow(/stdin: true/);
    closed.socket.serverExit(0);
    await closed.handle;
  });

  it("bounds stdin frames and waits for a slow WebSocket send buffer", async () => {
    const { handle, socket } = await execSocket("cat", { stdin: true });
    vi.useFakeTimers();
    socket.bufferedAmount = 256 * 1024;
    const data = new Uint8Array(200_000).fill(42);
    const write = handle.stdin.write(data);
    await vi.advanceTimersByTimeAsync(100);
    expect(socket.sentStdin).toHaveLength(0);
    socket.bufferedAmount = 0;
    await vi.advanceTimersByTimeAsync(50);
    await write;
    expect(socket.sentStdin.every(chunk => chunk.length + 1 <= 32 * 1024)).toBe(true);
    expect(Buffer.concat(socket.sentStdin)).toEqual(Buffer.from(data));
    socket.serverExit(0);
    await handle;
  });

  it("rejects a backpressured stdin write when the connection closes", async () => {
    const { handle, socket } = await execSocket("cat", { stdin: true });
    vi.useFakeTimers();
    socket.bufferedAmount = 256 * 1024;
    const write = handle.stdin.write("hello");
    const rejectedWrite = expect(write).rejects.toThrow(/connection is closed/);
    await vi.advanceTimersByTimeAsync(10);
    socket.serverClose(1006);
    await expect(handle).rejects.toThrow(/closed before/);
    await vi.advanceTimersByTimeAsync(10);
    await rejectedWrite;
  });

  it("stops pending stdin writes on abort before the remote process exits", async () => {
    const controller = new AbortController();
    const { handle, socket } = await execSocket("cat", {
      stdin: true,
      signal: controller.signal,
    });
    vi.useFakeTimers();
    socket.bufferedAmount = 256 * 1024;
    const write = expect(handle.stdin.write("hello")).rejects.toThrow(/no longer writable/);
    const end = expect(handle.stdin.end()).rejects.toThrow(/no longer writable/);
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    socket.bufferedAmount = 0;
    await vi.advanceTimersByTimeAsync(10);
    await Promise.all([write, end]);
    expect(socket.sentStdin).toHaveLength(0);
    expect(socket.readyState).toBe(1);
    socket.serverExit(-1);
    await expect(handle).rejects.toBe(controller.signal.reason);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects stalled stdin writes and subsequent EOF without hanging", async () => {
    const { handle, socket } = await execSocket("cat", { stdin: true });
    vi.useFakeTimers();
    socket.bufferedAmount = 256 * 1024;
    const write = expect(handle.stdin.write("hello")).rejects.toThrow(/stalled/);
    const end = expect(handle.stdin.end()).rejects.toThrow(/stalled/);
    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.all([write, end]);
    expect(socket.sentStdin).toHaveLength(0);
    socket.serverExit(0);
    await handle;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("streams every byte but caps captured output without splitting UTF-8", async () => {
    const chunks: string[] = [];
    const { handle, socket } = await execSocket("agent", {
      maxOutputBytes: 5,
      onStdout: chunk => chunks.push(chunk),
    });
    const bytes = new TextEncoder().encode("a🌍b🌍");
    socket.serverStdout(bytes.subarray(0, 3));
    socket.serverStdout(bytes.subarray(3));
    socket.serverStderr("123456");
    socket.serverExit(0);
    await expect(handle).resolves.toMatchObject({ stdout: "a🌍", stderr: "12345", truncated: true });
    expect(chunks.join("")).toBe("a🌍b🌍");

    const partial = await execSocket("agent", { maxOutputBytes: 3 });
    partial.socket.serverStdout("a🌍b");
    partial.socket.serverExit(0);
    await expect(partial.handle).resolves.toMatchObject({ stdout: "a", truncated: true });
  });

  it("does not retain callback-only output", async () => {
    const onStdout = vi.fn();
    const { handle, socket } = await execSocket("agent", { captureOutput: false, onStdout });
    socket.serverStdout("all the output");
    socket.serverStderr("diagnostics");
    socket.serverExit(0);
    await expect(handle).resolves.toMatchObject({ stdout: "", stderr: "", truncated: false });
    expect(onStdout).toHaveBeenCalledWith("all the output");
  });

  it("bounds capture by default and flushes the decoder on exit", async () => {
    const { handle, socket } = await execSocket("agent");
    socket.serverStdout("x".repeat(8 * 1024 * 1024 + 1));
    socket.serverStderr(new Uint8Array([0xe2]));
    socket.serverExit(0);
    const result = await handle;
    expect(result.stdout.length).toBe(8 * 1024 * 1024);
    expect(result.stderr).toBe("\uFFFD");
    expect(result.truncated).toBe(true);
  });

  it("sends ephemeral mode and refuses to advertise a reattachable session", async () => {
    const { handle, socket } = await execSocket("find .", { ephemeral: true });
    expect(socket.sentText.find(f => f.type === "init_exec")?.data).toMatchObject({ ephemeral: true });
    await expect(handle.sessionName).rejects.toThrow(/Ephemeral/);
    await expect(handle.detach()).rejects.toThrow(/Ephemeral/);
    expect(socket.readyState).toBe(1);
    socket.serverExit(0);
    await handle;
  });

  it("rejects a pre-aborted exec without minting a token or opening a socket", async () => {
    const { sandbox, ws, mock } = await wsSandbox();
    const reason = new Error("cancelled");
    const handle = sandbox.exec("agent", { signal: AbortSignal.abort(reason), stdin: true });
    await expect(handle).rejects.toBe(reason);
    await expect(handle.stdin.write("hello")).rejects.toThrow();
    expect(ws.sockets).toHaveLength(0);
    expect(mock.calls).toHaveLength(1);
  });

  it("cancels a pending WebSocket handshake without sending init_exec", async () => {
    const ws = createExecWsMock({ manualOpen: true });
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } }, shellToken("jwt"),
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const controller = new AbortController();
    const handle = sandbox.exec("agent", { signal: controller.signal });
    await tick();
    expect(ws.sockets).toHaveLength(1);
    controller.abort();
    await expect(handle).rejects.toBe(controller.signal.reason);
    ws.sockets[0]!.serverOpen();
    expect(ws.sockets[0]!.sentText).toHaveLength(0);
    expect(ws.sockets[0]!.readyState).toBe(3);
  });

  it("cancels token minting and rejects queued stdin without opening a socket", async () => {
    const ws = createExecWsMock();
    const controller = new AbortController();
    const create = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);
    const fetchMock: typeof fetch = (input, init) => {
      if (!init?.signal) return create.fetch(input, init);
      expect(init.signal).toBe(controller.signal);
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
      });
    };
    const sandbox = await Sandbox.create({ ...auth, fetch: fetchMock, webSocketImpl: ws.webSocketImpl });
    const handle = sandbox.exec("agent", { signal: controller.signal, stdin: true });
    const write = handle.stdin.write("hello");
    controller.abort();
    await expect(handle).rejects.toBe(controller.signal.reason);
    await expect(write).rejects.toThrow();
    await expect(handle.sessionName).rejects.toBe(controller.signal.reason);
    expect(ws.sockets).toHaveLength(0);
  });

  it("signals rather than detaches if abort lands just after init_exec", async () => {
    const controller = new AbortController();
    const ws = createExecWsMock({ manualOpen: true, onSend: frame => {
      if (frame.type === "init_exec") controller.abort();
    } });
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } }, shellToken("jwt"),
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const handle = sandbox.exec("agent", { signal: controller.signal });
    await tick();
    const socket = ws.sockets[0]!;
    socket.serverOpen();
    await tick();
    expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "TERM" } });
    expect(socket.readyState).toBe(1);
    socket.serverExit(-1);
    await expect(handle).rejects.toBe(controller.signal.reason);
  });

  it("aborts a live process remotely and removes the listener after exit", async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const { handle, socket } = await execSocket("agent", { signal: controller.signal });
    const reason = new Error("stop");
    controller.abort(reason);
    expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "TERM" } });
    expect(socket.readyState).toBe(1);
    socket.serverExit(-1);
    await expect(handle).rejects.toBe(reason);
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(await handle.kill()).toBe(false);
  });

  it("continues streaming shutdown output and honors abort during timeout termination", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const onStdout = vi.fn();
    const { sandbox, ws } = await wsSandbox([shellToken("jwt")]);
    const handle = sandbox.exec("agent", { signal: controller.signal, timeoutSec: 1, onStdout });
    const socket = await ws.nextSocket();
    await vi.advanceTimersByTimeAsync(1_000);
    controller.abort();
    socket.serverStdout("shutting down\n");
    socket.serverExit(-1);
    await expect(handle).rejects.toBe(controller.signal.reason);
    expect(onStdout).toHaveBeenCalledWith("shutting down\n");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not signal an exited process if a decoder-flush callback fails", async () => {
    const reason = new Error("consumer failed");
    const { handle, socket } = await execSocket("agent", {
      onStdout: () => { throw reason; },
    });
    socket.serverStdout(new Uint8Array([0xe2]));
    socket.serverExit(0);
    await expect(handle).rejects.toBe(reason);
    expect(socket.sentText.some(f => f.type === "signal")).toBe(false);
  });

  it("terminates the process before surfacing a callback failure", async () => {
    const reason = new Error("consumer failed");
    const { handle, socket } = await execSocket("agent", { onStdout: () => { throw reason; } });
    socket.serverStdout("hello");
    await tick();
    expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "TERM" } });
    expect(socket.readyState).toBe(1);
    socket.serverExit(-1);
    await expect(handle).rejects.toBe(reason);
  });

  it("does not signal a detached command on later abort", async () => {
    const controller = new AbortController();
    const { handle, socket } = await execSocket("agent", { signal: controller.signal });
    socket.serverDurableSession("session");
    await handle.detach();
    await handle;
    controller.abort();
    expect(socket.sentText.some(f => f.type === "signal")).toBe(false);
    expect(await handle.kill()).toBe(false);
  });

  it("validates capture limits, deadlines, and incompatible reattach options", async () => {
    const { sandbox } = await wsSandbox();
    for (const maxOutputBytes of [-1, NaN, Infinity, 1.5]) {
      expect(() => sandbox.exec("agent", { maxOutputBytes })).toThrow(/maxOutputBytes/);
    }
    for (const timeoutSec of [-1, 0, NaN, Infinity, 3_000_000]) {
      expect(() => sandbox.exec("agent", { timeoutSec })).toThrow(/timeoutSec/);
    }
    expect(() => sandbox.exec({ sessionName: "session" }, { ephemeral: true })).toThrow(/fresh execs/);
  });

  it("surfaces the VM-assigned durable session name as sessionName", async () => {
    const { handle, socket } = await execSocket("echo hi");

    socket.serverDurableSession("sess_xyz");
    socket.serverStdout("hi\n");
    socket.serverExit(0);

    await handle;
    expect(await handle.sessionName).toBe("sess_xyz");
  });

  it("kill() sends a signal frame (default TERM) and settles on the exit", async () => {
    const { handle, socket } = await execSocket("sleep 100");

    await expect(handle.kill()).resolves.toBe(true);
    expect(socket.sentText).toContainEqual({
      type: "signal",
      data: { signal: "TERM" },
    });
    expect(socket.readyState).toBe(1); // still open — waiting for the exit frame

    // The server kills the process group; a signalled process exits -1.
    socket.serverExit(-1);
    await expect(handle).resolves.toMatchObject({ exitCode: -1 });
  });

  it("kill('KILL') sends SIGKILL", async () => {
    const { handle, socket } = await execSocket("sleep 100");

    await handle.kill("KILL");
    expect(socket.sentText).toContainEqual({
      type: "signal",
      data: { signal: "KILL" },
    });

    socket.serverExit(-1);
    await handle;
  });

  it("detach() closes the socket and resolves the durable session name", async () => {
    const { handle, socket } = await execSocket("sleep 100");

    socket.serverDurableSession("sess_detach");
    socket.serverStdout("partial\n");
    await tick();

    await expect(handle.detach()).resolves.toBe("sess_detach");
    expect(socket.readyState).toBe(3); // closed, command keeps running server-side
    await expect(handle).resolves.toMatchObject({
      stdout: "partial\n",
      exitCode: null,
    });
  });

  it("reattaches by sending the durable session id with a placeholder command", async () => {
    const { handle, socket } = await execSocket({ sessionName: "sess_xyz" });

    // Default reattach is full replay — no resume_from_last_read on the wire.
    expect(socket.sentText.find(f => f.type === "init_exec")).toEqual({
      type: "init_exec",
      data: {
        command: ":",
        durable_session_name: "sess_xyz",
      },
    });
    socket.serverDurableSession("sess_xyz");
    expect(await handle.sessionName).toBe("sess_xyz");

    socket.serverStdout("resumed\n");
    socket.serverExit(0);

    await expect(handle).resolves.toMatchObject({
      exitCode: 0,
      stdout: "resumed\n",
    });
  });

  it("sends cwd/env on the init frame", async () => {
    const { handle, socket } = await execSocket("npm test", {
      cwd: "/app",
      env: { NODE_ENV: "test" },
    });

    expect(socket.sentText.find(f => f.type === "init_exec")).toEqual({
      type: "init_exec",
      data: {
        command: "bash -lc 'npm test'",
        cwd: "/app",
        env: { NODE_ENV: "test" },
      },
    });

    socket.serverExit(0);
    await expect(handle).resolves.toMatchObject({ exitCode: 0 });
  });

  it("does not confirm a requested session name before runtime acceptance", async () => {
    const { handle, socket } = await execSocket({ sessionName: "expired" });
    const detached = expect(handle.detach()).rejects.toThrow(/durable session/);
    socket.serverClose(1011, "reattach rejected");
    await expect(handle).rejects.toThrow(/reattach rejected/);
    await detached;
  });

  it("rejects cwd/env on reattach — the command is already running", async () => {
    const { sandbox } = await wsSandbox();

    expect(() =>
      sandbox.exec({ sessionName: "sess_xyz" }, { cwd: "/app" }),
    ).toThrow(/fresh execs/);
    expect(() =>
      sandbox.exec({ sessionName: "sess_xyz" }, { env: { A: "1" } }),
    ).toThrow(/fresh execs/);
  });

  it("sends resume_from_last_read when the caller opts in", async () => {
    const { handle, socket } = await execSocket(
      { sessionName: "sess_xyz" },
      { resumeFromLastRead: true },
    );

    expect(socket.sentText.find(f => f.type === "init_exec")).toEqual({
      type: "init_exec",
      data: {
        command: ":",
        durable_session_name: "sess_xyz",
        resume_from_last_read: true,
      },
    });

    socket.serverExit(0);
    await expect(handle).resolves.toMatchObject({ exitCode: 0 });
  });

  // A close without an exit frame leaves the command outcome unknown.
  it("rejects when the socket closes without an exit frame", async () => {
    const { handle, socket } = await execSocket("echo hi");

    socket.serverClose(1006, "no such instance");

    await expect(handle).rejects.toThrow(
      /closed before the command reported an exit/i,
    );
  });

  it("carries the close code and any partial output on an interrupted exec", async () => {
    const { handle, socket } = await execSocket("long-running");

    socket.serverStdout("partial\n");
    await tick();
    socket.serverClose(1011, "instance gone");

    await expect(handle).rejects.toMatchObject({
      name: "ExecInterruptedError",
      closeCode: 1011,
      stdout: "partial\n",
    });
  });
});
