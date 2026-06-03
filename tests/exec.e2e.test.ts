import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { Sandbox, SandboxExecInterruptedError } from "../src/index.js";

/**
 * Live end-to-end exec tests, mirroring the backboard reference harness
 * (Tests A-F). Skipped unless explicitly enabled so the unit suite stays
 * offline:
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

  it("completes short commands inline with split streams (A) and nonzero exits (B)", async () => {
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

  it("streams long commands live (C), reattaches without gaps or dupes (D), and kills (E)", async () => {
    const liveChunks: string[] = [];
    const handle = sandbox.exec(
      "for i in $(seq 1 120); do echo line-$i; sleep 0.5; done",
      { onStdout: chunk => liveChunks.push(chunk) },
    );
    const execId = await handle.execId;
    expect(execId).toBeTruthy();

    // C: output streams while the command is still running.
    await vi.waitFor(
      () => expect(lineNumbers(liveChunks.join("")).length).toBeGreaterThanOrEqual(5),
      { timeout: 90_000, interval: 250 },
    );

    // D: a late attachment replays the full history and catches up.
    const reChunks: string[] = [];
    const reattached = sandbox.exec(
      { execId },
      { onStdout: chunk => reChunks.push(chunk) },
    );
    await vi.waitFor(
      () => {
        const seen = lineNumbers(reChunks.join(""));
        expect(seen).toContain(1);
        expect(seen.length).toBeGreaterThanOrEqual(
          lineNumbers(liveChunks.join("")).length - 2,
        );
      },
      { timeout: 60_000, interval: 250 },
    );

    // E: kill terminates both attachments with a signal exit.
    await expect(handle.kill()).resolves.toBe(true);
    const [first, second] = await Promise.all([handle, reattached]);
    expect(first.exitCode).toBe(-1);
    expect(second.exitCode).toBe(-1);

    // Both saw an identical, gapless, dupe-free prefix of the output.
    expectSequential(first.stdout);
    expectSequential(second.stdout);
    expect(second.stdout).toBe(first.stdout);
  }, 180_000);

  it("rejects reattaching to an unknown execId with SandboxExecInterruptedError (F)", async () => {
    await expect(
      sandbox.exec({ execId: "00000000-0000-4000-8000-000000000000" }).result(),
    ).rejects.toBeInstanceOf(SandboxExecInterruptedError);
  }, 60_000);

  it("enforces timeoutSec client-side on streaming commands", async () => {
    // 35s clears the ~25s fast-return window so the exec goes RUNNING first.
    const result = await sandbox.exec("echo start; sleep 300", {
      timeoutSec: 35,
    });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(-1);
    expect(result.stdout).toContain("start");
  }, 120_000);
});
