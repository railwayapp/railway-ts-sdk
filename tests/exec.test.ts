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

async function wsSandbox(responses: unknown[] = []) {
  const ws = createExecWsMock();
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
) {
  const { sandbox, ws, mock } = await wsSandbox(responses);
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
    expect(socket.sentText[0]).toEqual({
      type: "init_exec",
      data: { command: "echo hi" },
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

  it("interrupts and reports timedOut when timeoutSec elapses", async () => {
    vi.useFakeTimers();
    const { sandbox, ws } = await wsSandbox([shellToken("jwt_abc")]);
    const handle = sandbox.exec("sleep 100", { timeoutSec: 1 });
    const socket = await ws.nextSocket();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1_000);

    // The socket was closed (the exec session is torn down server-side).
    expect(socket.readyState).toBe(3);
    await expect(handle).resolves.toMatchObject({ timedOut: true, exitCode: null });
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
    expect(socket.sentText[0]).toEqual({
      type: "init_exec",
      data: {
        command: ":",
        durable_session_name: "sess_xyz",
      },
    });
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

    expect(socket.sentText[0]).toEqual({
      type: "init_exec",
      data: { command: "npm test", cwd: "/app", env: { NODE_ENV: "test" } },
    });

    socket.serverExit(0);
    await expect(handle).resolves.toMatchObject({ exitCode: 0 });
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

  it("keeps stdin open with stdin: true and frames writes onto the wire", async () => {
    const { handle, socket } = await execSocket("cat", { stdin: true });

    // Interactive stdin requested — no up-front EOF.
    expect(socket.sentText.some(f => f.type === "stdin_close")).toBe(false);

    await handle.stdin.write("hello\n");
    await handle.stdin.write(new TextEncoder().encode("bytes too\n"));
    expect(socket.sentStdin.map(b => new TextDecoder().decode(b))).toEqual([
      "hello\n",
      "bytes too\n",
    ]);

    await handle.stdin.end();
    expect(socket.sentText.some(f => f.type === "stdin_close")).toBe(true);

    socket.serverStdout("hello\nbytes too\n");
    socket.serverExit(0);
    await expect(handle).resolves.toMatchObject({ exitCode: 0 });
  });

  it("delivers stdin writes issued before the socket opens", async () => {
    const { sandbox, ws } = await wsSandbox([shellToken("jwt_abc")]);
    const handle = sandbox.exec("cat", { stdin: true });
    // Write immediately — the token mint / connect hasn't finished yet.
    const write = handle.stdin.write("early\n");

    const socket = await ws.nextSocket();
    await tick();
    await write;

    expect(socket.sentStdin.map(b => new TextDecoder().decode(b))).toEqual([
      "early\n",
    ]);
    socket.serverExit(0);
    await handle;
  });

  it("rejects stdin.write once the exec has settled", async () => {
    const { handle, socket } = await execSocket("cat", { stdin: true });

    socket.serverExit(0);
    await handle;

    await expect(handle.stdin.write("late\n")).rejects.toThrow(/closed/);
  });

  it("rejects stdin.write when stdin was not requested", async () => {
    const { handle, socket } = await execSocket("echo hi");

    await expect(handle.stdin.write("nope\n")).rejects.toThrow(/stdin: true/);

    socket.serverExit(0);
    await handle;
  });

  it("supports stdin on reattach — writes reach the running session", async () => {
    const { handle, socket } = await execSocket(
      { sessionName: "sess_xyz" },
      { stdin: true },
    );

    expect(socket.sentText.some(f => f.type === "stdin_close")).toBe(false);
    await handle.stdin.write("after reattach\n");
    expect(socket.sentStdin.map(b => new TextDecoder().decode(b))).toEqual([
      "after reattach\n",
    ]);

    socket.serverExit(0);
    await expect(handle).resolves.toMatchObject({ exitCode: 0 });
  });

  it("sends resume_from_last_read when the caller opts in", async () => {
    const { handle, socket } = await execSocket(
      { sessionName: "sess_xyz" },
      { resumeFromLastRead: true },
    );

    expect(socket.sentText[0]).toEqual({
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
});
