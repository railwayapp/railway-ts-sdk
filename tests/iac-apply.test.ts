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

describe("IaC apply — reconcileDomains dispatches dedicated domain mutations", () => {
  const domainChange = (kind: "domain.create" | "domain.update" | "domain.delete", extra: Record<string, unknown>) =>
    ({ kind, address: "service.web", domainType: "custom", domain: "app.example.com", path: "", summary: "", severity: "safe", deployEffect: "none", ...extra }) as RailwayChangeSet["changes"][number];

  it("creates, updates, and deletes custom domains with correctly resolved ids and ports", async () => {
    const mock = createFetchMock([
      { data: { project: { services: { edges: [{ node: { id: "svc1", name: "web" } }] } } } }, // getProjectServices
      { data: { customDomainCreate: { id: "d1", domain: "app.example.com" } } },                 // create
      { data: { domains: { customDomains: [{ id: "d1", domain: "app.example.com", targetPort: 8080 }], serviceDomains: [] } } }, // records (cached after)
      { data: { customDomainUpdate: true } },                                                     // update
      { data: { customDomainDelete: true } },                                                     // delete (id from cache)
    ]);

    const results = await client(mock.fetch).reconcileDomains({
      projectId: "p1",
      environmentId: "e1",
      changes: [
        domainChange("domain.create", { targetPort: 8080 }),
        domainChange("domain.update", { before: 8080, targetPort: 3000 }),
        domainChange("domain.delete", { severity: "destructive" }),
      ],
    });

    expect(results.map(result => result.status)).toEqual(["created", "updated", "deleted"]);
    expect(variablesOf(mock.calls[1]).input).toMatchObject({ domain: "app.example.com", environmentId: "e1", projectId: "p1", serviceId: "svc1", targetPort: 8080 });
    expect(variablesOf(mock.calls[3])).toMatchObject({ environmentId: "e1", id: "d1", targetPort: 3000 });
    expect(variablesOf(mock.calls[4])).toMatchObject({ id: "d1" });
    // records fetched once (cached across update+delete on the same service)
    expect(mock.calls.length).toBe(5);
  });

  it("creates a service domain then renames it to the authored name", async () => {
    const mock = createFetchMock([
      { data: { project: { services: { edges: [{ node: { id: "svc1", name: "web" } }] } } } },     // getProjectServices
      { data: { serviceDomainCreate: { id: "sd1", domain: "random-generated.up.railway.app" } } }, // create (random name)
      { data: { serviceDomainUpdate: true } },                                                       // rename to authored
    ]);

    const results = await client(mock.fetch).reconcileDomains({
      projectId: "p1",
      environmentId: "e1",
      changes: [{ kind: "domain.create", address: "service.web", domainType: "service", domain: "app-web.up.railway.app", path: "", summary: "", severity: "safe", deployEffect: "none", targetPort: 8080 } as RailwayChangeSet["changes"][number]],
    });

    expect(results[0]).toMatchObject({ status: "created" });
    expect(variablesOf(mock.calls[1]).input).toMatchObject({ environmentId: "e1", serviceId: "svc1", targetPort: 8080 });
    expect(variablesOf(mock.calls[2]).input).toMatchObject({ environmentId: "e1", serviceId: "svc1", serviceDomainId: "sd1", domain: "app-web.up.railway.app", targetPort: 8080 });
  });

  it("skips a domain change when its service is not found", async () => {
    const mock = createFetchMock([
      { data: { project: { services: { edges: [] } } } },
    ]);

    const results = await client(mock.fetch).reconcileDomains({
      projectId: "p1",
      environmentId: "e1",
      changes: [domainChange("domain.create", { targetPort: 8080 })],
    });

    expect(results[0]).toMatchObject({ status: "skipped" });
    expect(mock.calls.length).toBe(1); // no mutation attempted
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
});
