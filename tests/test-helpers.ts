import type { SandboxSnapshot } from "../src/index.js";

export interface FetchCall {
  input: string | URL | Request;
  init: RequestInit | undefined;
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
    const body = JSON.parse(String(init?.body)) as FetchCall["body"];
    calls.push({ input, init, body });

    const response = responses.shift();
    if (response instanceof Response) return response;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  return { fetch: fetchMock, calls };
}

export function sandboxSnapshot(
  overrides: Partial<SandboxSnapshot> = {},
): SandboxSnapshot {
  return {
    id: "sandbox_123",
    name: "test-sandbox",
    status: "RUNNING",
    instanceId: "instance_123",
    region: "sjc",
    projectId: "project_123",
    environmentId: "environment_123",
    idleTimeoutMinutes: 5,
    createdAt: "2026-05-13T00:00:00.000Z",
    updatedAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

export function header(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}
