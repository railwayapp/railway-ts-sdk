import { vi } from "vitest";

import type { SandboxInfo } from "../src/index.js";
import type { SandboxTemplateInfo } from "../src/sandbox/types.js";

/** Neutralizes ambient RAILWAY_* env vars so tests resolve config deterministically. */
export function clearRailwayEnv(): void {
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
    environmentId: "environment_123",
    region: "us-west2",
    idleTimeoutMinutes: 5,
    createdAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

export function templateInfo(
  overrides: Partial<SandboxTemplateInfo> = {},
): SandboxTemplateInfo {
  return {
    id: "template_123",
    status: "READY",
    environmentId: "environment_123",
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
