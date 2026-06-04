import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Sandbox,
  SandboxFailedError,
  SandboxNotFoundError,
  SandboxTemplateBuildError,
  SandboxTimeoutError,
} from "../src/index.js";
import { compileSandboxTemplate } from "../src/sandbox/template.js";
import {
  clearRailwayEnv,
  createFetchMock,
  manyResponses,
  sandboxInfo,
  templateInfo,
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
});

describe("sandbox instance", () => {
  it("execs commands", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      {
        data: {
          sandboxExec: {
            exitCode: 0,
            stdout: "/\n",
            stderr: "",
            truncated: false,
            timedOut: false,
          },
        },
      },
    ]);

    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    const result = await sandbox.exec("pwd", { timeoutSec: 30 });

    expect(result.stdout).toBe("/\n");
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxExec");
    expect(mock.calls[1]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
      command: "pwd",
      timeoutSec: 30,
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
    expect(compileSandboxTemplate(base)).toEqual([]);
    expect(compileSandboxTemplate(withRun)).toEqual(["echo hi"]);
  });

  it("folds env + workdir into each subsequent command", () => {
    const tpl = Sandbox.template()
      .withEnv({ K: "v" })
      .workdir("/app")
      .run("npm install");

    expect(compileSandboxTemplate(tpl)).toEqual([
      "export K='v' && mkdir -p '/app' && cd '/app' && npm install",
    ]);
  });

  it("compiles withPackages to an apt install", () => {
    expect(
      compileSandboxTemplate(Sandbox.template().withPackages("ffmpeg", "git")),
    ).toEqual([
      "apt-get update && apt-get install -y --no-install-recommends ffmpeg git",
    ]);
  });

  it("escapes shell-special env values", () => {
    expect(
      compileSandboxTemplate(
        Sandbox.template().withEnv({ MSG: "a'b c" }).run("echo $MSG"),
      ),
    ).toEqual([`export MSG='a'\\''b c' && echo $MSG`]);
  });
});

describe("SandboxTemplate.build", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves immediately when the template is already READY", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: templateInfo({ status: "READY" }) } },
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

  it("polls a template build until READY", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: templateInfo({ status: "BUILDING" }) } },
      { data: { sandboxTemplate: templateInfo({ status: "BUILDING" }) } },
      { data: { sandboxTemplate: templateInfo({ status: "READY" }) } },
    ]);

    const promise = Sandbox.template()
      .run("echo hi")
      .build({ ...auth, fetch: mock.fetch });
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await promise;

    expect(mock.calls).toHaveLength(3);
    expect(mock.calls[1]?.body.query).toContain("query RailwaySandboxTemplate");
    expect(mock.calls[2]?.body.query).toContain("query RailwaySandboxTemplate");
  });

  it("throws SandboxTemplateBuildError on FAILED", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: templateInfo({ status: "BUILDING" }) } },
      { data: { sandboxTemplate: templateInfo({ status: "FAILED" }) } },
    ]);

    const promise = silenceExpectedRejection(
      Sandbox.template().run("false").build({ ...auth, fetch: mock.fetch }),
    );
    await vi.advanceTimersByTimeAsync(5 * 60_000);

    await expect(promise).rejects.toBeInstanceOf(SandboxTemplateBuildError);
  });

  it("throws SandboxTimeoutError after the readiness timeout", async () => {
    const mock = createFetchMock([
      { data: { sandboxTemplateBuild: templateInfo({ status: "BUILDING" }) } },
      ...manyResponses(200, {
        data: { sandboxTemplate: templateInfo({ status: "BUILDING" }) },
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
      { data: { sandboxTemplateBuild: templateInfo({ status: "READY" }) } },
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

  it("delegates Sandbox.create(source) to fork, reusing the source engine", async () => {
    // No fetch on the create(source) call: it must reuse the source's engine.
    const { sandbox: source, calls } = await createThenQueue(forkResponse);
    const forked = await Sandbox.create(source);

    expect(forked.id).toBe("forked_123");
    expectForkMutation(calls[1]);
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
