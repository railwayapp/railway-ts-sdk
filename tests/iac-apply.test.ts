import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RailwayGraphQLError, StaleEnvironmentError } from "../src/index.js";
import { IacClient } from "../src/iac/client.js";
import type { RailwayChangeSet } from "../src/iac/change-set.js";
import { runRailwayIac } from "../src/iac/runner.js";
import { createFetchMock } from "./test-helpers.js";

const changeSet: RailwayChangeSet = { version: 1, changes: [], diagnostics: [] };

const applyOk = {
  data: {
    environmentApplyChangeSet: {
      id: "op_1",
      status: "applied",
      changes: [],
      diagnostics: [],
      deploymentId: null,
      stagedPatchId: null,
    },
  },
};

const client = (fetch: typeof globalThis.fetch) => new IacClient({ token: "t", fetch });
const variablesOf = (call: { body: { variables?: unknown } } | undefined) =>
  (call?.body.variables ?? {}) as Record<string, unknown>;

describe("IaC apply — configEtag handshake", () => {
  it("sends baseConfigEtag when a base etag is provided", async () => {
    const mock = createFetchMock([applyOk]);

    await client(mock.fetch).applyChangeSet({ environmentId: "e1", changeSet, baseEtag: "etag-xyz" });

    expect(variablesOf(mock.calls[0]).baseConfigEtag).toBe("etag-xyz");
  });

  it("omits baseConfigEtag when no base etag is provided (backward compatible)", async () => {
    const mock = createFetchMock([applyOk]);

    await client(mock.fetch).applyChangeSet({ environmentId: "e1", changeSet });

    expect(variablesOf(mock.calls[0]).baseConfigEtag).toBeUndefined();
  });

  it("maps a STALE_ENVIRONMENT_BASE rejection to StaleEnvironmentError", async () => {
    const mock = createFetchMock([
      { errors: [{ message: "stale", extensions: { code: "STALE_ENVIRONMENT_BASE" } }] },
    ]);

    await expect(
      client(mock.fetch).applyChangeSet({ environmentId: "e1", changeSet, baseEtag: "old" }),
    ).rejects.toBeInstanceOf(StaleEnvironmentError);
  });

  it("rethrows unrelated GraphQL errors unchanged", async () => {
    const mock = createFetchMock([
      { errors: [{ message: "boom", extensions: { code: "INTERNAL_SERVER_ERROR" } }] },
    ]);

    const promise = client(mock.fetch).applyChangeSet({ environmentId: "e1", changeSet, baseEtag: "old" });
    await expect(promise).rejects.toBeInstanceOf(RailwayGraphQLError);
    await expect(promise).rejects.not.toBeInstanceOf(StaleEnvironmentError);
  });

  it("surfaces configEtag from the current environment", async () => {
    const mock = createFetchMock([
      { data: { environment: { id: "e1", name: "production", projectId: "p1", config: {}, configEtag: "etag-abc" } } },
      { data: { project: { name: "proj" } } },
      { data: { project: { services: { edges: [] } } } },
      { data: { project: { volumes: { edges: [] } } } },
      { data: { project: { buckets: { edges: [] } } } },
    ]);

    const current = await client(mock.fetch).getCurrentEnvironment("e1");

    expect(current.configEtag).toBe("etag-abc");
  });
});

