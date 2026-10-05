import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Sandbox,
  SandboxFailedError,
  SandboxNotFoundError,
  SandboxTemplateBuildError,
  SandboxTimeoutError,
} from "../src/index.js";
import { compileSandboxTemplate } from "../src/sandbox/template.js";
import { createExecWsMock } from "./exec-ws-mock.js";
import {
  buildInfo,
  checkpointInfo,
  clearRailwayEnv,
  createFetchMock,
  manyResponses,
  sandboxInfo,
  type FetchCall,
} from "./test-helpers.js";

const auth = { token: "token_123", environmentId: "environment_123" };

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
});

async function createThenQueue(
  followup: unknown,
): Promise<{ sandbox: Sandbox; calls: FetchCall[] }> {
  const mock = createFetchMock([
    { data: { sandboxCreate: sandboxInfo() } },
    followup,
  ]);
  const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
  return { sandbox, calls: mock.calls };
}

function createWithDestroyMock(): Promise<{ sandbox: Sandbox; calls: FetchCall[] }> {
  return createThenQueue({
    data: { sandboxDestroy: sandboxInfo({ status: "DESTROYED" }) },
  });
}

function expectForkMutation(call: FetchCall | undefined): void {
  expect(call?.body.query).toContain("mutation RailwaySandboxCreate");
  expect(call?.body.variables).toEqual({
    input: { environmentId: "environment_123", sourceSandboxId: "sandbox_123" },
  });
}

/** Asserts exactly one fetch happened: a create mutation with this input. */
function expectSingleCreate(calls: FetchCall[], input: unknown): void {
  expect(calls).toHaveLength(1);
  expect(calls[0]?.body.query).toContain("mutation RailwaySandboxCreate");
  expect(calls[0]?.body.variables).toEqual({ input });
}

function silenceExpectedRejection<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {});
  return promise;
}

describe("Sandbox.create", () => {
  it("creates sandboxes in the configured environment", async () => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    const sandbox = await Sandbox.create({
      ...auth,
      idleTimeoutMinutes: 10,
      fetch: mock.fetch,
    });

    expect(sandbox.id).toBe("sandbox_123");
    expect(sandbox.status).toBe("RUNNING");
    expect(sandbox.region).toBe("us-west2");
    expect(sandbox.idleTimeoutMinutes).toBe(5);
    expect(sandbox.networkIsolation).toBe("ISOLATED");
    expect(sandbox.domains).toEqual([]);
    expect(sandbox.createdAt).toBe("2026-05-13T00:00:00.000Z");
    expect(sandbox.toJSON()).toEqual(sandboxInfo());
    expect(mock.calls[0]?.body.query).toContain("mutation RailwaySandboxCreate");
    expect(mock.calls[0]?.body.variables).toEqual({
      input: { environmentId: "environment_123", idleTimeoutMinutes: 10 },
    });
  });

  it("passes networkIsolation into the create input and reads it back", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo({ networkIsolation: "PRIVATE" }) } },
    ]);

    const sandbox = await Sandbox.create({
      ...auth,
      networkIsolation: "PRIVATE",
      fetch: mock.fetch,
    });

    expect(sandbox.networkIsolation).toBe("PRIVATE");
    expect(mock.calls[0]?.body.variables).toEqual({
      input: { environmentId: "environment_123", networkIsolation: "PRIVATE" },
    });
  });

  it("passes domains into the create input as publicDomains and reads them back", async () => {
    const domains = [
      { prefix: "web", port: 8080, domain: "web-xxx.up.railway.app" },
      { prefix: "api", port: 3000, domain: "api-xxx.up.railway.app" },
    ];
    const mock = createFetchMock([
      {
        data: {
          sandboxCreate: sandboxInfo({
            networkIsolation: "PRIVATE",
            domains,
          }),
        },
      },
    ]);

    const sandbox = await Sandbox.create({
      ...auth,
      networkIsolation: "PRIVATE",
      domains: [{ port: 8080 }, { prefix: "api", port: 3000 }],
      fetch: mock.fetch,
    });

    expect(sandbox.domains).toEqual(domains);
    expect(mock.calls[0]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        networkIsolation: "PRIVATE",
        publicDomains: [{ port: 8080 }, { prefix: "api", port: 3000 }],
      },
    });
  });

  it("passes region into the create input and reads it back", async () => {
    const mock = createFetchMock([
      {
        data: {
          sandboxCreate: sandboxInfo({ region: "us-east4-eqdc4a" }),
        },
      },
    ]);

    const sandbox = await Sandbox.create({
      ...auth,
      region: "us-east4-eqdc4a",
      fetch: mock.fetch,
    });

    expect(sandbox.region).toBe("us-east4-eqdc4a");
    expect(mock.calls[0]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        region: "us-east4-eqdc4a",
      },
    });
  });

  it("passes env (incl. Railway references) into the create input verbatim", async () => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create({
      ...auth,
      env: { NODE_ENV: "production", API_KEY: "${{shared.API_KEY}}" },
      fetch: mock.fetch,
    });

    expect(mock.calls[0]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        variables: { NODE_ENV: "production", API_KEY: "${{shared.API_KEY}}" },
      },
    });
  });
});

