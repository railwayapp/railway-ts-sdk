import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sandbox, SandboxNotFoundError } from "../src/index.js";
import {
  clearRailwayEnv,
  createFetchMock,
  sandboxInfo,
  type FetchCall,
} from "./test-helpers.js";

const auth = { token: "token_123", environmentId: "environment_123" };

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
});

async function createWithDestroyMock(): Promise<{
  sandbox: Sandbox;
  calls: FetchCall[];
}> {
  const mock = createFetchMock([
    { data: { sandboxCreate: sandboxInfo() } },
    { data: { sandboxDestroy: sandboxInfo({ status: "DESTROYED" }) } },
  ]);
  const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
  return { sandbox, calls: mock.calls };
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
    expect(sandbox.createdAt).toBe("2026-05-13T00:00:00.000Z");
    expect(sandbox.toJSON()).toEqual(sandboxInfo());
    expect(mock.calls[0]?.body.query).toContain("mutation RailwaySandboxCreate");
    expect(mock.calls[0]?.body.variables).toEqual({
      input: { environmentId: "environment_123", idleTimeoutMinutes: 10 },
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
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo({ status: "CREATING" }) } },
      { data: { sandbox: sandboxInfo({ status: "RUNNING" }) } },
    ]);

    const sandbox = await Sandbox.create({ ...auth, fetch: mock.fetch });
    expect(sandbox.status).toBe("CREATING");

    await sandbox.refresh();

    expect(sandbox.status).toBe("RUNNING");
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
