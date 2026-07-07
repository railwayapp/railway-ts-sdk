import { describe, expect, it, vi } from "vitest";

import { normalizeRailwayClientConfig } from "../src/core/config.js";
import {
  FlagsScopeError,
  RAILWAY_PROJECT_ID_ENV,
  resolveFlagsRegistryOwner,
} from "../src/flags/scope.js";

describe("resolveFlagsRegistryOwner", () => {
  it("uses an explicit workspace scope", () => {
    expect(
      resolveFlagsRegistryOwner(
        { scope: { workspaceId: "ws-1" } },
        normalizeRailwayClientConfig({ token: "token_123" }),
      ),
    ).toBe("workspace:ws-1");
  });

  it("uses an explicit project scope", () => {
    expect(
      resolveFlagsRegistryOwner(
        { scope: { projectId: "proj-1" } },
        normalizeRailwayClientConfig({ token: "token_123" }),
      ),
    ).toBe("project:proj-1");
  });

  it("uses RAILWAY_PROJECT_ID when no scope is provided", () => {
    vi.stubEnv(RAILWAY_PROJECT_ID_ENV, "proj-from-env");
    expect(
      resolveFlagsRegistryOwner({}, normalizeRailwayClientConfig({ token: "token_123" })),
    ).toBe("project:proj-from-env");
    vi.unstubAllEnvs();
  });

  it("defers to Backboard for project tokens", () => {
    vi.stubEnv(RAILWAY_PROJECT_ID_ENV, "ignored");
    expect(
      resolveFlagsRegistryOwner(
        {},
        normalizeRailwayClientConfig({ token: "token_123", authType: "project-token" }),
      ),
    ).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("throws when scope cannot be resolved", () => {
    expect(() =>
      resolveFlagsRegistryOwner({}, normalizeRailwayClientConfig({ token: "token_123" })),
    ).toThrow(FlagsScopeError);
  });
});
