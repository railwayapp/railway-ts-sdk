import { describe, expect, it } from "vitest";

import { bucket, createRailwayContext, diffGraphs, graphToEnvironmentConfig, postgres, project, service } from "../src/index.js";
import { projectDefinitionToGraph } from "../src/iac/compiler.js";
import { RAILWAY_CHANGE_SET_VERSION, SUPPORTED_CHANGE_SET_VERSIONS } from "../src/iac/change-set.js";

describe("Railway IaC", () => {
  it("emits the current change-set wire version", () => {
    const current = projectDefinitionToGraph(project("app", { resources: [] }));
    const desired = projectDefinitionToGraph(project("app", { resources: [service("web", {})] }));

    expect(RAILWAY_CHANGE_SET_VERSION).toBe(1);
    expect(SUPPORTED_CHANGE_SET_VERSIONS).toContain(RAILWAY_CHANGE_SET_VERSION);
    expect(diffGraphs({ current, desired }).version).toBe(1);
  });


  it("compiles shared variable references from context", () => {
    const ctx = createRailwayContext();
    const graph = projectDefinitionToGraph(project("app", {
      resources: [service("web", { env: { API_KEY: ctx.shared.API_KEY, DASHED: ctx.shared["DASHED-KEY"] } })],
    }));

    expect(graphToEnvironmentConfig(graph).services?.web?.variables).toEqual({
      API_KEY: { value: "${{shared.API_KEY}}" },
      DASHED: { value: "${{shared.DASHED-KEY}}" },
    });
  });

  it("maps database region to service and volume placement", () => {
    const graph = projectDefinitionToGraph(project("app", {
      resources: [postgres("db", { region: "europe-west4" })],
    }));

    const config = graphToEnvironmentConfig(graph, {
      serviceIdsByName: { db: "service-id" },
      volumeIdsByServiceName: { db: "volume-id" },
      existingServiceIds: ["service-id"],
    });

    expect(config.services?.["service-id"]?.deploy?.multiRegionConfig).toEqual({
      "europe-west4": { numReplicas: 1 },
    });
    expect(config.volumes?.["volume-id"]?.region).toBe("europe-west4");
  });

  it("marks database region changes as destructive", () => {
    const current = projectDefinitionToGraph(project("app", {
      resources: [postgres("db", { region: "us-west2" })],
    }));
    const desired = projectDefinitionToGraph(project("app", {
      resources: [postgres("db", { region: "europe-west4" })],
    }));

    expect(diffGraphs({ current, desired }).changes).toMatchObject([
      {
        kind: "resource.update",
        address: "database.db",
        field: "deploy",
        severity: "destructive",
        summary: "Move database db to europe-west4",
      },
    ]);
  });

  it("typechecks known bucket regions", () => {
    expect(bucket("assets", { region: "sjc" }).config?.region).toBe("sjc");
  });
});
