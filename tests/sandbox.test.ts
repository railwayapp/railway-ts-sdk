import { describe, expect, it } from "vitest";

import { Sandbox } from "../src/index.js";
import { createFetchMock, sandboxSnapshot } from "./test-helpers.js";

describe("SandboxInstance", () => {
  it("execs commands from the sandbox instance", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxSnapshot() } },
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
    const client = new Sandbox({
      token: "token_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    const sandbox = await client.create();
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

  it("deletes sandboxes from the sandbox instance", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxSnapshot() } },
      {
        data: {
          sandboxDestroy: sandboxSnapshot({ status: "DESTROYED" }),
        },
      },
    ]);
    const client = new Sandbox({
      token: "token_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    const sandbox = await client.create();
    const destroyed = await sandbox.delete();

    expect(destroyed?.status).toBe("DESTROYED");
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxDestroy");
    expect(mock.calls[1]?.body.variables).toEqual({
      id: "sandbox_123",
      environmentId: "environment_123",
    });
  });

  it("returns null when delete returns no sandbox", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxSnapshot() } },
      { data: { sandboxDestroy: null } },
    ]);
    const client = new Sandbox({
      token: "token_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    const sandbox = await client.create();

    await expect(sandbox.delete()).resolves.toBeNull();
  });
});
