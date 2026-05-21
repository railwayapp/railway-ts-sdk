import { describe, expect, it } from "vitest";

import { RailwaySandboxes } from "../src/index.js";
import { createFetchMock, sandboxSnapshot } from "./test-helpers.js";

describe("Sandbox handle", () => {
  it("execs commands through the root client", async () => {
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
    const client = new RailwaySandboxes({
      token: "token_123",
      projectId: "project_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    const sandbox = await client.create();
    const result = await sandbox.exec("pwd", { timeoutSec: 30 });

    expect(result.stdout).toBe("/\n");
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxExec");
    expect(mock.calls[1]?.body.variables).toEqual({
      id: "sandbox_123",
      command: "pwd",
      timeoutSec: 30,
    });
  });

  it("deletes sandboxes through the root client", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxSnapshot() } },
      {
        data: {
          sandboxDestroy: sandboxSnapshot({ status: "DESTROYED" }),
        },
      },
    ]);
    const client = new RailwaySandboxes({
      token: "token_123",
      projectId: "project_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    const sandbox = await client.create();
    const destroyed = await sandbox.delete();

    expect(destroyed.status).toBe("DESTROYED");
    expect(mock.calls[1]?.body.query).toContain("mutation RailwaySandboxDestroy");
    expect(mock.calls[1]?.body.variables).toEqual({ id: "sandbox_123" });
  });
});
