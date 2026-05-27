import "dotenv/config";

import type { SandboxConfig } from "../../src/index.ts";
import { RailwayGraphQLError } from "../../src/index.ts";

export function sandboxConfigFromEnv(): SandboxConfig {
  const endpoint = process.env.RAILWAY_GRAPHQL_ENDPOINT;

  return {
    token: requiredEnv("RAILWAY_API_TOKEN"),
    environmentId: requiredEnv("RAILWAY_ENVIRONMENT_ID"),
    ...(endpoint ? { endpoint } : {}),
  };
}

export async function runExample(example: () => Promise<void>): Promise<void> {
  try {
    await example();
  } catch (error) {
    console.error(formatError(error));
    process.exitCode = 1;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`Missing ${name}. Copy .env.example to .env first.`);
  return value;
}

function formatError(error: unknown): string {
  if (error instanceof RailwayGraphQLError) {
    return `Railway GraphQL error: ${error.message}`;
  }

  if (!(error instanceof Error)) {
    return String(error);
  }

  if (hasErrorCode(error.cause, "SELF_SIGNED_CERT_IN_CHAIN")) {
    return `${error.message}: self-signed certificate in chain. Run examples with mise so Node uses the project CA settings.`;
  }

  return error.message;
}

function hasErrorCode(cause: unknown, code: string): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === code
  );
}