describe("sandbox instance", () => {
  it("execs commands", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { generateShellToken: "jwt_abc" } },
    ]);

    const sandbox = await Sandbox.create({
      ...auth,
      fetch: mock.fetch,
      webSocketImpl: ws.webSocketImpl,
    });
    const handle = sandbox.exec("pwd");
    const socket = await ws.nextSocket();
    await new Promise(resolve => setTimeout(resolve, 0));

    socket.serverStdout("/\n");
    socket.serverExit(0);

    const result = await handle;
    expect(result.stdout).toBe("/\n");
    expect(mock.calls[1]?.body.query).toContain(
      "mutation RailwayGenerateShellToken",
    );
    expect(socket.sentText.find(f => f.type === "init_exec")).toEqual({
      type: "init_exec",
      data: { command: "bash -lc 'pwd'" },
    });
  });

  it("destroys and resolves void", async () => {
    const { sandbox, calls } = await createWithDestroyMock();

    await expect(sandbox.destroy()).resolves.toBeUndefined();
    expect(calls[1]?.body.query).toContain("mutation RailwaySandboxDestroy");
    expect(calls[1]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
    });
  });

  it("destroys via Symbol.asyncDispose", async () => {
    const { sandbox, calls } = await createWithDestroyMock();

    await sandbox[Symbol.asyncDispose]();

    expect(calls[1]?.body.query).toContain("mutation RailwaySandboxDestroy");
  });

  it("refreshes status in place", async () => {
    // create resolves at RUNNING (no poll), so the next response is the refresh read.
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandbox: sandboxInfo({ status: "DESTROYING" }) } },
    ]);

    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    expect(sandbox.status).toBe("RUNNING");

    await sandbox.refresh();

    expect(sandbox.status).toBe("DESTROYING");
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[1]?.body.query).toContain("query RailwaySandbox");
    expect(mock.calls[1]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
    });
  });

  it("heartbeats the scoped sandbox and updates the handle", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxHeartbeat: sandboxInfo({ idleTimeoutMinutes: 30 }) } },
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    await expect(sandbox.heartbeat()).resolves.toBe(sandbox);
    expect(sandbox.idleTimeoutMinutes).toBe(30);
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxHeartbeat");
    expect(mock.calls[1]?.body.variables).toEqual({ id: sandbox.id, environmentId: "environment_123" });
  });

  it("reports a missing sandbox on heartbeat without changing the handle", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxHeartbeat: null } },
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    await expect(sandbox.heartbeat()).rejects.toBeInstanceOf(SandboxNotFoundError);
    expect(sandbox.status).toBe("RUNNING");
  });
});

