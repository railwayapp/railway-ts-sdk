import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveTcpProxyWsEndpoint } from "../src/core/config.js";
import { ExecHandle, Sandbox } from "../src/index.js";
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

describe("exec transport: ws", () => {
  it("mints a shell-scoped token and opens /ws/exec with the command init frame", async () => {
    const { sandbox, ws, mock } = await wsSandbox([shellToken("jwt_abc")]);

    const handle = sandbox.exec("echo hi", { transport: "ws" });
    expect(handle).toBeInstanceOf(ExecHandle);
    const socket = await ws.nextSocket();
    await tick();

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

    socket.serverStdout("hi\n");
    socket.serverExit(0);

    await expect(handle).resolves.toEqual({
      exitCode: 0,
      stdout: "hi\n",
      stderr: "",
      truncated: false,
      timedOut: false,
    });
    expect(typeof (await handle.execId)).toBe("string");
  });

  it("keeps stdout and stderr separate and reports the real exit code", async () => {
    const { sandbox, ws } = await wsSandbox([shellToken("jwt_abc")]);
    const out: string[] = [];
    const err: string[] = [];
    const handle = sandbox.exec("build", {
      transport: "ws",
      onStdout: c => out.push(c),
      onStderr: c => err.push(c),
    });
    const socket = await ws.nextSocket();
    await tick();

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
    const handle = sandbox.exec("sleep 100", { transport: "ws", timeoutSec: 1 });
    const socket = await ws.nextSocket();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1_000);

    // The socket was closed (the exec session is torn down server-side).
    expect(socket.readyState).toBe(3);
    await expect(handle).resolves.toMatchObject({ timedOut: true, exitCode: null });
  });

  it("surfaces the VM-assigned durable session id as execId", async () => {
    const { sandbox, ws } = await wsSandbox([shellToken("jwt_abc")]);
    const handle = sandbox.exec("echo hi", { transport: "ws" });
    const socket = await ws.nextSocket();
    await tick();

    socket.serverDurableSession("sess_xyz");
    socket.serverStdout("hi\n");
    socket.serverExit(0);

    await handle;
    expect(await handle.execId).toBe("sess_xyz");
  });

  it("reattaches by sending the durable session id with a placeholder command", async () => {
    const { sandbox, ws } = await wsSandbox([shellToken("jwt_abc")]);
    const handle = sandbox.exec({ execId: "sess_xyz" }, { transport: "ws" });
    const socket = await ws.nextSocket();
    await tick();

    expect(socket.sentText[0]).toEqual({
      type: "init_exec",
      data: { command: ":", durable_session_id: "sess_xyz" },
    });
    expect(await handle.execId).toBe("sess_xyz");

    socket.serverStdout("resumed\n");
    socket.serverExit(0);

    await expect(handle).resolves.toMatchObject({
      exitCode: 0,
      stdout: "resumed\n",
    });
  });
});
