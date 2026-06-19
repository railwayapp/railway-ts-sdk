import { diffGraphs, environmentConfigToGraph } from "../../src/index.js";
import type { RailwayChangeSet } from "../../src/iac/change-set.js";
import { IacClient } from "../../src/iac/client.js";
import type { RailwayGraph } from "../../src/iac/graph.js";

/**
 * Shared harness for the live IaC e2e suites. All target creds use a dedicated
 * IAC_E2E_* namespace so the platform's auto-injected RAILWAY_* vars (notably
 * RAILWAY_ENVIRONMENT_ID) can't redirect a Railway-hosted runner at itself.
 */
export const liveEnabled =
  Boolean(process.env.IAC_E2E_API_TOKEN) && Boolean(process.env.IAC_E2E_ENVIRONMENT_ID);

export interface BackboardContext {
  token: string;
  environmentId: string;
  authType?: "project-token";
  endpoint?: string;
}

export function backboard(): BackboardContext {
  return {
    token: process.env.IAC_E2E_API_TOKEN!,
    environmentId: process.env.IAC_E2E_ENVIRONMENT_ID!,
    ...(process.env.IAC_E2E_AUTH_TYPE === "project-token" ? { authType: "project-token" as const } : {}),
    ...(process.env.IAC_E2E_GRAPHQL_ENDPOINT ? { endpoint: process.env.IAC_E2E_GRAPHQL_ENDPOINT } : {}),
  };
}

export function clientFor(bb: BackboardContext): IacClient {
  return new IacClient({
    token: bb.token,
    ...(bb.authType ? { authType: bb.authType } : {}),
    ...(bb.endpoint ? { graphqlEndpoint: bb.endpoint } : {}),
  });
}

export interface LiveState {
  graph: RailwayGraph;
  etag: string | undefined;
  config: unknown;
  serviceNames: string[];
  bucketNames: string[];
  variablesOf: (serviceName: string) => Record<string, { value?: string | null } | null> | undefined;
}

/** Snapshot the live environment as a graph + the etag to apply against. */
export async function currentState(client: IacClient, bb: BackboardContext): Promise<LiveState> {
  // Decrypt so variable values are real (not masked): masked values read back as
  // preserve(), which makes updates look like no-ops and hides values from asserts.
  // configEtag is computed server-side over the masked config regardless, so the
  // CAS token is unaffected by this.
  const cur = await client.getCurrentEnvironment(bb.environmentId, { decryptVariables: true });
  const graph = environmentConfigToGraph(cur.config, {
    ...(cur.projectName ? { projectName: cur.projectName } : {}),
    serviceNamesById: cur.serviceNamesById,
    bucketNamesById: cur.bucketNamesById,
    customDomainsByServiceId: cur.customDomainsByServiceId,
  });
  const idByName = Object.fromEntries(Object.entries(cur.serviceNamesById).map(([id, name]) => [name, id]));
  const services = (cur.config as { services?: Record<string, { variables?: Record<string, { value?: string | null } | null> }> }).services ?? {};
  return {
    graph,
    etag: cur.configEtag,
    config: cur.config,
    serviceNames: Object.values(cur.serviceNamesById),
    bucketNames: Object.values(cur.bucketNamesById),
    variablesOf: (serviceName: string) => services[idByName[serviceName] ?? ""]?.variables,
  };
}

/** Diff the desired graph against live and apply with the current etag. Returns the changeset. */
export async function applyDesired(client: IacClient, bb: BackboardContext, desired: RailwayGraph): Promise<RailwayChangeSet> {
  const state = await currentState(client, bb);
  const changeSet = diffGraphs({ current: state.graph, desired });
  if (changeSet.changes.length > 0) {
    await client.applyChangeSet({
      environmentId: bb.environmentId,
      changeSet,
      ...(state.etag ? { baseEtag: state.etag } : {}),
    });
  }
  return changeSet;
}

/** Plan only — diff desired against live without applying. */
export async function planAgainst(client: IacClient, bb: BackboardContext, desired: RailwayGraph): Promise<RailwayChangeSet> {
  const state = await currentState(client, bb);
  return diffGraphs({ current: state.graph, desired });
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Poll until predicate holds; apply is async (Temporal), so reads lag writes. */
export async function waitFor(
  label: string,
  predicate: () => Promise<boolean> | boolean,
  // No Railway operation here should take over a minute — empty-service creates,
  // var updates, and DB provisioning are all seconds. A longer wait means wedged,
  // not slow, so keep the ceiling low and fail fast.
  { timeoutMs = 45_000, intervalMs = 2_000 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: unknown;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch (error) {
      last = error;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label}${last ? ` (last error: ${String(last)})` : ""}`);
}