describe("sandbox compute, sessions, and HTTPS run", () => {
  it("sends resources and a never-idle timeout on create and fork", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxCreate: sandboxInfo({ id: "sandbox_fork" }) } },
    ]);
    const sandbox = await Sandbox.create({
      ...auth,
      fetch: mock.fetch,
      idleTimeoutMinutes: 0,
      resources: { cpu: 0.5, memoryGB: 2 },
    });
    await sandbox.fork({ resources: { memoryGB: 4 } });
    expect(mock.calls[0]?.body.variables).toMatchObject({
      input: { idleTimeoutMinutes: 0, resources: { cpu: 0.5, memoryGB: 2 } },
    });
    expect(mock.calls[1]?.body.variables).toMatchObject({
      input: { sourceSandboxId: "sandbox_123", resources: { memoryGB: 4 } },
    });
    expect((mock.calls[1]?.body.variables as { input: { resources: object } }).input.resources).not.toHaveProperty("cpu");
  });

  it.each([{ cpu: 0 }, { cpu: -1 }, { memoryGB: Number.NaN }, { memoryGB: Number.POSITIVE_INFINITY }])(
    "rejects resources %o before creating anything",
    async resources => {
      const mock = createFetchMock([]);
      await expect(Sandbox.create({ ...auth, fetch: mock.fetch, resources })).rejects.toThrow(TypeError);
      expect(mock.calls).toHaveLength(0);
    },
  );

  it("lists sessions and maps run state", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      {
        data: {
          sandboxSessions: {
            edges: [
              { node: { name: "quick-otter-1ab", kind: "EXEC", runState: { running: true, exitCode: 0, exitedAt: null }, attached: false, command: "npm test", foregroundActive: null, createdAt: "2026-10-05T18:00:00Z" } },
              { node: { name: "calm-heron-9cd", kind: "SHELL", runState: { running: false, exitCode: 130, exitedAt: "2026-10-05T18:05:00Z" }, attached: false, command: "", foregroundActive: null, createdAt: null } },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    await expect(sandbox.sessions()).resolves.toEqual([
      { name: "quick-otter-1ab", kind: "EXEC", running: true, exitCode: null, exitedAt: null, attached: false, command: "npm test", foregroundActive: null, createdAt: "2026-10-05T18:00:00Z" },
      { name: "calm-heron-9cd", kind: "SHELL", running: false, exitCode: 130, exitedAt: "2026-10-05T18:05:00Z", attached: false, command: "", foregroundActive: null, createdAt: null },
    ]);
    expect(mock.calls[1]?.body.query).toContain("query RailwaySandboxSessions");
    expect(mock.calls[1]?.body.variables).toEqual({ id: "sandbox_123", environmentId: "environment_123" });
  });

  it("follows session pages to the end", async () => {
    const node = (name: string) => ({ node: { name, kind: "EXEC", runState: { running: true, exitCode: 0, exitedAt: null }, attached: true, command: "x", foregroundActive: null, createdAt: null } });
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxSessions: { edges: [node("a")], pageInfo: { hasNextPage: true, endCursor: "c1" } } } },
      { data: { sandboxSessions: { edges: [node("b")], pageInfo: { hasNextPage: false, endCursor: "c2" } } } },
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    const sessions = await sandbox.sessions();
    expect(sessions?.map(s => s.name)).toEqual(["a", "b"]);
    expect(mock.calls[1]?.body.variables).not.toHaveProperty("after");
    expect(mock.calls[2]?.body.variables).toMatchObject({ after: "c1" });
  });

  it("returns null when the sandbox cannot report sessions", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxSessions: null } },
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    await expect(sandbox.sessions()).resolves.toBeNull();
  });

  it("runs a command over one HTTPS request", async () => {
    const result = { exitCode: 7, stdout: "out", stderr: "err", truncated: false, timedOut: false };
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxExec: result } },
    ]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    await expect(sandbox.execHttp("make test", { timeoutSec: 30 })).resolves.toEqual(result);
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxExec");
    expect(mock.calls[1]?.body.variables).toEqual({
      id: "sandbox_123", environmentId: "environment_123", command: "make test", timeoutSec: 30,
    });
  });

  it.each([0, -5, 1.5])("rejects run timeoutSec %s without a request", async timeoutSec => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);
    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    await expect(sandbox.execHttp("true", { timeoutSec })).rejects.toThrow(TypeError);
    expect(mock.calls).toHaveLength(1);
  });
});

describe("Sandbox.connect", () => {
  it("reattaches to an existing sandbox by id", async () => {
    const mock = createFetchMock([{ data: { sandbox: sandboxInfo() } }]);

    const sandbox = await Sandbox.connect("sandbox_123", {
      ...auth,
      fetch: mock.fetch,
    });

    expect(sandbox.id).toBe("sandbox_123");
    expect(mock.calls[0]?.body.query).toContain("query RailwaySandbox");
    expect(mock.calls[0]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
    });
  });

  it("throws SandboxNotFoundError when the sandbox is missing", async () => {
    const mock = createFetchMock([{ data: { sandbox: null } }]);

    const error = await Sandbox.connect("missing", {
      ...auth,
      fetch: mock.fetch,
    }).catch(error => error);

    expect(error).toBeInstanceOf(SandboxNotFoundError);
    expect(error).toMatchObject({
      id: "missing",
      environmentId: "environment_123",
    });
  });
});

