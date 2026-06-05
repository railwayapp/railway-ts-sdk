import {
  changeSetToEnvironmentPatch,
  diffGraphs,
  evaluateRailwayProject,
  renderChangeSet,
  renderRailwayGraphTypes,
  type EnvironmentConfig,
  type RailwayGraph,
} from "../../src/index.ts";

const file = new URL("./todo-list.ts", import.meta.url).pathname;
const desired = await evaluateRailwayProject({ file });
const current = mockCurrentGraph(desired.graph);
const currentConfig = mockCurrentConfig();
const changeSet = diffGraphs({ current, desired: desired.graph });
const patch = changeSetToEnvironmentPatch({
  currentGraph: current,
  currentConfig,
  changeSet,
  compileOptions: {
    existingServiceIds: ["api-cache", "backend"],
  },
});

section("1. authored source");
console.log("examples/iac/todo-list.ts");
console.log("TypeScript authoring stays ergonomic; evaluation is read-only.\n");

section("2. deterministic graph");
console.log(JSON.stringify({
  version: desired.graph.version,
  project: desired.graph.project,
  resources: desired.graph.resources.map(resource => ({
    address: resource.address,
    type: resource.type,
    name: resource.name,
    ...(resource.type === "database" ? { engine: resource.engine } : {}),
  })),
  edges: desired.graph.edges,
}, null, 2));

section("3. generated graph typings");
console.log(renderRailwayGraphTypes(desired.graph));

section("4. mocked current state");
console.log("Pretend Railway currently has Redis + backend, but frontend is missing and backend lacks REDIS_URL.\n");
console.log(JSON.stringify({
  resources: current.resources.map(resource => resource.address),
}, null, 2));

section("5. RailwayChangeSet");
console.log(renderChangeSet(changeSet));
console.log("\nStructured changes:");
console.log(JSON.stringify(changeSet, null, 2));

section("6. bridge to existing environment patch substrate");
console.log(JSON.stringify(patch, null, 2));

section("7. intended receiving path");
console.log(`Today:   RailwayChangeSet → EnvironmentConfig patch → environmentStageChanges
Future:  RailwayChangeSet → Backboard validation/provisioning/stage/apply`);

function mockCurrentGraph(desiredGraph: RailwayGraph): RailwayGraph {
  return {
    ...desiredGraph,
    resources: desiredGraph.resources
      .filter(resource => resource.name !== "frontend")
      .map(resource => {
        if (resource.name !== "backend" || !("variables" in resource)) return resource;
        const { REDIS_URL: _redacted, ...variables } = resource.variables ?? {};
        return { ...resource, variables };
      }),
    edges: desiredGraph.edges.filter(edge => edge.to !== "service.frontend" && edge.from !== "service.frontend"),
  };
}

function mockCurrentConfig(): EnvironmentConfig {
  return {
    services: {
      "api-cache": {
        source: { image: "redis:8" },
      },
      backend: {
        source: {
          repo: "futurepastori/todo-iac-example",
          branch: "main",
          rootDirectory: "apps/backend",
        },
        build: {
          buildCommand: "pnpm install --frozen-lockfile && pnpm --filter backend build",
        },
        deploy: {
          startCommand: "pnpm --filter backend start",
          healthcheckPath: "/health",
        },
        variables: {
          PORT: { value: "3000" },
          CORS_ORIGIN: { value: "${{frontend.RAILWAY_PUBLIC_DOMAIN}}" },
        },
      },
    },
  };
}

function section(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  console.log("─".repeat(title.length));
}
