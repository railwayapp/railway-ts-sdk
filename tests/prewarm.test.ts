import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolvePrewarm } from "../src/core/config.js";
import { RailwayGraphQLError, RailwayRateLimitError, Sandbox } from "../src/index.js";
import { PREWARM_ADOPT_TIMEOUT_MS } from "../src/sandbox/exec.js";
import { PREWARM_IDLE_CLOSE_MS } from "../src/sandbox/prewarm.js";
import { createExecWsMock } from "./exec-ws-mock.js";
import { clearRailwayEnv, createFetchMock, sandboxInfo } from "./test-helpers.js";

const auth = { token: "token_123", environmentId: "environment_123" };
const shellToken = (token: string) => ({ data: { generateShellToken: token } });
const created = (status: string) => ({ data: { sandboxCreate: sandboxInfo({ status: status as never }) } });
const polled = (status: string) => ({ data: { sandbox: sandboxInfo({ status: status as never }) } });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const NOT_RUNNING = "\r\nSandbox is not running.\r\n\r\n";
/** Settles queued microtasks without touching timers (safe under fake timers). */
const flush = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function tokenMints(mock: ReturnType<typeof createFetchMock>): number {
  return mock.calls.filter(call => call.body.query.includes("generateShellToken")).length;
}

describe("shell token reuse", () => {
  it("mints one token for consecutive execs on a sandbox", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([created("RUNNING"), shellToken("jwt_a"), shellToken("jwt_unused")]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });

    for (const command of ["one", "two"]) {
      const handle = sandbox.exec(command);
      const socket = await ws.nextSocket();
      await vi.waitFor(() => expect(socket.sentText.map(f => f.type)).toContain("init_exec"));
      socket.serverExit(0);
      await handle;
    }

    expect(tokenMints(mock)).toBe(1);
    expect(ws.sockets.map(s => s.protocols.at(-1))).toEqual(["jwt_a", "jwt_a"]);
  });
});

