import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { diffGraphs, project, service, StaleEnvironmentError } from "../src/index.js";
import { IacClient } from "../src/iac/client.js";
import { projectDefinitionToGraph } from "../src/iac/compiler.js";
import { runRailwayIac, type RailwayIacCurrentResponse } from "../src/iac/runner.js";

/**
 * Live IaC tests: run whenever IAC_E2E_API_TOKEN + IAC_E2E_ENVIRONMENT_ID are set
 * (loaded from .env by `mise run test`); skip otherwise so the unit suite stays
 * offline. Safe to run unattended — read-only or rejected before any mutation.
 *
 * These use a dedicated IAC_E2E_* namespace on purpose: the RAILWAY_* names are
 * auto-injected by the platform (e.g. RAILWAY_ENVIRONMENT_ID), so a runner hosted
 * on Railway would otherwise read its own environment instead of the target.
 */
const live = Boolean(process.env.IAC_E2E_API_TOKEN) && Boolean(process.env.IAC_E2E_ENVIRONMENT_ID);

const fixture = fileURLToPath(new URL("./fixtures/iac-apply/.railway/railway.ts", import.meta.url));

const backboard = () => ({
  token: process.env.IAC_E2E_API_TOKEN!,
  environmentId: process.env.IAC_E2E_ENVIRONMENT_ID!,
  ...(process.env.IAC_E2E_AUTH_TYPE === "project-token" ? { authType: "project-token" as const } : {}),
  ...(process.env.IAC_E2E_GRAPHQL_ENDPOINT ? { endpoint: process.env.IAC_E2E_GRAPHQL_ENDPOINT } : {}),
});

const clientFor = (bb: ReturnType<typeof backboard>) =>
  new IacClient({
    token: bb.token,
    ...(bb.authType ? { authType: bb.authType } : {}),
    ...(bb.endpoint ? { graphqlEndpoint: bb.endpoint } : {}),
  });

describe.skipIf(!live)("IaC live — configEtag", () => {
  it("fetches a non-empty configEtag from the real environment", async () => {
    const result = (await runRailwayIac({
      command: "current",
      file: fixture,
      backboard: backboard(),
    })) as RailwayIacCurrentResponse;

    expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(result.currentEnvironment?.configEtag).toEqual(expect.any(String));
    expect((result.currentEnvironment?.configEtag ?? "").length).toBeGreaterThan(0);
  });

  it("rejects an apply whose base etag is stale, without mutating", async () => {
    const bb = backboard();
    const client = clientFor(bb);

    // A guaranteed-non-empty changeset (a single create). Its content is
    // irrelevant: the server's compare-and-swap runs before any side effect, so
    // a stale base etag is refused and nothing is created.
    const probe = "iac-e2e-stale-probe";
    const changeSet = diffGraphs({
      current: projectDefinitionToGraph(project("iac-e2e", { resources: [] })),
      desired: projectDefinitionToGraph(project("iac-e2e", { resources: [service(probe, {})] })),
    });
    expect(changeSet.changes.length).toBeGreaterThan(0);

    await expect(
      client.applyChangeSet({ environmentId: bb.environmentId, changeSet, baseEtag: "stale-not-the-real-etag" }),
    ).rejects.toBeInstanceOf(StaleEnvironmentError);

    // The probe must not exist — the rejection happened before any mutation.
    const after = (await runRailwayIac({
      command: "current",
      file: fixture,
      backboard: bb,
    })) as RailwayIacCurrentResponse;
    expect(Object.values(after.currentEnvironment?.serviceNamesById ?? {})).not.toContain(probe);
  });
});
