import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_RAILWAY_GRAPHQL_ENDPOINT,
  RailwayAuthError,
  RailwayConnectionError,
  RailwayGraphQLError,
  Sandbox,
  type CreateOptions,
} from "../src/index.js";
import {
  clearRailwayEnv,
  createFetchMock,
  header,
  sandboxInfo,
  type FetchCall,
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
    expect(error).toMatchObject({
      variable: "RAILWAY_TOKEN (project token) or RAILWAY_API_TOKEN",
    });
    expect(mock.calls).toHaveLength(0);
  });

  it("prefers RAILWAY_TOKEN (project token) over RAILWAY_API_TOKEN", async () => {
    vi.stubEnv("RAILWAY_TOKEN", "project_token_value");
    vi.stubEnv("RAILWAY_API_TOKEN", "api_token_value");
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "env_environment");
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create({ fetch: mock.fetch });

    expect(header(mock.calls[0]?.init, "project-access-token")).toBe(
      "project_token_value",
    );
    expect(header(mock.calls[0]?.init, "Authorization")).toBeNull();
  });

  it("keeps bearer auth for explicit tokens and RAILWAY_API_TOKEN", async () => {
    vi.stubEnv("RAILWAY_API_TOKEN", "api_token_value");
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "env_environment");
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create({ fetch: mock.fetch });

    expect(header(mock.calls[0]?.init, "Authorization")).toBe(
      "Bearer api_token_value",
    );
  });

  it("lets an explicit authType override the RAILWAY_TOKEN default", async () => {
    vi.stubEnv("RAILWAY_TOKEN", "some_token");
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "env_environment");
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);

    await Sandbox.create({ authType: "bearer", fetch: mock.fetch });

    expect(header(mock.calls[0]?.init, "Authorization")).toBe(
      "Bearer some_token",
    );
  });

  it("throws RailwayAuthError when the environment id is missing for a bearer token", async () => {
    const mock = createFetchMock([]);

    const error = await Sandbox.create({
      token: "t",
      fetch: mock.fetch,
    }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayAuthError);
    expect(error).toMatchObject({ variable: "RAILWAY_ENVIRONMENT_ID" });
    expect(error.message).toContain("Could not resolve the sandbox environment");
    expect(error.message).toContain("set RAILWAY_TOKEN to a Railway project token");
    expect(error.message).toContain('authType: "project-token"');
    expect(error.message).toContain("RAILWAY_ENVIRONMENT_ID");
    expect(mock.calls).toHaveLength(0);
  });

  it("does not infer the environment from RAILWAY_API_TOKEN", async () => {
    vi.stubEnv("RAILWAY_API_TOKEN", "api_token_value");
    const mock = createFetchMock([]);

    const error = await Sandbox.list({ fetch: mock.fetch }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayAuthError);
    expect(error.message).toContain("Account and workspace tokens span environments");
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

describe("environment from a project token", () => {
  // The scope cache is module-level and keyed by token, so each test uses its
  // own token to stay independent.
  let tokenCounter = 0;
  const uniqueToken = () => `project_token_${++tokenCounter}_${Date.now()}`;

  const scopeResponse = (environmentId = "token_environment") => ({
    data: { projectToken: { projectId: "token_project", environmentId } },
  });
  const createResponse = () => ({ data: { sandboxCreate: sandboxInfo() } });
  const isScopeLookup = (call: FetchCall | undefined) =>
    call?.body.query.includes("query RailwayProjectToken") ?? false;

  /** Answers scope lookups and creates by query, so call order doesn't matter. */
  function routingFetch(scope: () => unknown = () => scopeResponse()) {
    const calls: FetchCall[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const body = JSON.parse(String(init?.body)) as FetchCall["body"];
      const call: FetchCall = { input, init, rawBody: init?.body, body };
      calls.push(call);
      const response = isScopeLookup(call) ? scope() : createResponse();
      if (response instanceof Response) return response;
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    return { fetch: fetchImpl, calls };
  }

  it("looks up the environment for RAILWAY_TOKEN when none is set", async () => {
    const token = uniqueToken();
    vi.stubEnv("RAILWAY_TOKEN", token);
    const mock = createFetchMock([scopeResponse(), createResponse()]);

    await Sandbox.create({ fetch: mock.fetch });

    expect(mock.calls).toHaveLength(2);
    expect(isScopeLookup(mock.calls[0])).toBe(true);
    expect(mock.calls[0]?.body.query).toContain("environmentId");
    expect(header(mock.calls[0]?.init, "project-access-token")).toBe(token);
    expect(header(mock.calls[0]?.init, "Authorization")).toBeNull();
    expect(mock.calls[1]?.body.variables).toMatchObject({
      input: { environmentId: "token_environment" },
    });
  });

  it("looks up the environment for an explicit project token", async () => {
    const token = uniqueToken();
    const mock = createFetchMock([scopeResponse("explicit_token_env"), createResponse()]);

    await Sandbox.create({ token, authType: "project-token", fetch: mock.fetch });

    expect(header(mock.calls[0]?.init, "project-access-token")).toBe(token);
    expect(mock.calls[1]?.body.variables).toMatchObject({
      input: { environmentId: "explicit_token_env" },
    });
  });

  it("prefers RAILWAY_ENVIRONMENT_ID over the project token lookup", async () => {
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "env_environment");
    const mock = createFetchMock([createResponse()]);

    await Sandbox.create({ fetch: mock.fetch });

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]?.body.variables).toMatchObject({
      input: { environmentId: "env_environment" },
    });
  });

  it("prefers an explicit environmentId over RAILWAY_ENVIRONMENT_ID and the lookup", async () => {
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "env_environment");
    const mock = createFetchMock([createResponse()]);

    await Sandbox.create({ environmentId: "explicit_environment", fetch: mock.fetch });

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]?.body.variables).toMatchObject({
      input: { environmentId: "explicit_environment" },
    });
  });

  it("caches the lookup per token across calls", async () => {
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    const mock = routingFetch();

    await Sandbox.create({ fetch: mock.fetch });
    await Sandbox.create({ fetch: mock.fetch });

    expect(mock.calls.filter(isScopeLookup)).toHaveLength(1);
    expect(mock.calls).toHaveLength(3);

    // A different token has its own scope.
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    await Sandbox.create({ fetch: mock.fetch });
    expect(mock.calls.filter(isScopeLookup)).toHaveLength(2);
  });

  it("makes one lookup for concurrent first calls", async () => {
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    const mock = routingFetch();

    const sandboxes = await Promise.all([
      Sandbox.create({ fetch: mock.fetch }),
      Sandbox.create({ fetch: mock.fetch }),
      Sandbox.create({ fetch: mock.fetch }),
    ]);

    expect(sandboxes).toHaveLength(3);
    expect(mock.calls.filter(isScopeLookup)).toHaveLength(1);
    for (const call of mock.calls.filter(call => !isScopeLookup(call))) {
      expect(call.body.variables).toMatchObject({
        input: { environmentId: "token_environment" },
      });
    }
  });

  it("names the cause when Railway rejects the token, and retries next time", async () => {
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    let rejected = true;
    const mock = routingFetch(() =>
      rejected ? { errors: [{ message: "Project Token not found" }] } : scopeResponse(),
    );

    const error = await Sandbox.create({ fetch: mock.fetch }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayAuthError);
    expect(error).toMatchObject({ variable: "RAILWAY_ENVIRONMENT_ID" });
    expect(error.message).toContain(
      "Could not resolve the sandbox environment from the project token",
    );
    expect(error.message).toContain("Project Token not found");
    expect(error.cause).toBeInstanceOf(RailwayGraphQLError);
    expect(mock.calls).toHaveLength(1);

    // Failures are not cached.
    rejected = false;
    await Sandbox.create({ fetch: mock.fetch });
    expect(mock.calls.filter(isScopeLookup)).toHaveLength(2);
  });

  it("names the cause when the lookup request fails", async () => {
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    const networkError = new TypeError("fetch failed");
    const failingFetch: typeof fetch = async () => {
      throw networkError;
    };

    const error = await Sandbox.list({ fetch: failingFetch }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayConnectionError);
    expect(error.message).toContain(
      "Could not resolve the sandbox environment from the project token",
    );
    expect(error.message).toContain("fetch failed");
    expect(error.message).toContain("RAILWAY_ENVIRONMENT_ID");
    expect(error.cause).toBe(networkError);
  });

  it("rejects a lookup that returns no environment", async () => {
    vi.stubEnv("RAILWAY_TOKEN", uniqueToken());
    const mock = createFetchMock([{ data: { projectToken: null } }]);

    const error = await Sandbox.create({ fetch: mock.fetch }).catch(error => error);

    expect(error).toBeInstanceOf(RailwayAuthError);
    expect(error.message).toContain("did not return an environment");
    expect(mock.calls).toHaveLength(1);
  });
});

