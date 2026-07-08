import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { bucket, createRailwayContext, diffGraphs, environmentConfigToGraph, evaluateRailwayFile, github, graphToEnvironmentConfig, image, postgres, project, service, volume } from "../src/index.js";
import { projectDefinitionToGraph } from "../src/iac/compiler.js";
import { changeSetToEnvironmentPatch, RAILWAY_CHANGE_SET_VERSION, SUPPORTED_CHANGE_SET_VERSIONS, renderChangeSet, type SetVariableChange } from "../src/iac/change-set.js";
import { preserve } from "../src/iac/sdk.js";

describe("Railway IaC", () => {
  it("emits the current change-set wire version", () => {
    const current = projectDefinitionToGraph(project("app", { resources: [] }));
    const desired = projectDefinitionToGraph(project("app", { resources: [service("web", {})] }));

    expect(RAILWAY_CHANGE_SET_VERSION).toBe(1);
    expect(SUPPORTED_CHANGE_SET_VERSIONS).toContain(RAILWAY_CHANGE_SET_VERSION);
    expect(diffGraphs({ current, desired }).version).toBe(1);
  });


  it("evaluates TypeScript default exports through tsx", async () => {
    const dir = await mkdtemp(join(tmpdir(), "railway-iac-test-"));
    const file = join(dir, "railway.ts");
    await writeFile(file, `
      export default () => ({
        name: "app",
        resources: [{ address: "service.web", type: "service", name: "web" }],
      });
    `);

    await expect(evaluateRailwayFile(file)).resolves.toMatchObject({
      graph: {
        project: { name: "app" },
        resources: [{ address: "service.web" }],
      },
    });
  });

  it("treats numeric replicas as count-only without defaulting to us-west2", () => {
    const graph = projectDefinitionToGraph(project("app", {
      resources: [service("web", { replicas: 1 })],
    }));

    expect(graph.resources).toContainEqual(expect.objectContaining({
      address: "service.web",
      deploy: { numReplicas: 1 },
    }));
    expect(graphToEnvironmentConfig(graph).services?.web?.deploy).toEqual({
      numReplicas: 1,
    });
  });

  it("does not include a region change when applying count-only replica changes", () => {
    const current = projectDefinitionToGraph(project("app", {
      resources: [service("web", { deploy: { multiRegionConfig: { "us-east4": { numReplicas: 1 } } } })],
    }));
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { replicas: 2 })],
    }));
    const changeSet = diffGraphs({ current, desired });

    expect(changeSet.changes).toMatchObject([
      { kind: "resource.update", address: "service.web", field: "deploy" },
    ]);
    expect(changeSetToEnvironmentPatch({
      currentGraph: current,
      currentConfig: graphToEnvironmentConfig(current),
      changeSet,
    }).services?.web?.deploy).toEqual({
      multiRegionConfig: { "us-east4": { numReplicas: 2 } },
    });
  });

  it("plans literal variable changes when current value is unknown", () => {
    const current = projectDefinitionToGraph(project("app", {
      resources: [service("web", { env: { TOKEN: preserve() } })],
    }));
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { env: { TOKEN: "new-value" } })],
    }));

    expect(diffGraphs({ current, desired }).changes).toMatchObject([
      { kind: "variable.set", address: "service.web", variable: "TOKEN" },
    ]);
  });

  it("does not plan Dockerfile build default drift", () => {
    const current = projectDefinitionToGraph(project("app", {
      resources: [service("backend", { build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile", buildCommand: "" } })],
    }));
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("backend", { build: { builder: "DOCKERFILE" } })],
    }));

    expect(diffGraphs({ current, desired }).changes).toEqual([]);
  });

  it("compiles service volume attachments", () => {
    const data = volume("web-data", { region: "us-west2", sizeMB: 1024 });
    const graph = projectDefinitionToGraph(project("app", {
      resources: [service("web", { volumeMounts: { "/data": data } })],
    }));

    expect(graph.edges).toContainEqual({ from: "service.web", to: "volume.web-data", type: "mount", key: "/data" });
    expect(graph.resources).toEqual(expect.arrayContaining([expect.objectContaining({ type: "volume", name: "web-data" })]));
    expect(graphToEnvironmentConfig(graph, { volumeIdsByName: { "web-data": "vol-id" } }).services?.web?.volumeMounts).toEqual({
      "vol-id": { mountPath: "/data" },
    });
  });

  it("marks volume upsize safe and downsize destructive", () => {
    const small = projectDefinitionToGraph(project("app", { resources: [volume("data", { sizeMB: 1024 })] }));
    const large = projectDefinitionToGraph(project("app", { resources: [volume("data", { sizeMB: 2048 })] }));

    expect(diffGraphs({ current: small, desired: large }).changes).toMatchObject([
      { kind: "resource.update", address: "volume.data", field: "config", severity: "safe" },
    ]);
    expect(diffGraphs({ current: large, desired: small }).changes).toMatchObject([
      { kind: "resource.update", address: "volume.data", field: "config", severity: "destructive" },
    ]);
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

  it("does not churn region or mount path for an imported database with no explicit region", () => {
    // An imported database carries the platform-assigned region and requiredMountPath in
    // deploy; the authoring helpers never reproduce these. The diff must stay clean rather than
    // planning a destructive "move to default region" + requiredMountPath unmount.
    const current = environmentConfigToGraph(
      {
        services: {
          "db-id": {
            source: { image: "ghcr.io/railwayapp-templates/postgres-ssl:18" },
            deploy: {
              multiRegionConfig: { "us-east4-eqdc4a": { numReplicas: 1 } },
              requiredMountPath: "/var/lib/postgresql/data",
            },
            volumeMounts: { "vol-id": { mountPath: "/var/lib/postgresql/data" } },
          },
        },
      },
      { serviceNamesById: { "db-id": "postgres" } },
    );
    const desired = projectDefinitionToGraph(project("app", {
      resources: [postgres("postgres")],
    }));

    expect(diffGraphs({ current, desired }).changes).toEqual([]);
  });

  it("typechecks known bucket regions", () => {
    expect(bucket("assets", { region: "sjc" }).config?.region).toBe("sjc");
  });

  // The GA gate: compiling a desired graph to config and reading it straight back
  // must produce zero changes. This is the "import → plan → ∅" round-trip the
  // runner performs against a live environment.
  it("plans no changes for an unchanged round-tripped config", () => {
    const desired = projectDefinitionToGraph(project("app", {
      resources: [
        service("web", { source: github("railwayapp/demo", { branch: "main" }), env: { PUBLIC_FLAG: "on" } }),
        service("worker", { source: image("ghcr.io/acme/worker:1.2.3") }),
      ],
    }));

    const current = environmentConfigToGraph(graphToEnvironmentConfig(desired), { projectName: "app" });

    expect(diffGraphs({ current, desired }).changes).toEqual([]);
  });

  it("marks removing a service as a destructive delete", () => {
    const current = environmentConfigToGraph({
      services: { web: { source: { repo: "railwayapp/demo" } }, api: { source: { repo: "railwayapp/api" } } },
    }, { projectName: "app" });
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { source: github("railwayapp/demo") })],
    }));

    const deletion = diffGraphs({ current, desired }).changes.find(change => change.kind === "resource.delete");
    expect(deletion).toMatchObject({ kind: "resource.delete", address: "service.api", severity: "destructive" });
  });

  it("treats variable removal as destructive and addition as safe", () => {
    const current = environmentConfigToGraph({
      services: { web: { source: { repo: "r" }, variables: { OLD: { value: "1" } } } },
    }, { projectName: "app" });
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { source: github("r"), env: { NEW: "2" } })],
    }));

    const changes = diffGraphs({ current, desired }).changes;
    expect(changes).toContainEqual(expect.objectContaining({ kind: "variable.delete", variable: "OLD", severity: "destructive" }));
    expect(changes).toContainEqual(expect.objectContaining({ kind: "variable.set", variable: "NEW", severity: "safe" }));
  });

  it("never plans a change for a preserve() variable", () => {
    const current = environmentConfigToGraph({
      services: { web: { source: { repo: "r" }, variables: { SECRET: { value: "existing" } } } },
    }, { projectName: "app" });
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { source: github("r"), env: { SECRET: preserve() } })],
    }));

    const varChanges = diffGraphs({ current, desired }).changes.filter(change => change.kind.startsWith("variable"));
    expect(varChanges).toEqual([]);
  });

  it("redacts variable values in plan output but keeps them in the change", () => {
    const SECRET = "sk-super-secret-value-123";
    const current = environmentConfigToGraph({ services: { web: { source: { repo: "r" } } } }, { projectName: "app" });
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { source: github("r"), env: { API_KEY: SECRET } })],
    }));

    const changeSet = diffGraphs({ current, desired });
    const change = changeSet.changes.find((c): c is SetVariableChange => c.kind === "variable.set" && c.variable === "API_KEY");

    // Human-facing output (rendered diff + per-change details/summary) must never leak the value.
    const rendered = JSON.stringify({ diff: renderChangeSet(changeSet), summary: change?.summary, details: change?.details });
    expect(rendered).not.toContain(SECRET);
    expect(change?.details?.[0]).toContain("API_KEY");
    expect(change?.details?.[0]).toContain("«hidden»");

    // The structured change still carries the real value so apply works.
    expect(change?.after).toMatchObject({ type: "literal", value: SECRET });
  });

  it("reveals variable values when revealValues is set (--show-values)", () => {
    const SECRET = "sk-super-secret-value-123";
    const current = environmentConfigToGraph({ services: { web: { source: { repo: "r" } } } }, { projectName: "app" });
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { source: github("r"), env: { API_KEY: SECRET } })],
    }));

    const changeSet = diffGraphs({ current, desired, revealValues: true });
    const change = changeSet.changes.find((c): c is SetVariableChange => c.kind === "variable.set" && c.variable === "API_KEY");

    expect(change?.details?.[0]).toContain(SECRET);
    expect(change?.details?.[0]).not.toContain("«hidden»");
  });

  describe("write-only registry credentials", () => {
    const PASSWORD = "hunter2-secret";
    const desiredWithCredentials = () => projectDefinitionToGraph(project("app", {
      resources: [service("web", {
        source: image("ghcr.io/acme/api:1.2.3"),
        deploy: { registryCredentials: { username: "robot", password: PASSWORD } },
      })],
    }));

    it("plans the first apply when the environment has no credentials", () => {
      const current = environmentConfigToGraph({
        services: { web: { source: { image: "ghcr.io/acme/api:1.2.3" } } },
      }, { projectName: "app" });

      const changes = diffGraphs({ current, desired: desiredWithCredentials() }).changes;
      expect(changes).toMatchObject([
        { kind: "resource.update", address: "service.web", field: "deploy" },
      ]);
      // Plan output (details) must not leak the password even on first apply.
      const change = changes[0] as { details?: string[] };
      expect(JSON.stringify(change.details ?? [])).not.toContain(PASSWORD);
    });

    it("does not churn when the environment masks credentials with the sentinel", () => {
      const current = environmentConfigToGraph({
        services: { web: {
          source: { image: "ghcr.io/acme/api:1.2.3" },
          deploy: { registryCredentials: { username: "*****", password: "*****" } },
        } },
      }, { projectName: "app" });

      expect(diffGraphs({ current, desired: desiredWithCredentials() }).changes).toEqual([]);
    });

    it("does not churn when a staged-patch read nulls credentials", () => {
      const current = environmentConfigToGraph({
        services: { web: {
          source: { image: "ghcr.io/acme/api:1.2.3" },
          deploy: { registryCredentials: null },
        } },
      }, { projectName: "app" });

      expect(diffGraphs({ current, desired: desiredWithCredentials() }).changes).toEqual([]);
    });

    it("never plans credential removal when the desired config omits them", () => {
      const current = environmentConfigToGraph({
        services: { web: {
          source: { image: "ghcr.io/acme/api:1.2.3" },
          deploy: { registryCredentials: { username: "*****", password: "*****" } },
        } },
      }, { projectName: "app" });
      const desired = projectDefinitionToGraph(project("app", {
        resources: [service("web", { source: image("ghcr.io/acme/api:1.2.3") })],
      }));

      expect(diffGraphs({ current, desired }).changes).toEqual([]);
    });

    it("plans a rotation when the remote config was fetched decrypted", () => {
      const current = environmentConfigToGraph({
        services: { web: {
          source: { image: "ghcr.io/acme/api:1.2.3" },
          deploy: { registryCredentials: { username: "robot", password: "old-password" } },
        } },
      }, { projectName: "app" });

      const changes = diffGraphs({ current, desired: desiredWithCredentials() }).changes;
      expect(changes).toMatchObject([
        { kind: "resource.update", address: "service.web", field: "deploy" },
      ]);
      const change = changes[0] as { summary?: string; details?: string[] };
      const rendered = JSON.stringify([change.summary, change.details]);
      expect(rendered).toContain("registryCredentials");
      expect(rendered).not.toContain(PASSWORD);
      expect(rendered).not.toContain("old-password");
    });

    it("excludes masked credentials from the change payload of unrelated deploy edits", () => {
      const current = environmentConfigToGraph({
        services: { web: {
          source: { image: "ghcr.io/acme/api:1.2.3" },
          deploy: {
            startCommand: "old-start",
            registryCredentials: { username: "*****", password: "*****" },
          },
        } },
      }, { projectName: "app" });
      const desired = projectDefinitionToGraph(project("app", {
        resources: [service("web", {
          source: image("ghcr.io/acme/api:1.2.3"),
          deploy: { startCommand: "new-start", registryCredentials: { username: "robot", password: PASSWORD } },
        })],
      }));

      const changes = diffGraphs({ current, desired }).changes;
      expect(changes).toMatchObject([
        { kind: "resource.update", address: "service.web", field: "deploy" },
      ]);
      const change = changes[0] as { before?: unknown; after?: unknown };
      expect(JSON.stringify([change.before, change.after])).not.toContain("registryCredentials");
    });
  });

  it("refuses to manage a service still owned by railway.json/toml", () => {
    const current = environmentConfigToGraph({
      services: { web: { source: { repo: "r" }, configFile: "railway.json" } },
    }, { projectName: "app" });
    const desired = projectDefinitionToGraph(project("app", {
      resources: [service("web", { source: github("r") })],
    }));

    const { changes, diagnostics } = diffGraphs({ current, desired });
    expect(diagnostics).toContainEqual(expect.objectContaining({ severity: "error", message: expect.stringContaining("railway.json") }));
    expect(changes).toEqual([]);
  });

  it("flags a bucket region change as an immutable-region error", () => {
    const current = environmentConfigToGraph({ buckets: { assets: { region: "sjc" } } }, { projectName: "app" });
    const desired = projectDefinitionToGraph(project("app", { resources: [bucket("assets", { region: "ams" })] }));

    expect(diffGraphs({ current, desired }).diagnostics).toContainEqual(
      expect.objectContaining({ severity: "error", message: expect.stringContaining("region") }),
    );
  });
});
