import { describe, expect, it } from "vitest";

import {
  RAILWAY_GRAPH_VERSION,
  bucket,
  createRailwayContext,
  defineRailway,
  empty,
  github,
  group,
  image,
  indexGraph,
  postgres,
  preserve,
  project,
  ref,
  resourceAddress,
  service,
  template,
  validateGraph,
  volume,
  type RailwayGraph,
} from "../src/iac/index.js";

// The `railway/iac` module is a thin authoring layer: it builds the plain
// ProjectDefinition object the CLI evaluates (`railway config plan/apply`
// runs the file with node and reads the default export). Plan/apply/diff
// live in the CLI, not here.
describe("Railway IaC authoring", () => {
  it("builds a plain project definition the CLI evaluator can consume", async () => {
    const program = defineRailway(() =>
      project("app", {
        resources: [service("web", { start: "node server.js" })],
      }),
    );

    // Mirrors the CLI contract: default export is a function receiving a
    // context and returning a JSON-serializable definition.
    const definition = await program(createRailwayContext(), project);

    expect(definition.name).toBe("app");
    expect(JSON.parse(JSON.stringify(definition))).toMatchObject({
      name: "app",
      resources: [
        {
          address: "service.web",
          type: "service",
          kind: "empty",
          name: "web",
          deploy: { startCommand: "node server.js" },
        },
      ],
    });
  });

  it("flattens nested resource arrays in project()", () => {
    const definition = project("app", {
      resources: [[service("a"), service("b")], service("c")],
    });

    expect((definition.resources ?? []).flat().map(resource => resource.name)).toEqual(["a", "b", "c"]);
  });

  it("normalizes sources", () => {
    expect(github("railwayapp/starters").repo).toBe("railwayapp/starters");
    expect(github("railwayapp/starters").branch).toBe("main");
    expect(image("nginx:1.27")).toEqual({ type: "image", image: "nginx:1.27" });
    expect(template("postgres")).toEqual({ type: "template", template: "postgres" });
    expect(empty()).toEqual({ type: "empty" });

    const node = service("web", { source: github("railwayapp/starters", { branch: "next" }) });
    expect(node.kind).toBe("github");
    expect(node.source).toMatchObject({ type: "github", repo: "railwayapp/starters", branch: "next" });
  });

  it("rejects image auto-updates outside Docker Hub and GHCR", () => {
    expect(() => image("nginx", { autoUpdates: { type: "patch" } })).not.toThrow();
    expect(() => image("ghcr.io/acme/api", { autoUpdates: { type: "patch" } })).not.toThrow();
    expect(() => image("quay.io/acme/api", { autoUpdates: { type: "patch" } })).toThrow(
      /only supported for Docker Hub and GHCR/,
    );
  });

  it("normalizes variables to typed values", () => {
    const db = postgres("postgres");
    const node = service("web", {
      env: {
        LITERAL: "value",
        DATABASE_URL: db.env.DATABASE_URL,
        KEPT: preserve(),
      },
    });

    expect(node.variables).toEqual({
      LITERAL: { type: "literal", value: "value" },
      DATABASE_URL: { type: "reference", resource: "database.postgres", output: "DATABASE_URL" },
      KEPT: { type: "preserve" },
    });
    expect(ref(db, "PGHOST")).toEqual({
      type: "reference",
      resource: "database.postgres",
      output: "PGHOST",
    });
  });

  it("resolves shared variables from the context", () => {
    const ctx = createRailwayContext({ environment: "production" });

    expect(ctx.shared.API_KEY).toEqual({ type: "sharedReference", name: "API_KEY" });
    expect(ctx.isEnvironment("production")).toBe(true);
    expect(ctx.randomString("seed")).toBe(ctx.randomString("seed"));
  });

  it("normalizes replicas, regions, domains, and TCP proxies", () => {
    const node = service("web", {
      replicas: 2,
      domains: ["api.example.com", { domain: "app.example.com", port: 3000 }],
      tcp: [5432],
    });

    expect(node.deploy).toEqual({ numReplicas: 2 });
    expect(node.networking).toEqual({
      customDomains: {
        "api.example.com": { port: 8080 },
        "app.example.com": { port: 3000 },
      },
      tcpProxies: { "5432": {} },
    });

    const regional = service("worker", { regions: { "us-west2": 1, "eu-west1": { count: 2 } } });
    expect(regional.deploy).toEqual({
      multiRegionConfig: {
        "us-west2": { numReplicas: 1 },
        "eu-west1": { numReplicas: 2 },
      },
    });
  });

  it("builds database nodes with engine defaults", () => {
    const db = postgres("db", { region: "eu-west1" });

    expect(db).toMatchObject({
      address: "database.db",
      type: "database",
      engine: "postgres",
      output: "DATABASE_URL",
      defaultMountPath: "/var/lib/postgresql/data",
      deploy: { multiRegionConfig: { "eu-west1": { numReplicas: 1 } } },
    });
  });

  it("turns volume mounts into attachments", () => {
    const data = volume("web-data", { region: "us-west2", sizeMB: 1024 });
    const node = service("web", { volumeMounts: { "/data": data } });

    expect(node.volumeAttachments).toEqual({
      "web-data": {
        volume: "volume.web-data",
        mountPath: "/data",
        volumeConfig: { region: "us-west2", sizeMB: 1024 },
      },
    });
    expect(bucket("uploads", { region: "sjc" })).toEqual({
      address: "bucket.uploads",
      type: "bucket",
      name: "uploads",
      config: { region: "sjc" },
    });
  });

  it("stamps grouped resources with the group id", () => {
    const resources = group("storage", [volume("data"), bucket("uploads")]);

    expect(resources).toMatchObject([
      { address: "group.storage", type: "group" },
      { address: "volume.data", groupId: "storage" },
      { address: "bucket.uploads", groupId: "storage" },
    ]);
  });

  it("indexes and validates hand-built graphs", () => {
    const graph: RailwayGraph = {
      version: RAILWAY_GRAPH_VERSION,
      project: { name: "app" },
      environments: [],
      resources: [service("web"), volume("data")],
      edges: [{ from: "service.web", to: "volume.data", type: "mount", key: "/data" }],
    };

    expect(validateGraph(graph)).toEqual([]);
    expect(indexGraph(graph).byAddress.get(resourceAddress("service", "web"))?.name).toBe("web");

    const broken: RailwayGraph = { ...graph, edges: [{ from: "service.web", to: "volume.gone", type: "mount" }] };
    expect(validateGraph(broken)).toEqual(["Edge references missing target: volume.gone"]);
  });
});
