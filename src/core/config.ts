import { RailwayAuthError } from "./errors.js";

export const DEFAULT_RAILWAY_GRAPHQL_ENDPOINT =
  "https://backboard.railway.com/graphql/v2";

const RAILWAY_TOKEN_ENV = "RAILWAY_API_TOKEN";
const RAILWAY_ENVIRONMENT_ENV = "RAILWAY_ENVIRONMENT_ID";
const RAILWAY_ENDPOINT_ENV = "RAILWAY_GRAPHQL_ENDPOINT";

export interface RailwayClientConfig {
  token?: string;
  endpoint?: string;
  fetch?: typeof fetch;
}

export interface NormalizedRailwayClientConfig {
  token: string;
  endpoint: string;
  fetch: typeof fetch;
}

/**
 * Resolves credentials and transport with explicit values winning over
 * environment variables. Reading from env keeps the happy path config-free;
 * passing an explicit value lets callers source it from any variable they like.
 */
export function normalizeRailwayClientConfig(
  config: RailwayClientConfig = {},
): NormalizedRailwayClientConfig {
  const token = firstNonEmpty(config.token, readEnv(RAILWAY_TOKEN_ENV));
  if (!token) throw new RailwayAuthError(RAILWAY_TOKEN_ENV);

  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("No fetch implementation found. Pass `fetch` in the config.");
  }

  const endpoint =
    firstNonEmpty(config.endpoint, readEnv(RAILWAY_ENDPOINT_ENV)) ??
    DEFAULT_RAILWAY_GRAPHQL_ENDPOINT;

  return { token, endpoint, fetch: fetchImpl };
}

export function resolveEnvironmentId(explicit?: string): string {
  const environmentId = firstNonEmpty(
    explicit,
    readEnv(RAILWAY_ENVIRONMENT_ENV),
  );
  if (!environmentId) throw new RailwayAuthError(RAILWAY_ENVIRONMENT_ENV);
  return environmentId;
}

/**
 * Reads an environment variable without assuming a Node runtime, so the SDK is
 * safe to import in browsers, Deno, and edge runtimes where `process` is absent.
 */
function readEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env?.[name];
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim().length > 0) return value;
  }
  return undefined;
}