describe("Sandbox.list", () => {
  it("returns sandboxes in the environment", async () => {
    const mock = createFetchMock([
      {
        data: {
          sandboxes: {
            edges: [
              { node: sandboxInfo({ id: "a" }) },
              { node: sandboxInfo({ id: "b" }) },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    ]);

    const sandboxes = await Sandbox.list({ ...auth, first: 50, fetch: mock.fetch });

    expect(sandboxes.map(sandbox => sandbox.id)).toEqual(["a", "b"]);
    expect(mock.calls[0]?.body.query).toContain("query RailwaySandboxes");
    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
      first: 50,
    });
  });
});

describe("Sandbox.create readiness", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("polls until the sandbox is RUNNING", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo({ status: "CREATING" }) } },
      { data: { sandbox: sandboxInfo({ status: "CREATING" }) } },
      { data: { sandbox: sandboxInfo({ status: "RUNNING" }) } },
    ]);

    const promise = Sandbox.create({ ...auth, fetch: mock.fetch });
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    const sandbox = await promise;

    expect(sandbox.status).toBe("RUNNING");
    expect(mock.calls).toHaveLength(3);
    expect(mock.calls[0]?.body.query).toContain("mutation RailwaySandboxCreate");
    expect(mock.calls[1]?.body.query).toContain("query RailwaySandbox");
    expect(mock.calls[2]?.body.query).toContain("query RailwaySandbox");
  });

  it("throws SandboxFailedError on a terminal state", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo({ status: "CREATING" }) } },
      { data: { sandbox: sandboxInfo({ status: "FAILED" }) } },
    ]);

    const promise = silenceExpectedRejection(
      Sandbox.create({ ...auth, fetch: mock.fetch }),
    );
    await vi.advanceTimersByTimeAsync(5 * 60_000);

    await expect(promise).rejects.toBeInstanceOf(SandboxFailedError);
  });

  it("throws SandboxTimeoutError after the readiness timeout", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo({ status: "CREATING" }) } },
      ...manyResponses(200, { data: { sandbox: sandboxInfo({ status: "CREATING" }) } }),
    ]);

    const promise = silenceExpectedRejection(
      Sandbox.create({ ...auth, fetch: mock.fetch }),
    );
    await vi.advanceTimersByTimeAsync(6 * 60_000);

    await expect(promise).rejects.toBeInstanceOf(SandboxTimeoutError);
  });
});

describe("SandboxTemplate", () => {
  it("builders return new immutable instances", () => {
    const base = Sandbox.template();
    const withRun = base.run("echo hi");

    expect(withRun).not.toBe(base);
    expect(compileSandboxTemplate(base)).toEqual({ instructions: [] });
    expect(compileSandboxTemplate(withRun)).toEqual({ instructions: ["echo hi"] });
  });

  it("folds workdir into each subsequent command, keeping env as build-time variables", () => {
    const tpl = Sandbox.template()
      .withEnv({ K: "v" })
      .workdir("/app")
      .run("npm install");

    expect(compileSandboxTemplate(tpl)).toEqual({
      instructions: ["mkdir -p '/app' && cd '/app' && npm install"],
      variables: { K: "v" },
    });
  });

  it("compiles withPackages to an apt install", () => {
    expect(
      compileSandboxTemplate(Sandbox.template().withPackages("ffmpeg", "git")),
    ).toEqual({
      instructions: [
        "apt-get update && apt-get install -y --no-install-recommends ffmpeg git",
      ],
    });
  });

  it("passes env values through raw as build-time variables (no shell escaping)", () => {
    expect(
      compileSandboxTemplate(
        Sandbox.template().withEnv({ MSG: "a'b c" }).run("echo $MSG"),
      ),
    ).toEqual({ instructions: ["echo $MSG"], variables: { MSG: "a'b c" } });
  });
});

