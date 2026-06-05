import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Sandbox } from "../src/index.js";

/**
 * Live end-to-end exec tests over the `/ws/exec` transport. Skipped unless
 * explicitly enabled so the unit suite stays offline:
 *
 *   SANDBOX_E2E=1 RAILWAY_API_TOKEN=... RAILWAY_ENVIRONMENT_ID=... \
 *     [RAILWAY_GRAPHQL_ENDPOINT=...] pnpm vitest run tests/exec.e2e.test.ts
 */
const live =
  process.env.SANDBOX_E2E === "1" &&
  Boolean(process.env.RAILWAY_API_TOKEN) &&
  Boolean(process.env.RAILWAY_ENVIRONMENT_ID);

function lineNumbers(stdout: string): number[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map(line => Number(line.replace("line-", "")));
}

/** Lines must be exactly 1..n — proves no gaps and no duplicates. */
function expectSequential(stdout: string): void {
  const numbers = lineNumbers(stdout);
  expect(numbers.length).toBeGreaterThan(0);
  numbers.forEach((value, index) => expect(value).toBe(index + 1));
}

describe.runIf(live)("exec e2e (live)", () => {
  let sandbox: Sandbox;

  beforeAll(async () => {
    sandbox = await Sandbox.create({ idleTimeoutMinutes: 10 });
  }, 240_000);

  afterAll(async () => {
    await sandbox?.destroy().catch(() => {});
  });

  it("completes short commands with split streams (A) and nonzero exits (B)", async () => {
    const result = await sandbox.exec("echo hello; echo oops 1>&2; exit 0");
    expect(result).toMatchObject({
      exitCode: 0,
      stdout: "hello\n",
      stderr: "oops\n",
      timedOut: false,
    });

    const nonzero = await sandbox.exec("exit 7");
    expect(nonzero.exitCode).toBe(7);
  }, 90_000);

  it("streams long commands live, gapless and dupe-free (C)", async () => {
    const liveChunks: string[] = [];
    const result = await sandbox.exec(
      "for i in $(seq 1 20); do echo line-$i; sleep 0.2; done",
      { onStdout: chunk => liveChunks.push(chunk) },
    );
    expect(result.exitCode).toBe(0);
    // Output arrived incrementally and ends up sequential with no gaps/dupes.
    expect(liveChunks.length).toBeGreaterThan(1);
    expectSequential(result.stdout);
  }, 90_000);

  it("enforces timeoutSec client-side", async () => {
    const result = await sandbox.exec("echo start; sleep 300", {
      timeoutSec: 8,
    });
    expect(result.timedOut).toBe(true);
    expect(result.stdout).toContain("start");
  }, 60_000);
});
