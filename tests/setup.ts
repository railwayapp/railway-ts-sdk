import { beforeEach, expect, vi } from "vitest";

// Prewarming (the token by default) adds a request to every create, which
// would consume the ordered fetch/WebSocket mocks unit tests set up. Unit tests
// opt in with `prewarm`; live suites keep the default so they exercise it.
// `UNIT_PREWARM=1` runs the unit suites with the default.
beforeEach(() => {
  if (!expect.getState().testPath?.includes(".e2e.") && process.env.UNIT_PREWARM !== "1") {
    vi.stubEnv("RAILWAY_SANDBOX_PREWARM", "0");
  }
});
