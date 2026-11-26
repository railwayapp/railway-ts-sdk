import { RailwayProjectTokenDocument } from "../generated/graphql.js";
import type { NormalizedRailwayClientConfig } from "./config.js";
import { RailwayGraphQLError } from "./errors.js";
import { requestGraphQL } from "./graphql-client.js";

/** The project and environment a project token is bound to. */
export interface ProjectTokenScope {
  projectId: string;
  environmentId: string;
}

/**
 * One entry per endpoint + token. A token's scope never changes, so a resolved
 * promise is kept for the life of the process; holding the promise (not the
 * value) also makes concurrent first callers share a single request. Failed
 * lookups are evicted so the next call retries.
 */
const scopes = new Map<string, Promise<ProjectTokenScope>>();

/**
 * Asks Backboard which project and environment the project token in the
 * request header belongs to (`query { projectToken { ... } }`).
 */
export function resolveProjectTokenScope(
  config: NormalizedRailwayClientConfig,
): Promise<ProjectTokenScope> {
  const key = `${config.endpoint}\n${config.token}`;
  const cached = scopes.get(key);
  if (cached) return cached;

  const pending = lookupProjectTokenScope(config);
  scopes.set(key, pending);
  pending.catch(() => {
    if (scopes.get(key) === pending) scopes.delete(key);
  });
  return pending;
}

async function lookupProjectTokenScope(
  config: NormalizedRailwayClientConfig,
): Promise<ProjectTokenScope> {
  config.log("resolving environment from project token");
  const data = await requestGraphQL(config, RailwayProjectTokenDocument, {});
  const scope = data.projectToken as Partial<ProjectTokenScope> | null;
  if (!scope?.environmentId || !scope.projectId) {
    throw new RailwayGraphQLError({
      message: "Railway did not return an environment for the project token.",
      status: 200,
      responseBody: data,
    });
  }
  config.log(
    `project token scope: project=${scope.projectId} env=${scope.environmentId}`,
  );
  return { projectId: scope.projectId, environmentId: scope.environmentId };
}
