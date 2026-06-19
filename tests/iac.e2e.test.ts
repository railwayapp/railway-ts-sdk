import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { diffGraphs, project, service, StaleEnvironmentError } from "../src/index.js";
import { projectDefinitionToGraph } from "../src/iac/compiler.js";
import { runRailwayIac, type RailwayIacCurrentResponse } from "../src/iac/runner.js";
import { backboard, clientFor, liveEnabled } from "./support/iac-live.js";

/**
 * Live IaC contract tests (read-only / no-mutation): exercise the configEtag
 * handshake against real backboard. Gated on IAC_E2E_* (see support/iac-live).
 * The mutating full lifecycle lives in iac-lifecycle.e2e.test.ts.
 */
const fixture = fileURLToPath(new URL("./fixtures/iac-apply/.railway/railway.ts", import.meta.url));

describe.skipIf(!liveEnabled)("IaC live — configEtag", () => {
  it("fetches a non-empty configEtag from the real environment", async () => {
    const result = (await runRailwayIac({
      command: "current",
      file: fixture,
      backboard: backboard(),
    })) as RailwayIacCurrentResponse;

    expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(result.currentEnvironment?.configEtag).toEqual(expect.any(String));
    expect((result.currentEnvironment?.configEtag ?? "").length).toBeGreaterThan(0);
  }, 30_000);

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

    const after = (await runRailwayIac({
      command: "current",
      file: fixture,
      backboard: bb,
    })) as RailwayIacCurrentResponse;
    expect(Object.values(after.currentEnvironment?.serviceNamesById ?? {})).not.toContain(probe);
  }, 30_000);
});
