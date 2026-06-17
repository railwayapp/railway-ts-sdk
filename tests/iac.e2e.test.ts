import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runRailwayIac, type RailwayIacCurrentResponse } from "../src/iac/runner.js";

/**
 * Live IaC test: runs whenever RAILWAY_API_TOKEN + RAILWAY_ENVIRONMENT_ID are set
 * (loaded from .env by `mise run test`); skips otherwise so the unit suite stays
 * offline. Read-only — it exercises the `current` path against the real backboard
 * and asserts the configEtag handshake field comes back populated. No mutations.
 */
const live = Boolean(process.env.RAILWAY_API_TOKEN) && Boolean(process.env.RAILWAY_ENVIRONMENT_ID);

const fixture = fileURLToPath(new URL("./fixtures/iac-apply/.railway/railway.ts", import.meta.url));

describe.skipIf(!live)("IaC live — configEtag", () => {
  it("fetches a non-empty configEtag from the real environment", async () => {
    const result = (await runRailwayIac({
      command: "current",
      file: fixture,
      backboard: {
        token: process.env.RAILWAY_API_TOKEN!,
        environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
        ...(process.env.RAILWAY_AUTH_TYPE === "project-token" ? { authType: "project-token" as const } : {}),
        ...(process.env.RAILWAY_GRAPHQL_ENDPOINT ? { endpoint: process.env.RAILWAY_GRAPHQL_ENDPOINT } : {}),
      },
    })) as RailwayIacCurrentResponse;

    expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(result.currentEnvironment?.configEtag).toEqual(expect.any(String));
    expect((result.currentEnvironment?.configEtag ?? "").length).toBeGreaterThan(0);
  });
});
