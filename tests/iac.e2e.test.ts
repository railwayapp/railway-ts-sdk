import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runRailwayIac, type RailwayIacCurrentResponse } from "../src/iac/runner.js";

/**
 * Live IaC test: runs whenever IAC_E2E_API_TOKEN + IAC_E2E_ENVIRONMENT_ID are set
 * (loaded from .env by `mise run test`); skips otherwise so the unit suite stays
 * offline. Read-only — it exercises the `current` path against the real backboard
 * and asserts the configEtag handshake field comes back populated. No mutations.
 *
 * These use a dedicated IAC_E2E_* namespace on purpose: the RAILWAY_* names are
 * auto-injected by the platform (e.g. RAILWAY_ENVIRONMENT_ID), so a runner hosted
 * on Railway would otherwise read its own environment instead of the target.
 */
const live = Boolean(process.env.IAC_E2E_API_TOKEN) && Boolean(process.env.IAC_E2E_ENVIRONMENT_ID);

const fixture = fileURLToPath(new URL("./fixtures/iac-apply/.railway/railway.ts", import.meta.url));

describe.skipIf(!live)("IaC live — configEtag", () => {
  it("fetches a non-empty configEtag from the real environment", async () => {
    const result = (await runRailwayIac({
      command: "current",
      file: fixture,
      backboard: {
        token: process.env.IAC_E2E_API_TOKEN!,
        environmentId: process.env.IAC_E2E_ENVIRONMENT_ID!,
        ...(process.env.IAC_E2E_AUTH_TYPE === "project-token" ? { authType: "project-token" as const } : {}),
        ...(process.env.IAC_E2E_GRAPHQL_ENDPOINT ? { endpoint: process.env.IAC_E2E_GRAPHQL_ENDPOINT } : {}),
      },
    })) as RailwayIacCurrentResponse;

    expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(result.currentEnvironment?.configEtag).toEqual(expect.any(String));
    expect((result.currentEnvironment?.configEtag ?? "").length).toBeGreaterThan(0);
  });
});
