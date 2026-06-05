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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  label: string,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out: ${label}`);
    await sleep(200);
  }
}

const lineSet = (chunks: string[]): Set<number> =>
  new Set(lineNumbers(chunks.join("")));

/**
 * Durable reattach over `/ws/exec`. Requires durable sessions enabled
 * server-side (capability negotiation / v2 tunnel); on a non-durable bridge a
 * fresh exec's `sessionName` rejects and these fail loudly rather than silently.
 */
describe.runIf(live)("exec durable reattach (live)", () => {
  let sandbox: Sandbox;

  beforeAll(async () => {
    sandbox = await Sandbox.create({ idleTimeoutMinutes: 10 });
  }, 240_000);

  afterAll(async () => {
    await sandbox?.destroy().catch(() => {});
  });

  it("fire-and-forget: start a command without reading it, then reconnect and harvest the full output", async () => {
    // Start, capture the durable id, and detach *before* any output is
    // produced — never consuming the stream. The command then runs and
    // finishes while we are gone.
    const handle = sandbox.exec(
      "sleep 3; for i in $(seq 1 20); do echo line-$i; done; exit 0",
    );
    const sessionName = await handle.sessionName; // wait for the durable id first
    expect(sessionName).toBeTruthy();
    await handle.detach(); // detach without reading; the command keeps running

    await sleep(6_000); // command finishes while detached

    // Reconnect within the finished-session linger window and harvest the whole
    // log. Full replay is the default, so a plain reattach returns everything.
    const result = await sandbox.exec({ sessionName });
    expect(result.exitCode).toBe(0);
    expect(lineNumbers(result.stdout).length).toBe(20);
    expectSequential(result.stdout);
  }, 90_000);

  it("reattaches a running exec and replays without losing output", async () => {
    const total = 60; // ~30s at 0.5s/line
    const live1: string[] = [];
    const handle = sandbox.exec(
      `for i in $(seq 1 ${total}); do echo line-$i; sleep 0.5; done`,
      { onStdout: c => live1.push(c) },
    );
    await waitFor(() => lineSet(live1).size >= 8, 60_000, "8 live lines");
    const sessionName = await handle.detach(); // detach mid-run, keep it running
    expect(sessionName).toBeTruthy();
    await sleep(3_000); // more lines produced while detached

    // Default reattach is full replay — loses nothing across the seam. (Opt-in
    // `resumeFromLastRead: true` is exact but can drop in-flight output at an
    // abrupt detach: the server advances its cursor on write, not on receipt.)
    const live2: string[] = [];
    const result = await sandbox.exec(
      { sessionName },
      { onStdout: c => live2.push(c) },
    );
    expect(result.exitCode).toBe(0);

    const union = new Set([...lineSet(live1), ...lineSet(live2)]);
    expect(union.size).toBe(total);
    for (let i = 1; i <= total; i++) expect(union.has(i)).toBe(true);
  }, 120_000);

  it("delivers the real exit code after a mid-run detach", async () => {
    const live1: string[] = [];
    const handle = sandbox.exec(
      "for i in $(seq 1 40); do echo line-$i; sleep 0.5; done; exit 7",
      { onStdout: c => live1.push(c) },
    );
    await waitFor(() => lineSet(live1).size >= 5, 60_000, "5 live lines");
    const sessionName = await handle.detach(); // detach mid-run, keep it running

    const result = await sandbox.exec({ sessionName });
    expect(result.exitCode).toBe(7);
  }, 120_000);

  it("keeps stdout and stderr each gapless across a detach/reattach seam", async () => {
    const total = 40;
    const errNumbers = (chunks: string[]): number[] =>
      chunks
        .join("")
        .split("\n")
        .filter(Boolean)
        .map(l => Number(l.replace("err-", "")));

    const out1: string[] = [];
    const err1: string[] = [];
    const handle = sandbox.exec(
      `for i in $(seq 1 ${total}); do echo line-$i; echo err-$i 1>&2; sleep 0.5; done`,
      { onStdout: c => out1.push(c), onStderr: c => err1.push(c) },
    );
    await waitFor(() => lineSet(out1).size >= 6, 60_000, "6 stdout lines");
    const sessionName = await handle.detach();

    const out2: string[] = [];
    const err2: string[] = [];
    const result = await sandbox.exec(
      { sessionName },
      {
        onStdout: c => out2.push(c),
        onStderr: c => err2.push(c),
      },
    );
    expect(result.exitCode).toBe(0);

    const stdoutUnion = new Set([...lineSet(out1), ...lineSet(out2)]);
    const stderrUnion = new Set([...errNumbers(err1), ...errNumbers(err2)]);
    for (let i = 1; i <= total; i++) {
      expect(stdoutUnion.has(i)).toBe(true);
      expect(stderrUnion.has(i)).toBe(true);
    }
  }, 120_000);

  it("detach() stops streaming and a reconnect resumes the running command", async () => {
    const total = 60;
    const live1: string[] = [];
    const handle = sandbox.exec(
      `for i in $(seq 1 ${total}); do echo line-$i; sleep 0.5; done`,
      { onStdout: c => live1.push(c) },
    );
    await waitFor(() => lineSet(live1).size >= 8, 60_000, "8 live lines");

    const sessionName = await handle.detach();
    expect(sessionName).toBeTruthy();
    const seenAtDetach = lineSet(live1).size;
    await sleep(3_000); // command keeps running while detached

    // Nothing more streams to the detached handle.
    expect(lineSet(live1).size).toBe(seenAtDetach);

    const live2: string[] = [];
    const result = await sandbox.exec(
      { sessionName },
      { onStdout: c => live2.push(c) },
    );
    expect(result.exitCode).toBe(0);
    const union = new Set([...lineSet(live1), ...lineSet(live2)]);
    expect(union.size).toBe(total);
    for (let i = 1; i <= total; i++) expect(union.has(i)).toBe(true);
  }, 120_000);

  it("kill() stops the command", async () => {
    const total = 30; // 0.5s/line => ~15s
    const live1: string[] = [];
    const handle = sandbox.exec(
      `for i in $(seq 1 ${total}); do echo line-$i; sleep 0.5; done`,
      { onStdout: c => live1.push(c) },
    );
    await waitFor(() => lineSet(live1).size >= 4, 60_000, "4 live lines");

    await handle.kill();
    const result = await handle;

    // A real kill signals the process group: signalled exit (-1), stopped well
    // short of `total`.
    expect(result.exitCode).toBe(-1);
    expect(lineNumbers(result.stdout).length).toBeLessThan(total);
  }, 120_000);
});