describe("SandboxTemplate.build", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves immediately when the template is already READY", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "READY" }) } },
    ]);

    const base = Sandbox.template().withPackages("ffmpeg");
    const built = await base.build({ ...auth, fetch: mock.fetch });

    expect(built).toBe(base);
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]?.body.query).toContain("mutation RailwaySandboxTemplateBuild");
    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
      input: {
        instructions: [
          "apt-get update && apt-get install -y --no-install-recommends ffmpeg",
        ],
      },
    });
  });

  it("passes withEnv through as build-time variables", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "READY" }) } },
    ]);

    await Sandbox.template()
      .withEnv({ FOO: "bar" })
      .run("echo hi")
      .build({ ...auth, fetch: mock.fetch });

    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
      input: { instructions: ["echo hi"], variables: { FOO: "bar" } },
    });
  });

  it("skips the backend build when there are no instructions", async () => {
    const mock = createFetchMock([]);

    const base = Sandbox.template().withEnv({ FOO: "bar" });
    const built = await base.build({ ...auth, fetch: mock.fetch });

    expect(built).toBe(base);
    expect(mock.calls).toHaveLength(0);
  });

  it("polls a template build until READY", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "BUILDING" }) } },
      { data: { sandboxTemplateBuild:buildInfo({ status: "BUILDING" }) } },
      { data: { sandboxTemplateBuild:buildInfo({ status: "READY" }) } },
    ]);

    const promise = Sandbox.template()
      .run("echo hi")
      .build({ ...auth, fetch: mock.fetch });
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await promise;

    expect(mock.calls).toHaveLength(3);
    expect(mock.calls[1]?.body.query).toContain("query RailwaySandboxTemplateBuildStatus");
    expect(mock.calls[2]?.body.query).toContain("query RailwaySandboxTemplateBuildStatus");
  });

  it("throws SandboxTemplateBuildError on FAILED", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "BUILDING" }) } },
      { data: { sandboxTemplateBuild:buildInfo({ status: "FAILED" }) } },
    ]);

    const promise = silenceExpectedRejection(
      Sandbox.template().run("false").build({ ...auth, fetch: mock.fetch }),
    );
    await vi.advanceTimersByTimeAsync(5 * 60_000);

    await expect(promise).rejects.toBeInstanceOf(SandboxTemplateBuildError);
  });

  it("throws SandboxTimeoutError after the readiness timeout", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "BUILDING" }) } },
      ...manyResponses(200, {
        data: { sandboxTemplateBuild: buildInfo({ status: "BUILDING" }) },
      }),
    ]);

    const promise = silenceExpectedRejection(
      Sandbox.template().run("sleep 1").build({ ...auth, fetch: mock.fetch }),
    );
    await vi.advanceTimersByTimeAsync(6 * 60_000);

    await expect(promise).rejects.toBeInstanceOf(SandboxTimeoutError);
  });
});

describe("Sandbox.create(template)", () => {
  it("builds then forks, resolving at RUNNING", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "READY" }) } },
      { data: { sandboxCreate: sandboxInfo() } },
    ]);

    const base = Sandbox.template().withPackages("ffmpeg").workdir("/app").run("true");
    const sandbox = await Sandbox.create(base, { ...auth, fetch: mock.fetch });

    expect(sandbox.status).toBe("RUNNING");
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0]?.body.query).toContain("mutation RailwaySandboxTemplateBuild");
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxCreate");
    expect(mock.calls[1]?.body.variables).toMatchObject({
      input: {
        environmentId: "environment_123",
        template: {
          instructions: [
            "apt-get update && apt-get install -y --no-install-recommends ffmpeg",
            "mkdir -p '/app' && cd '/app' && true",
          ],
        },
      },
    });
  });

  it("echoes build-time variables into both the build and the create template input", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "READY" }) } },
      { data: { sandboxCreate: sandboxInfo() } },
    ]);

    const base = Sandbox.template().withEnv({ FOO: "bar" }).run("true");
    await Sandbox.create(base, { ...auth, fetch: mock.fetch });

    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
      input: { instructions: ["true"], variables: { FOO: "bar" } },
    });
    expect(mock.calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        template: { instructions: ["true"], variables: { FOO: "bar" } },
      },
    });
  });

  it("places the sandbox created from a template in the requested region", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: buildInfo({ status: "READY" }) } },
      {
        data: {
          sandboxCreate: sandboxInfo({ region: "europe-west4-drams3a" }),
        },
      },
    ]);

    await Sandbox.create(Sandbox.template().run("true"), {
      ...auth,
      region: "europe-west4-drams3a",
      fetch: mock.fetch,
    });

    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
      input: { instructions: ["true"], region: "europe-west4-drams3a" },
    });
    expect(mock.calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        template: { instructions: ["true"] },
        region: "europe-west4-drams3a",
      },
    });
  });

  it("skips the build for an env-only template, creating directly", async () => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    const base = Sandbox.template().withEnv({ FOO: "bar" });
    const sandbox = await Sandbox.create(base, { ...auth, fetch: mock.fetch });

    expect(sandbox.status).toBe("RUNNING");
    // Build-time env with no build steps has no effect and isn't sent.
    expectSingleCreate(mock.calls, { environmentId: "environment_123" });
  });
});

