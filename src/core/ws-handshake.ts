type Diagnostics = typeof import("node:diagnostics_channel");

/**
 * The HTTP response to a WebSocket upgrade that was refused. The WHATWG
 * WebSocket API hides it (a refused upgrade surfaces as a bare 1006), but
 * Node's built-in WebSocket runs the handshake through undici, which publishes
 * every response on `undici:request:headers`. Each SDK connection presents a
 * freshly minted JWT as its last subprotocol, so the token identifies which
 * pending handshake a response belongs to.
 *
 * Elsewhere (browsers, Deno, a custom `webSocketImpl`) nothing is published and
 * callers see only the close code, as before.
 */
export interface HandshakeResponse {
  status: number;
  retryAfter: string | undefined;
}

export interface HandshakeWatch {
  /** The response, once one arrived for this handshake. */
  response(): HandshakeResponse | undefined;
  /** Stops watching; idempotent. Call once the socket opens or fails. */
  dispose(): void;
}

const CHANNEL = "undici:request:headers";

interface UndiciHeadersMessage {
  request?: { headers?: unknown };
  response?: { statusCode?: unknown; headers?: unknown };
}

const pending = new Map<string, { response?: HandshakeResponse }>();
let diagnostics: Diagnostics | null | undefined;

/**
 * Runs for every undici response while subscribed. Node rethrows subscriber
 * errors as uncaught exceptions, so this only reads defensively and never
 * throws on an unexpected message shape.
 */
function onHeaders(message: unknown): void {
  const { request, response } = (message ?? {}) as UndiciHeadersMessage;
  if (!Array.isArray(request?.headers) || typeof response?.statusCode !== "number") return;
  const protocols = headerValue(request.headers, "sec-websocket-protocol");
  const jwt = protocols?.split(",").at(-1)?.trim();
  const entry = jwt === undefined ? undefined : pending.get(jwt);
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
  if (diagnostics !== undefined) return diagnostics;
  const nodeProcess = (globalThis as { process?: NodeJS.Process }).process;
  diagnostics = nodeProcess?.getBuiltinModule?.("node:diagnostics_channel") ?? null;
  return diagnostics;
}

/**
 * Watches the handshake for the socket about to be opened with `jwt`. The
 * channel is subscribed only while a handshake is pending, so idle processes
 * pay nothing and undici skips publishing.
 */
export function watchHandshake(jwt: string): HandshakeWatch {
  const channels = loadDiagnostics();
  if (!channels) return { response: () => undefined, dispose: () => {} };
  const entry: { response?: HandshakeResponse } = {};
  if (pending.size === 0) channels.subscribe(CHANNEL, onHeaders);
  pending.set(jwt, entry);
  let disposed = false;
  return {
    response: () => entry.response,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (pending.get(jwt) === entry) pending.delete(jwt);
      if (pending.size === 0) channels.unsubscribe(CHANNEL, onHeaders);
    },
  };
}