describe("exec prewarm", () => {
  it("opens the first exec's socket during create and adopts it", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([created("RUNNING"), shellToken("jwt_warm")]);
    const sandbox = await Sandbox.create({ ...auth, prewarm: true, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });

    const warm = await ws.nextSocket();
    await tick();
    expect(warm.sentText).toEqual([{ type: "exec_hello" }]);

    const handle = sandbox.exec("echo hi");
    await vi.waitFor(() => expect(warm.sentText.map(f => f.type)).toEqual(["exec_hello", "init_exec", "stdin_close"]));
    warm.serverStdout("hi\n");
    warm.serverExit(0);

    await expect(handle).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
    expect(ws.sockets).toHaveLength(1);
    expect(tokenMints(mock)).toBe(1);
  });

  it("mints the first exec's token during create by default, without opening a socket", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([created("CREATING"), shellToken("jwt_early"), polled("RUNNING")]);
    const sandbox = await Sandbox.create({ ...auth, prewarm: "token", fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    expect(mock.calls[1]?.body.query).toContain("generateShellToken");
    await flush();
    expect(ws.sockets).toHaveLength(0);

    const handle = sandbox.exec("true");
    const socket = await ws.nextSocket();
    expect(socket.protocols.at(-1)).toBe("jwt_early");
    await vi.waitFor(() => expect(socket.sentText.map(f => f.type)).toContain("init_exec"));
    socket.serverExit(0);
    await handle;
    expect(tokenMints(mock)).toBe(1);
  });

  it("opens the opt-in socket only once the sandbox reports RUNNING", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([created("CREATING"), shellToken("jwt_warm"), polled("CREATING"), polled("RUNNING")]);
    let opened = 0;
    const creating = Sandbox.create({ ...auth, prewarm: "socket", fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const polls = () => mock.calls.filter(call => call.body.query.includes("query RailwaySandbox(")).length;
    await vi.waitFor(() => expect(polls()).toBe(1));
    opened = ws.sockets.length;
    const sandbox = await creating;
    expect(opened).toBe(0);
    await vi.waitFor(() => expect(ws.sockets).toHaveLength(1));
    expect(sandbox.status).toBe("RUNNING");
  });

  it("closes an unused prewarmed socket after the idle window", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([created("RUNNING"), shellToken("jwt_warm")]);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const sandbox = await Sandbox.create({ ...auth, prewarm: true, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    await flush();
    const warm = ws.sockets[0]!;
    expect(warm.sentText).toEqual([{ type: "exec_hello" }]);

    vi.advanceTimersByTime(PREWARM_IDLE_CLOSE_MS - 1);
    expect(warm.readyState).toBe(1);
    vi.advanceTimersByTime(1);
    expect(warm.readyState).toBe(3);
    vi.useRealTimers();

    // The next exec connects as usual, on the cached token.
    const handle = sandbox.exec("true");
    const cold = await ws.nextSocket();
    expect(cold).not.toBe(warm);
    expect(cold.protocols.at(-1)).toBe("jwt_warm");
    await vi.waitFor(() => expect(cold.sentText.map(f => f.type)).toContain("init_exec"));
    cold.serverExit(0);
    await handle;
    expect(tokenMints(mock)).toBe(1);
  });

  it("closes the prewarmed socket with the sandbox", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([
      created("RUNNING"),
      shellToken("jwt_warm"),
      { data: { sandboxDestroy: true } },
    ]);
    const sandbox = await Sandbox.create({ ...auth, prewarm: true, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const warm = await ws.nextSocket();
    await tick();
    await sandbox.destroy();
    expect(warm.readyState).toBe(3);
    expect(warm.sentText.map(f => f.type)).not.toContain("init_exec");
  });
});

describe("exec prewarm adoption", () => {
  it("closes a still-negotiating prewarmed socket when the exec is aborted", async () => {
    const ws = createExecWsMock({ manualCapabilities: true });
    const mock = createFetchMock([created("RUNNING"), shellToken("jwt_warm")]);
    const sandbox = await Sandbox.create({ ...auth, prewarm: true, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const warm = await ws.nextSocket();
    await tick();

    const controller = new AbortController();
    const reason = new Error("caller gave up");
    const handle = sandbox.exec("true", { signal: controller.signal });
    await tick();
    controller.abort(reason);

    await expect(handle).rejects.toBe(reason);
    await vi.waitFor(() => expect(warm.readyState).toBe(3));
    expect(warm.sentText.map(f => f.type)).not.toContain("init_exec");
    expect(ws.sockets).toHaveLength(1);
  });

  it("falls back to its own connection when the prewarmed socket never negotiates", async () => {
    const ws = createExecWsMock({ manualCapabilities: true });
    const mock = createFetchMock([created("RUNNING"), shellToken("jwt_warm")]);
    const sandbox = await Sandbox.create({ ...auth, prewarm: true, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    await flush();
    const warm = ws.sockets[0]!;

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const handle = sandbox.exec("echo hi");
    await flush();
    vi.advanceTimersByTime(PREWARM_ADOPT_TIMEOUT_MS);
    await flush();
    vi.useRealTimers();

    expect(warm.readyState).toBe(3);
    expect(warm.sentText.map(f => f.type)).not.toContain("init_exec");
    await vi.waitFor(() => expect(ws.sockets).toHaveLength(2));
    const cold = ws.sockets[1]!;
    await vi.waitFor(() => expect(cold.sentText).toEqual([{ type: "exec_hello" }]));
    cold.serverFrame({ type: "exec_capabilities", data: { version: 2, stdin_chunks: 8, stdin_chunk_bytes: 16384 } });
    await vi.waitFor(() => expect(cold.sentText.map(f => f.type)).toContain("init_exec"));
    cold.serverExit(0);
    await expect(handle).resolves.toMatchObject({ exitCode: 0 });
  });

  it("fails fast with the reason when the proxy refuses both the prewarmed and the fallback socket", async () => {
    const ws = createExecWsMock({ manualCapabilities: true });
    const mock = createFetchMock([created("RUNNING"), shellToken("jwt_a")]);
    const sandbox = await Sandbox.create({ ...auth, prewarm: true, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const warm = await ws.nextSocket();
    await tick();
    const handle = sandbox.exec("true");
    warm.serverClose(4001, "Maximum SSH connections reached for this sandbox.");
    const cold = await ws.nextSocket();
    await tick();
    cold.serverClose(4001, "Maximum SSH connections reached for this sandbox.");
    const started = performance.now();
    await expect(handle).rejects.toThrow(/4001: Maximum SSH connections/);
    expect(performance.now() - started).toBeLessThan(1000);
    expect([warm, cold].flatMap(s => s.sentText.map(f => f.type))).not.toContain("init_exec");
  });

  it("still falls back to legacy mode on a proxy without exec control", async () => {
    const ws = createExecWsMock({ legacyPeer: true });
    const mock = createFetchMock([created("RUNNING"), shellToken("jwt_a"), shellToken("jwt_b")]);
    const sandbox = await Sandbox.create({ ...auth, prewarm: true, fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    await flush();

    const handle = sandbox.exec("echo hi");
    await vi.waitFor(() => expect(ws.sockets.some(s => s.sentText[0]?.type === "init_exec")).toBe(true));
    const legacy = ws.sockets.find(s => s.sentText[0]?.type === "init_exec")!;
    expect(legacy.protocols.at(-1)).toBe("jwt_b");
    legacy.serverStdout("hi\n");
    legacy.serverExit(0);
    await expect(handle).resolves.toMatchObject({ exitCode: 0, stdout: "hi\n" });
    // The prewarmed and the cold attempt were both refused before any command.
    expect(ws.sockets.filter(s => s.sentText.some(f => f.type === "init_exec"))).toEqual([legacy]);
  });
});

describe("Sandbox.create readiness polling", () => {
  it("polls through rate limits and server errors instead of losing the sandbox", async () => {
    const mock = createFetchMock([
      created("CREATING"),
      new Response(JSON.stringify({ errors: [{ message: "rate limited" }] }), { status: 429 }),
      new Response("bad gateway", { status: 502 }),
      polled("RUNNING"),
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    expect(sandbox.status).toBe("RUNNING");
  });

  it("waits out a short Retry-After, then keeps polling", async () => {
    const mock = createFetchMock([
      created("CREATING"),
      new Response(JSON.stringify({ errors: [{ message: "rate limited" }] }), { status: 429, headers: { "Retry-After": "1" } }),
      polled("RUNNING"),
    ]);
    const started = performance.now();
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    expect(sandbox.status).toBe("RUNNING");
    expect(performance.now() - started).toBeGreaterThanOrEqual(1400);
  });

  it("fails fast, naming the sandbox, when the rate limit outlasts the wait", async () => {
    const mock = createFetchMock([
      created("CREATING"),
      new Response(JSON.stringify({ errors: [{ message: "rate limited" }] }), { status: 429, headers: { "Retry-After": "1638" } }),
    ]);
    const started = performance.now();
    const error = await Sandbox.create({ ...auth, fetch: mock.fetch }).catch(e => e);
    expect(error).toBeInstanceOf(RailwayRateLimitError);
    // Still a 429 RailwayGraphQLError, as before, for existing catch blocks.
    expect(error).toBeInstanceOf(RailwayGraphQLError);
    expect(error.status).toBe(429);
    expect(error).toMatchObject({ resourceId: "sandbox_123", retryAfterMs: 1_638_000 });
    expect(String(error.message)).toContain("retry in 1638s");
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("still fails on a non-transient poll error", async () => {
    const mock = createFetchMock([
      created("CREATING"),
      new Response(JSON.stringify({ errors: [{ message: "Not Authorized" }] }), { status: 200 }),
    ]);
    await expect(Sandbox.create({ ...auth, fetch: mock.fetch })).rejects.toThrow("Not Authorized");
  });
});

describe("resolvePrewarm", () => {
  it("defaults to the token, opts into the socket, and lets the option beat RAILWAY_SANDBOX_PREWARM", () => {
    vi.stubEnv("RAILWAY_SANDBOX_PREWARM", "");
    expect(resolvePrewarm(undefined)).toBe("token");
    expect(resolvePrewarm(true)).toBe("socket");
    expect(resolvePrewarm("socket")).toBe("socket");
    expect(resolvePrewarm(false)).toBe("off");
    for (const off of ["0", "false", "NO", "off"]) {
      vi.stubEnv("RAILWAY_SANDBOX_PREWARM", off);
      expect(resolvePrewarm(undefined)).toBe("off");
      expect(resolvePrewarm("token")).toBe("token");
    }
    for (const on of ["socket", "1", "true"]) {
      vi.stubEnv("RAILWAY_SANDBOX_PREWARM", on);
      expect(resolvePrewarm(undefined)).toBe("socket");
    }
    vi.stubEnv("RAILWAY_SANDBOX_PREWARM", "token");
    expect(resolvePrewarm(undefined)).toBe("token");
    expect(resolvePrewarm(false)).toBe("off");
  });
});