describe("Sandbox.create(name)", () => {
  it("boots from a saved checkpoint without a build step", async () => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    const sandbox = await Sandbox.create("my-checkpoint", {
      ...auth,
      fetch: mock.fetch,
    });

    expect(sandbox.status).toBe("RUNNING");
    expectSingleCreate(mock.calls, {
      environmentId: "environment_123",
      template: { name: "my-checkpoint" },
    });
  });

  it("threads creation knobs alongside the checkpoint name", async () => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create("my-checkpoint", {
      ...auth,
      idleTimeoutMinutes: 10,
      region: "asia-southeast1-eqsg3a",
      env: { FOO: "bar" },
      fetch: mock.fetch,
    });

    expect(mock.calls[0]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        template: { name: "my-checkpoint" },
        idleTimeoutMinutes: 10,
        region: "asia-southeast1-eqsg3a",
        variables: { FOO: "bar" },
      },
    });
  });

  it("rejects an empty or whitespace name without calling the API", async () => {
    const mock = createFetchMock([]);

    await expect(
      Sandbox.create("  ", { ...auth, fetch: mock.fetch }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(mock.calls).toHaveLength(0);
  });
});

describe("sandbox.checkpoint", () => {
  it("captures a checkpoint with a single synchronous mutation", async () => {
    const { sandbox, calls } = await createThenQueue({
      data: { sandboxCheckpointCreate: checkpointInfo({ id: "snap", key: "snap" }) },
    });

    const checkpoint = await sandbox.checkpoint("snap");

    expect(checkpoint.key).toBe("snap");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.body.query).toContain(
      "mutation RailwaySandboxCheckpointCreate",
    );
    expect(calls[1]?.body.variables).toEqual({
      environmentId: "environment_123",
      name: "snap",
      sandboxId: "sandbox_123",
    });
  });

  it("rejects an empty name without calling the API", async () => {
    const { sandbox, calls } = await createThenQueue({});

    await expect(sandbox.checkpoint(" ")).rejects.toBeInstanceOf(TypeError);
    expect(calls).toHaveLength(1); // only the create
  });
});

describe("Sandbox.checkpoints / renameCheckpoint / deleteCheckpoint", () => {
  it("lists the environment's named checkpoints", async () => {
    const mock = createFetchMock([
      {
        data: {
          sandboxCheckpoints: [
            checkpointInfo({ id: "a", key: "a" }),
            checkpointInfo({ id: "b", key: "b" }),
          ],
        },
      },
    ]);

    const checkpoints = await Sandbox.checkpoints({ ...auth, fetch: mock.fetch });

    expect(checkpoints.map(checkpoint => checkpoint.key)).toEqual(["a", "b"]);
    expect(mock.calls[0]?.body.query).toContain("query RailwaySandboxCheckpoints");
    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
    });
  });

  it("renames a checkpoint and returns the updated info", async () => {
    const mock = createFetchMock([
      { data: { sandboxCheckpointRename: checkpointInfo({ id: "fresh", key: "fresh" }) } },
    ]);

    const renamed = await Sandbox.renameCheckpoint("stale", "fresh", {
      ...auth,
      fetch: mock.fetch,
    });

    expect(renamed.key).toBe("fresh");
    expect(mock.calls[0]?.body.query).toContain(
      "mutation RailwaySandboxCheckpointRename",
    );
    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
      id: "stale",
      name: "fresh",
    });
  });

  it("rejects renaming to an empty name without calling the API", async () => {
    const mock = createFetchMock([]);

    await expect(
      Sandbox.renameCheckpoint("stale", " ", { ...auth, fetch: mock.fetch }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(mock.calls).toHaveLength(0);
  });

  it("deletes a checkpoint by id and resolves void", async () => {
    const mock = createFetchMock([{ data: { sandboxCheckpointDelete: true } }]);

    await expect(
      Sandbox.deleteCheckpoint("checkpoint_123", { ...auth, fetch: mock.fetch }),
    ).resolves.toBeUndefined();
    expect(mock.calls[0]?.body.query).toContain(
      "mutation RailwaySandboxCheckpointDelete",
    );
    expect(mock.calls[0]?.body.variables).toEqual({
      environmentId: "environment_123",
      id: "checkpoint_123",
    });
  });
});

