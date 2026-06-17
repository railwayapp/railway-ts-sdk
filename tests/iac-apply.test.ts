import { describe, expect, it } from "vitest";

import { RailwayGraphQLError, StaleEnvironmentError } from "../src/index.js";
import { IacClient } from "../src/iac/client.js";
import type { RailwayChangeSet } from "../src/iac/change-set.js";
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
      { data: { project: { buckets: { edges: [] } } } },
    ]);

    const current = await client(mock.fetch).getCurrentEnvironment("e1");

    expect(current.configEtag).toBe("etag-abc");
  });
});
