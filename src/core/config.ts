export const DEFAULT_RAILWAY_GRAPHQL_ENDPOINT =
  "https://backboard.railway.com/graphql/v2";

export type RailwayAuthType = "bearer" | "project-token";

export interface RailwayClientConfig {
  token: string;
  authType?: RailwayAuthType;
  endpoint?: string;
  /** Alias used by IaC/demo flows. Prefer endpoint for the stable SDK surface. */
  graphqlEndpoint?: string;
  fetch?: typeof fetch;
}

export interface NormalizedRailwayClientConfig {
  token: string;
  authType: RailwayAuthType;
  endpoint: string;
  fetch: typeof fetch;
}

export function normalizeRailwayClientConfig(
  config: RailwayClientConfig,
): NormalizedRailwayClientConfig {
  assertNonEmpty("token", config.token);

  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("No fetch implementation found. Pass `fetch` in the config.");
  }

  return {
    token: config.token,
    authType: config.authType ?? "bearer",
    endpoint: config.endpoint ?? config.graphqlEndpoint ?? DEFAULT_RAILWAY_GRAPHQL_ENDPOINT,
    fetch: fetchImpl,
  };
}

export function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Railway config requires ${name}.`);
  }
}