describe("IaC runner — threads configEtag from plan into apply", () => {
  afterEach(() => vi.unstubAllGlobals());

  const fixture = fileURLToPath(new URL("./fixtures/iac-apply/.railway/railway.ts", import.meta.url));

  it("captures configEtag during plan and sends it as baseConfigEtag on apply", async () => {
    // Ordered responses for: env config, project name, services, volumes, buckets, preview, apply.
    const mock = createFetchMock([
      { data: { environment: { id: "e1", name: "production", projectId: "p1", config: {}, configEtag: "etag-LIVE" } } },
      { data: { project: { name: "e2e-thread" } } },
      { data: { project: { services: { edges: [] } } } },
      { data: { project: { volumes: { edges: [] } } } },
      { data: { project: { buckets: { edges: [] } } } },
      { data: { environmentPreviewChangeSet: { changeSet: { version: 1, changes: [{ kind: "resource.create", address: "service.web", resource: { address: "service.web", type: "service", name: "web" }, path: "resources.service.web", summary: "Create service web", severity: "safe", deployEffect: "deploy" }], diagnostics: [] }, diagnostics: [], effects: [] } } },
      { data: { environmentApplyChangeSet: { id: "op_1", status: "applied", changes: [], diagnostics: [], deploymentId: "deploy_1", stagedPatchId: null } } },
      { data: { workflowStatus: { status: "Complete", error: null } } },
    ]);
    vi.stubGlobal("fetch", mock.fetch);

    const result = await runRailwayIac({
      command: "apply",
      file: fixture,
      backboard: { token: "t", environmentId: "e1" },
    });

    expect(result.ok).toBe(true);
    expect(result.command).toBe("apply");

    const applyCall = mock.calls.find(call => call.body.query.includes("environmentApplyChangeSet"));
    expect(applyCall, "expected an environmentApplyChangeSet request").toBeDefined();
    expect((applyCall?.body.variables as Record<string, unknown>).baseConfigEtag).toBe("etag-LIVE");
  });

  // environmentApplyChangeSet returns "applied" per change as soon as the patch is
  // staged. When the async commit is then rejected, the apply must not report ✓.
  it("reports a rejected commit workflow as a failed apply", async () => {
    const mock = createFetchMock([
      { data: { environment: { id: "e1", name: "production", projectId: "p1", config: {}, configEtag: "etag-LIVE" } } },
      { data: { project: { name: "e2e-thread" } } },
      { data: { project: { services: { edges: [] } } } },
      { data: { project: { volumes: { edges: [] } } } },
      { data: { project: { buckets: { edges: [] } } } },
      { data: { environmentPreviewChangeSet: { changeSet: { version: 1, changes: [{ kind: "resource.create", address: "service.web", resource: { address: "service.web", type: "service", name: "web" }, path: "resources.service.web", summary: "Create service web", severity: "safe", deployEffect: "deploy" }], diagnostics: [] }, diagnostics: [], effects: [] } } },
      { data: { environmentApplyChangeSet: { id: "op_1", status: "applied", changes: [], diagnostics: [], deploymentId: "deploy_1", stagedPatchId: "patch_1" } } },
      { data: { workflowStatus: { status: "Error", error: "Max size of 5000 MB on current plan." } } },
    ]);
    vi.stubGlobal("fetch", mock.fetch);

    const result = await runRailwayIac({
      command: "apply",
      file: fixture,
      backboard: { token: "t", environmentId: "e1" },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        path: "apply.workflow",
        message: expect.stringContaining("Max size of 5000 MB on current plan."),
      }),
    );
  });
});

describe("IaC apply — commit workflow verification", () => {
  it("polls while the workflow is Running and resolves on a terminal state", async () => {
    const mock = createFetchMock([
      { data: { workflowStatus: { status: "Running", error: null } } },
      { data: { workflowStatus: { status: "Running", error: null } } },
      { data: { workflowStatus: { status: "Complete", error: null } } },
    ]);

    const result = await client(mock.fetch).waitForWorkflow("wf_1", { intervalMs: 0, sleep: async () => {} });

    expect(result).toEqual({ status: "Complete", error: null });
    expect(mock.calls).toHaveLength(3);
  });

  it("gives up with a Running result once the timeout elapses", async () => {
    const mock = createFetchMock(Array.from({ length: 5 }, () => ({ data: { workflowStatus: { status: "Running", error: null } } })));
    let clock = 0;

    const result = await client(mock.fetch).waitForWorkflow("wf_1", {
      timeoutMs: 10,
      intervalMs: 0,
      now: () => (clock += 20),
      sleep: async () => {},
    });

    expect(result.status).toBe("Running");
    expect(result.error).toContain("Timed out");
  });
});

describe("IaC apply — bucket creation targets the environment", () => {
  // A bucket created with environmentId: null is a project-level row that never
  // deploys, never appears in `railway bucket list`, and holds the name forever.
  it("creates graph buckets in the target environment", async () => {
    const mock = createFetchMock([
      { data: { project: { services: { edges: [] } } } },
      { data: { project: { buckets: { edges: [] } } } },
      { data: { bucketCreate: { id: "b1", name: "uploads" } } },
    ]);

    await client(mock.fetch).ensureGraphResources({
      projectId: "p1",
      environmentId: "e1",
      graph: {
        version: 1,
        project: { name: "app" },
        environments: [],
        resources: [{ address: "bucket.uploads", type: "bucket", name: "uploads" }],
        edges: [],
      } as never,
    });

    const createCall = mock.calls.find(call => call.body.query.includes("bucketCreate"));
    expect(createCall, "expected a bucketCreate request").toBeDefined();
    expect((variablesOf(createCall).input as Record<string, unknown>)).toMatchObject({
      projectId: "p1",
      environmentId: "e1",
      name: "uploads",
    });
  });
});