describe("verbose logging", () => {
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderr = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    stderr.mockRestore();
  });

  const logged = (): string[] =>
    stderr.mock.calls.map(call => String(call[0]));

  const createSandbox = (overrides: Partial<CreateOptions> = {}) => {
    const mock = createFetchMock([{ data: { sandboxCreate: sandboxInfo() } }]);
    return Sandbox.create({
      token: "t",
      environmentId: "e",
      fetch: mock.fetch,
      ...overrides,
    });
  };

  it("is silent by default", async () => {
    await createSandbox();

    expect(stderr).not.toHaveBeenCalled();
  });

  it("prints progress when `verbose: true`", async () => {
    await createSandbox({ verbose: true });

    const lines = logged();
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every(line => line.startsWith("[railway] "))).toBe(true);
    expect(lines).toContainEqual(
      expect.stringContaining("RailwaySandboxCreate"),
    );
  });

  it("includes the requested region in verbose create progress", async () => {
    await createSandbox({ region: "us-east4-eqdc4a", verbose: true });

    expect(logged()).toContainEqual(
      expect.stringContaining("region=us-east4-eqdc4a"),
    );
  });

  it("includes requested domains in verbose create progress", async () => {
    await createSandbox({
      networkIsolation: "PRIVATE",
      domains: [{ port: 8080 }, { prefix: "api", port: 3000 }],
      verbose: true,
    });

    expect(logged()).toContainEqual(
      expect.stringContaining("domains=[8080,api:3000]"),
    );
  });

  it("is enabled by RAILWAY_VERBOSE=1", async () => {
    vi.stubEnv("RAILWAY_VERBOSE", "1");

    await createSandbox();

    expect(stderr).toHaveBeenCalled();
  });

  it("stays off for RAILWAY_VERBOSE=0", async () => {
    vi.stubEnv("RAILWAY_VERBOSE", "0");

    await createSandbox();

    expect(stderr).not.toHaveBeenCalled();
  });

  it("never logs the token", async () => {
    await createSandbox({ token: "secret_token_value", verbose: true });

    expect(logged().some(line => line.includes("secret_token_value"))).toBe(
      false,
    );
  });
});
