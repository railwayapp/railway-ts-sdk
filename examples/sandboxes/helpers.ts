import { config } from "dotenv";

import { RailwayAuthError, RailwayGraphQLError } from "../../src/index.ts";

// The examples are documented to run against the project's .env, so it wins
// over ambient RAILWAY_* shell credentials.
config({ override: true });

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export async function waitFor(
  condition: () => boolean,
  timeoutMs: number,
  label: string,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await sleep(250);
  }
}

export function countLines(text: string): number {
  return text.split("\n").filter(Boolean).length;
}

/** Asserts stdout is exactly `line-1..line-n` — no gaps, dupes, or reordering. */
export function assertSequentialLines(stdout: string, expected: number): void {
  const lines = stdout.split("\n").filter(Boolean);
  if (lines.length !== expected) {
    throw new Error(`expected ${expected} lines, got ${lines.length}`);
  }
  lines.forEach((line, index) => {
    if (line !== `line-${index + 1}`) {
      throw new Error(`line ${index + 1} out of order: "${line}"`);
    }
  });
}

export async function runExample(example: () => Promise<void>): Promise<void> {
  try {
    await example();
  } catch (error) {
    console.error(formatError(error));
    process.exitCode = 1;
  }
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  if (error instanceof RailwayAuthError) {
    return `${error.message} Copy .env.example to .env first.`;
  }

  if (error instanceof RailwayGraphQLError) {
    return `Railway GraphQL error: ${error.message}`;
  }

  return formatGenericError(error);
}

function formatGenericError(error: Error): string {
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
