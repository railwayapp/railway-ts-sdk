import { RailwayAuthError, RailwayConnectionError } from "./errors.js";

export const DEFAULT_RAILWAY_GRAPHQL_ENDPOINT =
  "https://backboard.railway.com/graphql/v2";

const RAILWAY_TOKEN_ENV = "RAILWAY_API_TOKEN";
const RAILWAY_ENVIRONMENT_ENV = "RAILWAY_ENVIRONMENT_ID";
const RAILWAY_ENDPOINT_ENV = "RAILWAY_GRAPHQL_ENDPOINT";
const RAILWAY_TCP_PROXY_WS_ENV = "RAILWAY_TCP_PROXY_WS_ENDPOINT";

const TCP_PROXY_WS_PORT = "2226";
const TCP_PROXY_WS_PATH = "/ws/exec";

export interface RailwayClientConfig {
  token?: string;
  endpoint?: string;
  fetch?: typeof fetch;
  /**
   * WebSocket constructor used to stream exec output. Defaults to the global
   * `WebSocket` (available in Node >= 22, browsers, Deno, and edge runtimes);
   * pass an implementation (e.g. the `ws` package) where no global exists.
   */
  webSocketImpl?: WebSocketConstructor;
  /**
   * tcp-proxy exec WebSocket endpoint. Defaults to the value derived from
   * `endpoint` (`backboard.<host>` → `wss://ssh.<host>:2226/ws/exec`);
   * override for non-standard deployments.
   */
  tcpProxyWsEndpoint?: string;
}

/** Structural constructor type satisfied by native WebSocket and the `ws` package. */
export type WebSocketConstructor = new (
  url: string,
  protocols?: string | string[],
) => unknown;

export interface NormalizedRailwayClientConfig {
  token: string;
  endpoint: string;
  fetch: typeof fetch;
  webSocketImpl?: WebSocketConstructor | undefined;
  tcpProxyWsEndpoint: string;
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

  const tcpProxyWsEndpoint =
    firstNonEmpty(config.tcpProxyWsEndpoint, readEnv(RAILWAY_TCP_PROXY_WS_ENV)) ??
    deriveTcpProxyWsEndpoint(endpoint);

  return {
    token,
    endpoint,
    fetch: fetchImpl,
    webSocketImpl: config.webSocketImpl,
    tcpProxyWsEndpoint,
  };
}

/**
 * Derives the tcp-proxy exec WebSocket endpoint from the GraphQL endpoint:
 * the host's leading `backboard.` label becomes `ssh.` (or `ssh.` is
 * prepended), scheme `wss`, port 2226, path `/ws/exec`. e.g.
 * `https://backboard.railway.com/graphql/v2` → `wss://ssh.railway.com:2226/ws/exec`.
 */
export function deriveTcpProxyWsEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  const host = url.hostname.startsWith("backboard.")
    ? `ssh.${url.hostname.slice("backboard.".length)}`
    : `ssh.${url.hostname}`;
  return `wss://${host}:${TCP_PROXY_WS_PORT}${TCP_PROXY_WS_PATH}`;
}

export function resolveWebSocketImpl(
  config: NormalizedRailwayClientConfig,
): WebSocketConstructor {
  const impl =
    config.webSocketImpl ??
    (globalThis as { WebSocket?: WebSocketConstructor }).WebSocket;
  if (!impl) {
    throw new RailwayConnectionError({
      message:
        "No WebSocket implementation found. Pass `webSocketImpl` in the config " +
        "(e.g. the `ws` package) to stream exec output.",
    });
  }
  return impl;
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
