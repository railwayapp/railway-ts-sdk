import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Sandbox } from "../src/index.js";
import {
  expectSequential,
  lineNumbers,
  live,
  reattachAndExpectAll,
  sleep,
  streamSeq,
  waitForLines,
} from "./sandbox-e2e-helpers.js";

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
      "for i in $(seq 1 12); do echo line-$i; sleep 0.2; done",
      { onStdout: chunk => liveChunks.push(chunk) },
    );
    expect(result.exitCode).toBe(0);
    expect(liveChunks.length).toBeGreaterThan(1);
    expectSequential(result.stdout);
  }, 90_000);

  it("applies cwd and env to the command", async () => {
    const result = await sandbox.exec("pwd; printf '%s\\n' \"$GREETING\"", {
      cwd: "/tmp",
      env: { GREETING: "hello world" },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("/tmp\nhello world\n");

    const missing = await sandbox.exec("pwd", { cwd: "/no/such/dir" });
    expect(missing.exitCode).not.toBe(0);
    expect(missing.stdout).toBe("");
  }, 90_000);

  it("keeps the image PATH (mise shims) when cwd/env are set", async () => {
    const result = await sandbox.exec("which node && which mise && node -v", {
      cwd: "/tmp",
      env: { PROBE: "1" },
    });
    expect(result.exitCode).toBe(0);
    // mise resolves node via the shim or, once activated, the install dir;
    // either proves the image PATH survived cwd/env.
    expect(result.stdout).toMatch(/\/mise\/(shims|installs)\/(.*\/)?node/);
    expect(result.stdout).toContain("/mise");
  }, 90_000);

  it("enforces timeoutSec client-side", async () => {
    const result = await sandbox.exec("echo start; sleep 300", {
      timeoutSec: 2,
    });
    expect(result.timedOut).toBe(true);
    expect(result.stdout).toContain("start");
  }, 60_000);

  it("fire-and-forget: start a command without reading it, then reconnect and harvest the full output", async () => {
    const handle = sandbox.exec(
      "sleep 1; for i in $(seq 1 20); do echo line-$i; done; exit 0",
    );
    const sessionName = await handle.sessionName;
    expect(sessionName).toBeTruthy();
    await handle.detach();

    await sleep(2_000);

    const result = await sandbox.exec({ sessionName });
    expect(result.exitCode).toBe(0);
    expect(lineNumbers(result.stdout).length).toBe(20);
    expectSequential(result.stdout);
  }, 90_000);

  it("reattaches a running exec and replays without losing output", async () => {
    const total = 20;
    const { live: before, handle } = await streamSeq(sandbox, total, 4);
    const sessionName = await handle.detach();
    expect(sessionName).toBeTruthy();
    await sleep(500);

    await reattachAndExpectAll(sandbox, sessionName, before, total);
  }, 120_000);

  it("delivers the real exit code after a mid-run detach", async () => {
    const before: string[] = [];
    const total = 16;
    const handle = sandbox.exec(
      `for i in $(seq 1 ${total}); do echo line-$i; sleep 0.2; done; exit 7`,
      { onStdout: chunk => before.push(chunk) },
    );
    await waitForLines(before, 4);
    const sessionName = await handle.detach();

    const result = await sandbox.exec({ sessionName });
    expect(result.exitCode).toBe(7);
  }, 120_000);

  it("keeps stdout and stderr each gapless across a detach/reattach seam", async () => {
    const total = 16;
    const errNumbers = (chunks: string[]): number[] =>
      chunks
        .join("")
        .split("\n")
        .filter(Boolean)
        .map(line => Number(line.replace("err-", "")));

    const out1: string[] = [];
    const err1: string[] = [];
    const handle = sandbox.exec(
      `for i in $(seq 1 ${total}); do echo line-$i; echo err-$i 1>&2; sleep 0.2; done`,
      { onStdout: chunk => out1.push(chunk), onStderr: chunk => err1.push(chunk) },
    );
    await waitForLines(out1, 4);
    const sessionName = await handle.detach();

    const out2: string[] = [];
    const err2: string[] = [];
    const result = await sandbox.exec(
      { sessionName },
      {
        onStdout: chunk => out2.push(chunk),
        onStderr: chunk => err2.push(chunk),
      },
    );
    expect(result.exitCode).toBe(0);

    const stdoutUnion = new Set([
      ...lineNumbers(out1.join("")),
      ...lineNumbers(out2.join("")),
    ]);
    const stderrUnion = new Set([...errNumbers(err1), ...errNumbers(err2)]);
    for (let i = 1; i <= total; i++) {
      expect(stdoutUnion.has(i)).toBe(true);
      expect(stderrUnion.has(i)).toBe(true);
    }
  }, 120_000);

  it("detach() stops streaming and a reconnect resumes the running command", async () => {
    const total = 20;
    const { live: before, handle } = await streamSeq(sandbox, total, 4);

    const sessionName = await handle.detach();
    expect(sessionName).toBeTruthy();
    const seenAtDetach = lineNumbers(before.join("")).length;
    await sleep(500);

    expect(lineNumbers(before.join("")).length).toBe(seenAtDetach);
    await reattachAndExpectAll(sandbox, sessionName, before, total);
  }, 120_000);

  it("kill() stops the command", async () => {
    const total = 20;
    const { handle } = await streamSeq(sandbox, total, 4);

    await handle.kill();
    const result = await handle;

    expect(result.exitCode).toBe(-1);
    expect(lineNumbers(result.stdout).length).toBeLessThan(total);
  }, 120_000);
});
