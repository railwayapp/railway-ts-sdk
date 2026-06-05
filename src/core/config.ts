import { RailwayAuthError } from "./errors.js";
import { createLogger, type Logger } from "./logger.js";

export const DEFAULT_RAILWAY_GRAPHQL_ENDPOINT =
  "https://backboard.railway.com/graphql/v2";

const RAILWAY_TOKEN_ENV = "RAILWAY_API_TOKEN";
const RAILWAY_ENVIRONMENT_ENV = "RAILWAY_ENVIRONMENT_ID";
const RAILWAY_ENDPOINT_ENV = "RAILWAY_GRAPHQL_ENDPOINT";
const RAILWAY_VERBOSE_ENV = "RAILWAY_VERBOSE";

export type RailwayAuthType = "bearer" | "project-token";

export interface RailwayClientConfig {
  token?: string;
  authType?: RailwayAuthType;
  endpoint?: string;
  /** Alias used by IaC flows. Prefer endpoint for the stable SDK surface. */
  graphqlEndpoint?: string;
  fetch?: typeof fetch;
  /**
   * Print human-readable progress to stderr (requests, polling, lifecycle).
   * Also enabled by `RAILWAY_VERBOSE`. Tokens and env values are never logged.
   */
  verbose?: boolean;
}

export interface NormalizedRailwayClientConfig {
  token: string;
  authType: RailwayAuthType;
  endpoint: string;
  fetch: typeof fetch;
  log: Logger;
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
    firstNonEmpty(
      config.endpoint,
      config.graphqlEndpoint,
      readEnv(RAILWAY_ENDPOINT_ENV),
    ) ?? DEFAULT_RAILWAY_GRAPHQL_ENDPOINT;

  const verbose = config.verbose ?? isTruthyEnv(readEnv(RAILWAY_VERBOSE_ENV));
  const normalized: NormalizedRailwayClientConfig = {
    token,
    authType: config.authType ?? "bearer",
    endpoint,
    fetch: fetchImpl,
    log: createLogger(verbose),
  };
  normalized.log(
    `config resolved: endpoint=${endpoint} authType=${normalized.authType}`,
  );
  return normalized;
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

/** Treats `1`/`true`/`yes` as on so `RAILWAY_VERBOSE=0` doesn't accidentally enable. */
function isTruthyEnv(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim().length > 0) return value;
  }
  return undefined;
}
