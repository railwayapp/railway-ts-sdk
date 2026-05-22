import { describe, expect, it } from "vitest";

import {
  DEFAULT_RAILWAY_GRAPHQL_ENDPOINT,
  RailwayGraphQLError,
  Sandbox,
  SandboxClient,
} from "../src/index.js";
import { createFetchMock, header, sandboxSnapshot } from "./test-helpers.js";

describe("Sandbox.Client", () => {
  it("exposes the sandbox client through the Sandbox namespace", () => {
    expect(Sandbox.Client).toBe(SandboxClient);
  });

  it("uses the production GraphQL endpoint by default", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxSnapshot() } },
    ]);
    const client = new SandboxClient({
      token: "token_123",
      projectId: "project_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    await client.create();

    expect(client.endpoint).toBe(DEFAULT_RAILWAY_GRAPHQL_ENDPOINT);
    expect(mock.calls[0]?.input).toBe(DEFAULT_RAILWAY_GRAPHQL_ENDPOINT);
  });

  it("uses endpoint overrides and bearer auth", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxSnapshot() } },
    ]);
    const client = new SandboxClient({
      token: "token_123",
      projectId: "project_123",
      environmentId: "environment_123",
      endpoint: "https://backboard.railway-develop.com/graphql/v2",
      fetch: mock.fetch,
    });

    await client.create();

    expect(mock.calls[0]?.input).toBe(
      "https://backboard.railway-develop.com/graphql/v2",
    );
    expect(header(mock.calls[0]?.init, "Authorization")).toBe(
      "Bearer token_123",
    );
    expect(header(mock.calls[0]?.init, "Content-Type")).toBe(
      "application/json",
    );
  });

  it("creates sandboxes with configured project and environment", async () => {
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxSnapshot({ name: "agent-run" }) } },
    ]);
    const client = new SandboxClient({
      token: "token_123",
      projectId: "project_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    const sandbox = await client.create({
      name: "agent-run",
      idleTimeoutMinutes: 10,
    });

    expect(sandbox.id).toBe("sandbox_123");
    expect(mock.calls[0]?.body.query).toContain("mutation RailwaySandboxCreate");
    expect(mock.calls[0]?.body.variables).toEqual({
      input: {
        projectId: "project_123",
        environmentId: "environment_123",
        name: "agent-run",
        idleTimeoutMinutes: 10,
      },
    });
  });

  it("surfaces GraphQL errors", async () => {
    const mock = createFetchMock([
      { errors: [{ message: "no access" }] },
    ]);
    const client = new SandboxClient({
      token: "token_123",
      projectId: "project_123",
      environmentId: "environment_123",
      fetch: mock.fetch,
    });

    const error = await client.create().catch(error => error);

    expect(error).toBeInstanceOf(RailwayGraphQLError);
    expect(error).toMatchObject({ message: "no access" });
  });
});
