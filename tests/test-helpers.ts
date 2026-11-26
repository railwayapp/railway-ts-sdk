import diagnosticsChannel from "node:diagnostics_channel";
import { vi } from "vitest";

import type { WebSocketConstructor } from "../src/core/config.js";
import type { SandboxInfo } from "../src/index.js";
import type {
  SandboxCheckpointInfo,
  SandboxTemplateBuildInfo,
} from "../src/sandbox/types.js";

/** Neutralizes ambient RAILWAY_* env vars so tests resolve config deterministically. */
export function clearRailwayEnv(): void {
  vi.stubEnv("RAILWAY_TOKEN", "");
  vi.stubEnv("RAILWAY_API_TOKEN", "");
  vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "");
  vi.stubEnv("RAILWAY_GRAPHQL_ENDPOINT", "");
  vi.stubEnv("RAILWAY_TCP_PROXY_WS_ENDPOINT", "");
  vi.stubEnv("RAILWAY_VERBOSE", "");
}

export interface FetchCall {
  input: string | URL | Request;
  init: RequestInit | undefined;
  rawBody: BodyInit | null | undefined;
  body: {
    query: string;
    variables?: unknown;
  };
}

export function createFetchMock(responses: unknown[]): {
  fetch: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];

  const fetchMock: typeof fetch = async (input, init) => {
    const rawBody = init?.body;
    const body = parseJsonBody(rawBody);
    calls.push({ input, init, rawBody, body });

    const response = responses.shift();
    if (response instanceof Response) return response;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  return { fetch: fetchMock, calls };
}

export function sandboxInfo(overrides: Partial<SandboxInfo> = {}): SandboxInfo {
  return {
    id: "sandbox_123",
    status: "RUNNING",
    networkIsolation: "ISOLATED",
    domains: [],
    environmentId: "environment_123",
    region: "us-west2",
    idleTimeoutMinutes: 5,
    createdAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

export function buildInfo(
  overrides: Partial<SandboxTemplateBuildInfo> = {},
): SandboxTemplateBuildInfo {
  return {
    id: "build_hash_123",
    status: "READY",
    environmentId: "environment_123",
    ...overrides,
  };
}

export function checkpointInfo(
  overrides: Partial<SandboxCheckpointInfo> = {},
): SandboxCheckpointInfo {
  return {
    id: "checkpoint_123",
    key: "checkpoint_123",
    environmentId: "environment_123",
    createdAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

/** Repeats a single response `n` times — handy for poll/timeout sequences. */
export function manyResponses(n: number, response: unknown): unknown[] {
  return Array.from({ length: n }, () => response);
}

export function header(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

function parseJsonBody(body: BodyInit | null | undefined): FetchCall["body"] {
  if (typeof body !== "string") return { query: "" };

  try {
    return JSON.parse(body) as FetchCall["body"];
  } catch {
    return { query: "" };
  }
}

/**
 * A WebSocket whose upgrade is refused the way Node's built-in one reports it:
 * undici publishes the HTTP response on `undici:request:headers`, then the
 * socket errors and closes with a bare 1006 without ever opening.
 */
export function refusedUpgradeWebSocket(response: {
  status: number;
  retryAfter?: string;
}): { webSocketImpl: WebSocketConstructor; attempts: () => number } {
  let attempts = 0;
  class RefusedSocket {
    binaryType = "blob";
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;

    constructor(url: string, protocols: string[]) {
      attempts++;
      queueMicrotask(() => {
        diagnosticsChannel.channel("undici:request:headers").publish({
          request: {
            path: new URL(url).pathname,
            headers: ["sec-websocket-protocol", protocols.join(", ")],
          },
          response: {
            statusCode: response.status,
            headers: response.retryAfter === undefined
              ? []
              : [Buffer.from("Retry-After"), Buffer.from(response.retryAfter)],
          },
        });
        this.onerror?.({});
        this.onclose?.({ code: 1006, reason: "" });
      });
    }

    send(): void {}
    close(): void {}
  }
  return {
    webSocketImpl: RefusedSocket as unknown as WebSocketConstructor,
    attempts: () => attempts,
  };
}
