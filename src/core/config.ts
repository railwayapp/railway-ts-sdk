export const DEFAULT_RAILWAY_GRAPHQL_ENDPOINT =
  "https://backboard.railway.com/graphql/v2";

export interface RailwayClientConfig {
  token: string;
  endpoint?: string;
  fetch?: typeof fetch;
}

export interface NormalizedRailwayClientConfig {
  token: string;
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
    endpoint: config.endpoint ?? DEFAULT_RAILWAY_GRAPHQL_ENDPOINT,
    fetch: fetchImpl,
  };
}

export function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Railway config requires ${name}.`);
  }
}
