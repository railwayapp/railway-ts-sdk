/**
 * Recovers the HTTP response to a refused tcp-proxy WebSocket upgrade. The
 * WHATWG WebSocket API hides it (a refused upgrade surfaces as a bare 1006),
 * but Node's built-in WebSocket runs the handshake through undici, which
 * publishes every response on `undici:request:headers`. Each SDK connection
 * offers a unique `connectionProtocol()` among its subprotocols, which
 * identifies the pending handshake a response belongs to (the JWT cannot: it
 * is shared by every connection until it expires).
 *
 * Elsewhere (browsers, Deno, a custom `webSocketImpl`) nothing is published and
 * callers see only the close code.
 */

import { parseRetryAfter, RailwayRateLimitError } from "./errors.js";

type Diagnostics = typeof import("node:diagnostics_channel");

interface HandshakeResponse {
  status: number;
  retryAfter: string | undefined;
}

interface HandshakeWatch {
  /** The rate-limit error when the upgrade was refused with 429. */
  rateLimitError(): RailwayRateLimitError | undefined;
  /** Stops watching; idempotent. Call once the socket opens or fails. */
  dispose(): void;
}

interface UndiciHeadersMessage {
  request?: { headers?: unknown };
  response?: { statusCode?: unknown; headers?: unknown };
}

const CHANNEL = "undici:request:headers";

const pending = new Map<string, { response?: HandshakeResponse }>();
let diagnostics: Diagnostics | null | undefined;

/**
 * Runs for every undici response while subscribed. Node rethrows subscriber
 * errors as uncaught exceptions, so this must not throw on an unexpected shape.
 */
function onHeaders(message: unknown): void {
  const { request, response } = (message ?? {}) as UndiciHeadersMessage;
  if (!Array.isArray(request?.headers) || typeof response?.statusCode !== "number") return;
  const protocols = headerValue(request.headers, "sec-websocket-protocol")?.split(",") ?? [];
  const entry = protocols.map(p => pending.get(p.trim())).find(Boolean);
  if (!entry) return;
  entry.response = {
    status: response.statusCode,
    retryAfter: Array.isArray(response.headers)
      ? headerValue(response.headers, "retry-after")
      : undefined,
  };
}

/** Flat `[name, value, ...]` pairs; undici uses strings for requests, Buffers for responses. */
function headerValue(pairs: readonly unknown[], name: string): string | undefined {
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    if (String(pairs[i]).toLowerCase() === name) return String(pairs[i + 1]);
  }
  return undefined;
}

function loadDiagnostics(): Diagnostics | null {
  if (diagnostics === undefined) {
    diagnostics = typeof process === "undefined"
      ? null
      : process.getBuiltinModule?.("node:diagnostics_channel") ?? null;
  }
  return diagnostics;
}

// Unique per process, without `crypto.randomUUID` (browsers expose it only in
// secure contexts). The random prefix keeps separately bundled SDK copies, which
// share the diagnostics channel, from colliding.
const processPrefix = Math.random().toString(36).slice(2, 10);
let connectionCount = 0;

/**
 * A subprotocol unique to one connection. tcp-proxy ignores it: it negotiates
 * `railway-shell` and reads the token from the last value.
 */
export function connectionProtocol(): string {
  return `railway-conn.${processPrefix}.${++connectionCount}`;
}

/**
 * Watches the handshake for the socket about to be opened offering `protocol`
 * (from `connectionProtocol()`). The channel is subscribed only while a
 * handshake is pending, so idle processes pay nothing and undici skips
 * publishing.
 */
export function watchHandshake(protocol: string, endpoint: "exec" | "files"): HandshakeWatch {
  const channels = loadDiagnostics();
  if (!channels) return { rateLimitError: () => undefined, dispose: () => {} };
  const entry: { response?: HandshakeResponse } = {};
  if (pending.size === 0) channels.subscribe(CHANNEL, onHeaders);
  pending.set(protocol, entry);
  let disposed = false;
  return {
    rateLimitError: () => {
      if (entry.response?.status !== 429) return undefined;
      return new RailwayRateLimitError({
        message: `tcp-proxy rate-limited the ${endpoint} connection`,
        retryAfterMs: parseRetryAfter(entry.response.retryAfter),
      });
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (pending.get(protocol) === entry) pending.delete(protocol);
      if (pending.size === 0) channels.unsubscribe(CHANNEL, onHeaders);
    },
  };
}
