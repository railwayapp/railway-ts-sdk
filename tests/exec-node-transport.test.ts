import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RailwayRateLimitError, Sandbox } from "../src/index.js";
import { clearRailwayEnv, createFetchMock, sandboxInfo } from "./test-helpers.js";
import { startExecWsServer, type ExecWsServer } from "./exec-ws-server.js";

const auth = { token: "token_123", environmentId: "environment_123" };
const fixture = fileURLToPath(new URL("./fixtures/exec-then-idle.ts", import.meta.url));
const shellToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300 })).toString("base64url");
  return { data: { generateShellToken: `eyJhbGciOiJFUzI1NiJ9.${payload}.sig` } };
};

let server: ExecWsServer | undefined;
beforeEach(clearRailwayEnv);
afterEach(async () => {
  vi.unstubAllEnvs();
  await server?.close();
  server = undefined;
});

/** Runs the fixture and reports when it printed "done" and when it exited. */
async function runChild(endpoint: string, pool: string, commands: string[]) {
  const started = Date.now();
  const child = spawn(process.execPath, ["--import", "tsx", fixture, endpoint, pool, ...commands], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let doneAt: number | undefined;
  child.stdout.on("data", chunk => {
    stdout += chunk;
    if (doneAt === undefined && stdout.includes("done\n")) doneAt = Date.now();
  });
  child.stderr.on("data", chunk => (stderr += chunk));
  const killer = setTimeout(() => child.kill("SIGKILL"), 15_000);
  const [code, signal] = await once(child, "exit");
  clearTimeout(killer);
  const exitedAt = Date.now();
  return {
    code,
    signal,
    stdout,
    stderr,
    lines: stdout.trim().split("\n"),
    elapsedMs: exitedAt - started,
    idleMs: doneAt === undefined ? undefined : exitedAt - doneAt,
  };
}

describe("exec socket pool on Node.js sockets", () => {
  it("lets the process exit while a pooled socket sits idle", async () => {
    server = await startExecWsServer();
    const run = await runChild(server.endpoint, "{}", ["echo one"]);
    expect(run.lines, run.stderr).toEqual([JSON.stringify({ exitCode: 0, stdout: "ran 1\n" }), "done"]);
    expect(run).toMatchObject({ code: 0, signal: null });
    expect(run.idleMs).toBeLessThan(2_000);
    expect(server.hellos).toEqual([{ type: "exec_hello", data: { reuse: true, pipeline: true } }]);
  }, 20_000);

  it("keeps the process alive while an exec runs, including on a reused socket", async () => {
    server = await startExecWsServer({ exitDelaysMs: [0, 1_500] });
    const run = await runChild(server.endpoint, "{}", ["echo one", "sleep"]);
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null });
    expect(run.lines).toEqual([
      JSON.stringify({ exitCode: 0, stdout: "ran 1\n" }),
      JSON.stringify({ exitCode: 0, stdout: "ran 2\n" }),
      "done",
    ]);
    expect(server.connections()).toBe(1);
    expect(run.elapsedMs).toBeGreaterThanOrEqual(1_500);
  }, 20_000);

  it("reuses one real socket and round-trips stdin and large frames", async () => {
    server = await startExecWsServer({ exitDelaysMs: [0, 500] });
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }, shellToken()]);
    const sandbox = await Sandbox.create({
      ...auth,
      fetch: mock.fetch,
      tcpProxyWsEndpoint: server.endpoint,
      execSocketPool: {},
    });
    await expect(sandbox.exec("echo one")).resolves.toMatchObject({ exitCode: 0, stdout: "ran 1\n" });

    const input = "x".repeat(100_000);
    const handle = sandbox.exec("cat", { stdin: true });
    await handle.stdin.write(input);
    await handle.stdin.end();
    const result = await handle;
    expect(result.stdout).toBe(`${input}ran 2\n`);
    expect(server.connections()).toBe(1);
  });

  it("reports a rate-limited upgrade with its Retry-After", async () => {
    server = await startExecWsServer({ refuse: { status: 429, retryAfter: "15" } });
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }, shellToken()]);
    const sandbox = await Sandbox.create({
      ...auth,
      fetch: mock.fetch,
      tcpProxyWsEndpoint: server.endpoint,
      execSocketPool: {},
    });
    const error = (await sandbox.exec("echo hi").catch(e => e)) as RailwayRateLimitError;
    expect(error).toBeInstanceOf(RailwayRateLimitError);
    expect(error.retryAfterMs).toBe(15_000);
  });
});
