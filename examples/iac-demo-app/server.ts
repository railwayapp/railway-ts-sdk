import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  diffGraphs,
  environmentConfigToGraph,
  evaluateRailwayProject,
  IacClient,
  renderChangeSet,
  renderRailwayGraphTypes,
  type EnvironmentConfig,
  type RailwayChangeSet,
  type RailwayGraph,
} from "../../src/index.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRailwayFile = path.resolve(dirname, "../iac/.railway/railway.ts");
const port = Number(process.env.PORT ?? 8787);

type ConnectionSettings = {
  graphqlUrl?: string;
  token?: string;
  projectId?: string;
  environmentId?: string;
  railwayFile?: string;
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") return send(response, 204, null);

    if (request.method === "GET" && request.url === "/api/source") {
      const source = await fs.readFile(defaultRailwayFile, "utf8");
      return send(response, 200, { source, file: defaultRailwayFile });
    }

    if (request.method === "POST" && request.url === "/api/sync") {
      const body = await readJson<{ settings?: ConnectionSettings }>(request);
      console.log("[iac-demo] /api/sync", describeSettings(body.settings));
      const result = await buildSyncPayload(body.settings ?? {});
      return send(response, 200, result);
    }

    if (request.method === "POST" && request.url === "/api/stage") {
      const body = await readJson<{ settings: ConnectionSettings; changeSet: RailwayChangeSet }>(request);
      console.log("[iac-demo] /api/stage", describeSettings(body.settings));
      const { settings, changeSet } = body;
      if (!settings?.graphqlUrl || !settings.token || !settings.environmentId) {
        return send(response, 400, { error: "Backboard GraphQL URL, token, and environmentId are required." });
      }
      const client = new IacClient({ token: settings.token, graphqlEndpoint: settings.graphqlUrl });
      const staged = await client.stageChangeSet({ environmentId: settings.environmentId, changeSet, merge: true });
      return send(response, 200, staged);
    }

    return send(response, 404, { error: "Not found" });
  } catch (error) {
    logError(error);
    return send(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`Railway IaC demo server listening on http://localhost:${port}`);
  console.log(`Reading ${defaultRailwayFile}`);
});

async function buildSyncPayload(settings: ConnectionSettings) {
  const file = settings.railwayFile ? path.resolve(settings.railwayFile) : defaultRailwayFile;
  const source = await fs.readFile(file, "utf8");
  const desired = await evaluateRailwayProject({ file });
  const current = settings.graphqlUrl && settings.token && settings.environmentId
    ? await getRealCurrentGraph(settings, desired.graph.project.name)
    : getMockCurrentGraph(desired.graph);
  const changeSet = diffGraphs({ current: current.graph, desired: desired.graph });

  return {
    file,
    source,
    currentGraph: current.graph,
    currentConfig: current.config,
    graph: desired.graph,
    graphTypes: renderRailwayGraphTypes(desired.graph),
    changeSet,
    diff: renderChangeSet(changeSet),
    mode: current.mode,
  };
}

async function getRealCurrentGraph(settings: ConnectionSettings, projectName: string): Promise<{ mode: "real"; graph: RailwayGraph; config: EnvironmentConfig }> {
  console.log("[iac-demo] querying Backboard current environment", describeSettings(settings));
  const client = new IacClient({ token: settings.token!, graphqlEndpoint: settings.graphqlUrl! });
  const current = await client.getCurrentEnvironment(settings.environmentId!);
  return {
    mode: "real",
    config: current.config,
    graph: environmentConfigToGraph(current.config, {
      projectName,
      serviceNamesById: current.serviceNamesById,
      bucketNamesById: current.bucketNamesById,
    }),
  };
}

function getMockCurrentGraph(desiredGraph: RailwayGraph): { mode: "mock"; graph: RailwayGraph; config: EnvironmentConfig } {
  return {
    mode: "mock",
    graph: {
      ...desiredGraph,
      resources: desiredGraph.resources
        .filter(resource => resource.name !== "frontend")
        .map(resource => {
          if (resource.name !== "backend" || !("variables" in resource)) return resource;
          const { REDIS_URL: _redacted, ...variables } = resource.variables ?? {};
          return { ...resource, variables };
        }),
      edges: desiredGraph.edges.filter(edge => edge.to !== "service.frontend" && edge.from !== "service.frontend"),
    },
    config: {},
  };
}

async function readJson<T>(request: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as T;
}

function describeSettings(settings?: ConnectionSettings) {
  return {
    graphqlUrl: settings?.graphqlUrl || "(not set)",
    projectId: settings?.projectId || "(not set)",
    environmentId: settings?.environmentId || "(not set)",
    railwayFile: settings?.railwayFile || defaultRailwayFile,
    hasToken: Boolean(settings?.token),
    tokenPrefix: settings?.token ? `${settings.token.slice(0, 6)}…` : "(not set)",
  };
}

function logError(error: unknown) {
  console.error("[iac-demo] request failed");
  if (error instanceof Error) {
    console.error("[iac-demo]", error.name, error.message);
    console.error(error.stack);
    return;
  }
  console.error(error);
}

function send(response: http.ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  });
  response.end(payload == null ? undefined : JSON.stringify(payload));
}