const forkResponse = { data: { sandboxCreate: sandboxInfo({ id: "forked_123" }) } };

describe("sandbox.fork", () => {
  it("forks a running sandbox via the create mutation", async () => {
    const { sandbox, calls } = await createThenQueue(forkResponse);
    const forked = await sandbox.fork();

    expect(forked.id).toBe("forked_123");
    expect(forked).not.toBe(sandbox);
    expectForkMutation(calls[1]);
  });

  it("passes idleTimeoutMinutes into the fork input", async () => {
    const { sandbox, calls } = await createThenQueue(forkResponse);
    await sandbox.fork({ idleTimeoutMinutes: 15 });

    expect(calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        sourceSandboxId: "sandbox_123",
        idleTimeoutMinutes: 15,
      },
    });
  });

  it("passes networkIsolation into the fork input", async () => {
    const { sandbox, calls } = await createThenQueue(forkResponse);
    await sandbox.fork({ networkIsolation: "PRIVATE" });

    expect(calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        sourceSandboxId: "sandbox_123",
        networkIsolation: "PRIVATE",
      },
    });
  });

  it("passes domains into the fork input as publicDomains", async () => {
    const { sandbox, calls } = await createThenQueue(forkResponse);
    await sandbox.fork({
      networkIsolation: "PRIVATE",
      domains: [{ port: 8080 }, { prefix: "api", port: 3000 }],
    });

    expect(calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        sourceSandboxId: "sandbox_123",
        networkIsolation: "PRIVATE",
        publicDomains: [{ port: 8080 }, { prefix: "api", port: 3000 }],
      },
    });
  });

  it("passes env into the fork input as runtime variables", async () => {
    const { sandbox, calls } = await createThenQueue(forkResponse);
    await sandbox.fork({ env: { FOO: "bar" } });

    expect(calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        sourceSandboxId: "sandbox_123",
        variables: { FOO: "bar" },
      },
    });
  });

  it("places a fork in the requested region", async () => {
    const { sandbox, calls } = await createThenQueue(forkResponse);
    await sandbox.fork({ region: "us-east4-eqdc4a" });

    expect(calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        sourceSandboxId: "sandbox_123",
        region: "us-east4-eqdc4a",
      },
    });
  });

  it("delegates Sandbox.create(source) to fork, reusing the source engine", async () => {
    // No fetch on the create(source) call: it must reuse the source's engine.
    const { sandbox: source, calls } = await createThenQueue(forkResponse);
    const forked = await Sandbox.create(source);

    expect(forked.id).toBe("forked_123");
    expectForkMutation(calls[1]);
  });

  it("passes region through Sandbox.create(source, options)", async () => {
    const { sandbox: source, calls } = await createThenQueue(forkResponse);
    await Sandbox.create(source, { region: "europe-west4-drams3a" });

    expect(calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        sourceSandboxId: "sandbox_123",
        region: "europe-west4-drams3a",
      },
    });
  });
});

describe("sandbox.fork readiness", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("polls until the fork is RUNNING", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxCreate: sandboxInfo({ id: "forked_123", status: "CREATING" }) } },
      { data: { sandbox: sandboxInfo({ id: "forked_123", status: "CREATING" }) } },
      { data: { sandbox: sandboxInfo({ id: "forked_123", status: "RUNNING" }) } },
    ]);

    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    const promise = sandbox.fork();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    const forked = await promise;

    expect(forked.id).toBe("forked_123");
    expect(forked.status).toBe("RUNNING");
    expect(mock.calls).toHaveLength(4);
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxCreate");
    expect(mock.calls[2]?.body.query).toContain("query RailwaySandbox");
    expect(mock.calls[2]?.body.variables).toEqual({
      id: "forked_123",
      environmentId: "environment_123",
    });
  });
});
