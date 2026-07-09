import { RailwayError } from "../core/errors.js";
import type { NormalizedRailwayClientConfig } from "../core/config.js";
import type { FlagsInitOptions, FlagsScope } from "./types.js";

export const RAILWAY_PROJECT_ID_ENV = "RAILWAY_PROJECT_ID";

export class FlagsScopeError extends RailwayError {
  constructor() {
    super(
      "Could not resolve feature flag scope. Use one of:\n" +
        "  • set RAILWAY_TOKEN to a Railway project token (recommended — project scope is automatic)\n" +
        "  • scope: { projectId: \"...\" } or set RAILWAY_PROJECT_ID for project-scoped flags\n" +
        "  • scope: { workspaceId: \"...\" } for workspace-scoped flags",
    );
  }
}

/**
 * Resolve the registry owner string used for GraphQL fetches.
 *
 * Returns `undefined` only for project tokens, where Backboard infers `project:<id>` from auth.
 */
export function resolveFlagsRegistryOwner(
  options: FlagsInitOptions,
  config: NormalizedRailwayClientConfig,
): string | undefined {
  if (options.scope != null) {
    return serializeScope(options.scope);
  }

  if (config.authType === "project-token") {
    return undefined;
  }

  const projectId = readEnv(RAILWAY_PROJECT_ID_ENV);
  if (projectId != null) {
    return serializeScope({ projectId });
  }

  throw new FlagsScopeError();
}

export function serializeScope(scope: FlagsScope): string {
  if ("workspaceId" in scope) {
    return `workspace:${scope.workspaceId}`;
  }
  return `project:${scope.projectId}`;
}

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env?.[name];
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}
