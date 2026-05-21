export const DEFAULT_RAILWAY_GRAPHQL_ENDPOINT =
  "https://backboard.railway.com/graphql/v2";

export interface RailwaySandboxesConfig {
  token: string;
  projectId: string;
  environmentId: string;
  endpoint?: string;
  fetch?: typeof fetch;
}

export interface NormalizedRailwaySandboxesConfig {
  token: string;
  projectId: string;
  environmentId: string;
  endpoint: string;
  fetch: typeof fetch;
}

export function normalizeConfig(
  config: RailwaySandboxesConfig,
): NormalizedRailwaySandboxesConfig {
  assertNonEmpty("token", config.token);
  assertNonEmpty("projectId", config.projectId);
  assertNonEmpty("environmentId", config.environmentId);

  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error(
      "No fetch implementation found. Pass `fetch` in the RailwaySandboxes config.",
    );
  }

  return {
    token: config.token,
    projectId: config.projectId,
    environmentId: config.environmentId,
    endpoint: config.endpoint ?? DEFAULT_RAILWAY_GRAPHQL_ENDPOINT,
    fetch: fetchImpl,
  };
}

function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new Error(`RailwaySandboxes config requires ${name}.`);
  }
}
