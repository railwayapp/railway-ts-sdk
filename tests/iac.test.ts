import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  FUNCTION_SOURCE_MAX_BYTES,
  RAILWAY_GRAPH_VERSION,
  bucket,
  createRailwayContext,
  defineRailway,
  empty,
  fn,
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
  type EdgeRules,
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

  it("accepts a typed auto-update maintenance window", () => {
    const schedule = [
      { day: 6, startHour: 2, endHour: 6 },
      { day: 0, startHour: 0, endHour: 24 },
    ];
    expect(image("nginx:latest", { autoUpdates: { type: "patch", schedule } })).toEqual({
      type: "image",
      image: "nginx:latest",
      autoUpdates: { type: "patch", schedule },
    });
    expect(() => image("nginx:latest", { autoUpdates: { type: "patch", schedule: [] } })).not.toThrow();
    expect(() => image("nginx:latest", { autoUpdates: { type: "patch", schedule: null } })).not.toThrow();
  });

  it("rejects auto-update windows outside backboard's bounds", () => {
    const bad = (window: unknown, pattern: RegExp) =>
      expect(() => image("nginx:latest", { autoUpdates: { type: "patch", schedule: [window as never] } })).toThrow(pattern);

    bad({ day: 7, startHour: 2, endHour: 6 }, /schedule\[0\]\.day must be an integer from 0/);
    bad({ day: -1, startHour: 2, endHour: 6 }, /\.day must be/);
    bad({ day: 1.5, startHour: 2, endHour: 6 }, /\.day must be/);
    bad({ day: 6, startHour: 24, endHour: 24 }, /\.startHour must be an integer UTC hour from 0 to 23/);
    bad({ day: 6, startHour: 2, endHour: 0 }, /\.endHour must be an integer UTC hour from 1 to 24/);
    bad({ day: 6, startHour: 2, endHour: 25 }, /\.endHour must be an integer UTC hour from 1 to 24/);
    bad({ day: 6, startHour: 6, endHour: 6 }, /endHour must be greater than startHour/);
    bad({ day: 6, startHour: 22, endHour: 2 }, /cannot cross midnight/);
    bad({ day: "6", startHour: 2, endHour: 6 }, /\.day must be/);
    bad({ startHour: 2, endHour: 6 }, /\.day must be/);
    bad(null, /must be an object/);
    bad("weekend", /must be an object/);

    expect(() => image("nginx:latest", { autoUpdates: { type: "patch", schedule: { day: 6 } as never } })).toThrow(
      /must be an array/,
    );
    expect(() =>
      image("nginx:latest", { autoUpdates: { type: "patch", schedule: [{ day: 6, startHour: 2, endHour: 6 }, { day: 3, startHour: 5, endHour: 4 }] } }),
    ).toThrow(/schedule\[1\]\.endHour must be greater/);
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

  it("keeps deploy.preDeployTimeoutSeconds next to the preDeploy shorthand", () => {
    const node = service("api", {
      preDeploy: "npx prisma migrate deploy",
      deploy: { preDeployTimeoutSeconds: 600 },
    });

    expect(node.deploy).toEqual({
      preDeployCommand: ["npx prisma migrate deploy"],
      preDeployTimeoutSeconds: 600,
    });
    expect(service("api", { deploy: { preDeployTimeoutSeconds: 600 } }).deploy).toEqual({
      preDeployTimeoutSeconds: 600,
    });
    expect(JSON.parse(JSON.stringify(node)).deploy.preDeployTimeoutSeconds).toBe(600);
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

  it("carries the tracing block through to the service node", () => {
    // The CLI compiles `tracing` into `services[id].tracing` and treats a
    // false or null switch as absent, so the SDK passes it through verbatim.
    expect(service("web", { tracing: { enabled: true, autoInstrumentation: true } }).tracing).toEqual({
      enabled: true,
      autoInstrumentation: true,
    });
    expect(service("web", { tracing: { enabled: false } }).tracing).toEqual({ enabled: false });
    expect(fn("worker", { tracing: { enabled: true } }).tracing).toEqual({ enabled: true });
    expect("tracing" in service("web")).toBe(false);
  });

  it("carries the cdn block through to the service node", () => {
    // The CLI compiles `cdn` into `services[id].cdn` and backboard serialises
    // only the knobs that differ from the defaults, so the SDK passes the
    // block through verbatim rather than filling defaults in.
    const cdn = { enabled: true, defaultTtlSeconds: 86400, htmlCaching: "force", staleWhileRevalidate: false, purgeOnDeploy: "all" } as const;
    expect(service("web", { cdn }).cdn).toEqual(cdn);
    expect(service("web", { cdn: { enabled: true } }).cdn).toEqual({ enabled: true });
    expect(service("web", { cdn: { enabled: false } }).cdn).toEqual({ enabled: false });
    expect(fn("worker", { cdn: { enabled: true } }).cdn).toEqual({ enabled: true });
    expect("cdn" in service("web")).toBe(false);
  });

  it("carries the edgeRules list through to the service node", () => {
    // The CLI compiles `edgeRules` into `services[id].edgeRules` and backboard
    // canonicalises the list (sorted by priority, defaults dropped), so the
    // SDK passes it through verbatim rather than normalising it.
    const edgeRules: EdgeRules = [
      {
        description: "block the scanner",
        priority: 10,
        enabled: false,
        mode: "enforce",
        if: { and: [{ attr: "http.path", op: "matches", value: "/admin/*" }, { not: { attr: "ipv4.src", op: "in", value: ["10.0.0.0/8"] } }] },
        then: { action: "block", params: { status: 403 } },
      },
      {
        priority: 0,
        if: { attr: "http.header", key: "x-canary", op: "eq", value: "1" },
        then: { action: "cache_override", params: { bypass: true } },
      },
    ];
    expect(service("web", { edgeRules }).edgeRules).toEqual(edgeRules);
    expect(fn("worker", { edgeRules }).edgeRules).toEqual(edgeRules);
    expect("edgeRules" in service("web")).toBe(false);
  });

  describe("fn()", () => {
    // Relative to this test file, the same way a config file's codeFile is
    // relative to .railway/railway.ts.
    const codeFile = "./fixtures/iac/hello-function.ts";
    const codePath = fileURLToPath(new URL(codeFile, import.meta.url));
    const code = readFileSync(codePath, "utf8");

    it("reads codeFile next to the calling file and compiles it to the function image plus a base64 start command", () => {
      // Railway stores function code as `./run.sh <base64>` on a service that
      // runs the function image; Railway decodes the same form.
      const node = fn("hello", { codeFile });

      expect(node).toMatchObject({
        address: "service.hello",
        type: "service",
        kind: "function",
        source: { type: "image", image: "ghcr.io/railwayapp/function-bun:1.4.0" },
      });
      const startCommand = node.deploy?.startCommand ?? "";
      const [cmd, payload, ...rest] = startCommand.split(" ");
      expect(cmd).toBe("./run.sh");
      expect(rest).toEqual([]);
      expect(Buffer.from(payload!, "base64").toString("utf8")).toBe(code);
      expect(code).toContain("héllo");
    });

    it("resolves a relative codeFile against the caller, not the working directory", () => {
      const cwd = process.cwd();
      process.chdir(tmpdir());
      try {
        expect(fn("hello", { codeFile }).deploy?.startCommand).toBe(fn("hello", { codeFile: codePath }).deploy?.startCommand);
      } finally {
        process.chdir(cwd);
      }
    });

    it("accepts an absolute path or a file URL", () => {
      const expected = fn("rel", { codeFile }).deploy?.startCommand;
      expect(fn("abs", { codeFile: codePath }).deploy?.startCommand).toBe(expected);
      expect(fn("url", { codeFile: new URL(codeFile, import.meta.url) }).deploy?.startCommand).toBe(expected);
    });

    it("names the resolved path when codeFile cannot be read", () => {
      expect(() => fn("missing", { codeFile: "./fixtures/iac/nope.ts" })).toThrow(
        `fn("missing"): cannot read codeFile ${fileURLToPath(new URL("./fixtures/iac/nope.ts", import.meta.url))}: ENOENT`,
      );
    });

    it("keeps the plain service shape when no codeFile or runtime is given", () => {
      const node = fn("worker", { start: "bun run worker.ts" });

      expect(node.kind).toBe("function");
      expect(node.source).toBeUndefined();
      expect(node.deploy?.startCommand).toBe("bun run worker.ts");
    });

    it("selects the runtime image and lets an explicit source pin another tag", () => {
      expect(fn("a", { runtime: "bun" }).source).toEqual({ type: "image", image: "ghcr.io/railwayapp/function-bun:1.4.0" });
      expect(fn("b", { codeFile, source: image("ghcr.io/railwayapp/function-bun:1.2.16") }).source).toEqual({
        type: "image",
        image: "ghcr.io/railwayapp/function-bun:1.2.16",
      });
      expect(() => fn("c", { runtime: "deno" as "bun" })).toThrow(/Unknown function runtime "deno"/);
    });

    it("rejects a start command next to codeFile", () => {
      expect(() => fn("a", { codeFile, start: "bun run index.ts" })).toThrow(/"codeFile" sets the start command/);
      expect(() => fn("b", { codeFile, deploy: { startCommand: "bun run index.ts" } })).toThrow(/"codeFile" sets the start command/);
      expect(() => fn("c", { codeFile, run: { command: "bun run index.ts" } })).toThrow(/"codeFile" sets the start command/);
    });

    it("enforces the API's source limit on the file's UTF-8 bytes", () => {
      // The start command is one argv entry capped at 128 KiB including the
      // NUL; after the `./run.sh ` prefix the base64 fits 32765 groups of
      // three bytes. The API derives the same 98295 and rejects larger code.
      expect(FUNCTION_SOURCE_MAX_BYTES).toBe(98295);
      const dir = mkdtempSync(join(tmpdir(), "railway-fn-"));
      try {
        const write = (file: string, content: string) => {
          const path = join(dir, file);
          writeFileSync(path, content);
          return path;
        };
        const max = fn("max", { codeFile: write("max.ts", "x".repeat(FUNCTION_SOURCE_MAX_BYTES)) });
        expect(Buffer.byteLength(max.deploy?.startCommand ?? "")).toBeLessThanOrEqual(128 * 1024 - 1);
        expect(() => fn("over", { codeFile: write("over.ts", "x".repeat(FUNCTION_SOURCE_MAX_BYTES + 1)) })).toThrow(
          "Function source code is 98296 bytes; the limit is 98295 bytes",
        );
        // "é" is one character but two bytes.
        expect(() => fn("utf8", { codeFile: write("utf8.ts", "é".repeat(49148)) })).toThrow(
          "Function source code is 98296 bytes; the limit is 98295 bytes",
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("still exposes typed env references", () => {
      const api = fn("api", { codeFile, env: { SECRET: preserve() } });

      expect(api.env.SECRET).toEqual({ type: "reference", resource: "service.api", output: "SECRET" });
      expect(api.variables).toEqual({ SECRET: { type: "preserve" } });
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
