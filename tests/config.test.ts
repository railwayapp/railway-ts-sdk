import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_RAILWAY_GRAPHQL_ENDPOINT,
  RailwayAuthError,
  RailwayGraphQLError,
  Sandbox,
} from "../src/index.js";
import {
  clearRailwayEnv,
  createFetchMock,
  header,
  sandboxInfo,
} from "./test-helpers.js";

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configuration", () => {
  it("uses the production GraphQL endpoint by default", async () => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create({ token: "t", environmentId: "e", fetch: mock.fetch });

    expect(mock.calls[0]?.input).toBe(DEFAULT_RAILWAY_GRAPHQL_ENDPOINT);
  });

  it("resolves credentials and endpoint from environment variables", async () => {
    vi.stubEnv("RAILWAY_API_TOKEN", "env_token");
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "env_environment");
    vi.stubEnv("RAILWAY_GRAPHQL_ENDPOINT", "https://example.test/graphql");
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create({ fetch: mock.fetch });

    expect(mock.calls[0]?.input).toBe("https://example.test/graphql");
    expect(header(mock.calls[0]?.init, "Authorization")).toBe("Bearer env_token");
    expect(mock.calls[0]?.body.variables).toMatchObject({
      input: { environmentId: "env_environment" },
    });
  });

  it("prefers explicit options over environment variables", async () => {
    vi.stubEnv("RAILWAY_API_TOKEN", "env_token");
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "env_environment");
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create({
      token: "explicit_token",
      environmentId: "explicit_environment",
      endpoint: "https://override.test/graphql",
      fetch: mock.fetch,
    });

    expect(mock.calls[0]?.input).toBe("https://override.test/graphql");
    expect(header(mock.calls[0]?.init, "Authorization")).toBe(
      "Bearer explicit_token",
    );
    expect(mock.calls[0]?.body.variables).toMatchObject({
      input: { environmentId: "explicit_environment" },
    });
  });

  it("does not require `process` to exist (browser / edge safe)", async () => {
    vi.stubGlobal("process", undefined);
    try {
      const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

      const sandbox = await Sandbox.create({
        token: "explicit_token",
        environmentId: "explicit_environment",
        fetch: mock.fetch,
      });

      expect(sandbox.id).toBe("sandbox_123");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("throws RailwayAuthError when the token is missing", async () => {
    const mock = createFetchMock([]);

    const error = await Sandbox.create({
      environmentId: "e",
      fetch: mock.fetch,
    }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayAuthError);
    expect(error).toMatchObject({ variable: "RAILWAY_API_TOKEN" });
    expect(mock.calls).toHaveLength(0);
  });

  it("throws RailwayAuthError when the environment id is missing", async () => {
    const mock = createFetchMock([]);

    const error = await Sandbox.create({
      token: "t",
      fetch: mock.fetch,
    }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayAuthError);
    expect(error).toMatchObject({ variable: "RAILWAY_ENVIRONMENT_ID" });
    expect(mock.calls).toHaveLength(0);
  });

  it("surfaces GraphQL errors", async () => {
    const mock = createFetchMock([{ errors: [{ message: "no access" }] }]);

    const error = await Sandbox.create({
      token: "t",
      environmentId: "e",
      fetch: mock.fetch,
    }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayGraphQLError);
    expect(error).toMatchObject({ message: "no access" });
  });
});
