import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import { Sandbox } from "../src/index.js";
import {
  createExecTestSandbox,
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
    sandbox = await createExecTestSandbox();
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

  it.each([false, true])("timeout stops the process group (ignore TERM: %s)", async ignoreTerm => {
    const result = await sandbox.exec(
      `${ignoreTerm ? "trap '' TERM; " : ""}${processTreeCommand}`,
      { timeoutSec: 5 },
    );
    expect(result).toMatchObject({ timedOut: true, exitCode: -1 });
    await expectProcessTreeStopped(sandbox, [result.stdout]);
  }, 60_000);

  it.each([false, true])("abort stops the process group (ephemeral: %s)", async ephemeral => {
    const controller = new AbortController();
    const output: string[] = [];
    const handle = sandbox.exec(processTreeCommand, {
      signal: controller.signal,
      ephemeral,
      captureOutput: false,
      onStdout: chunk => output.push(chunk),
    });
    await waitForLines(output, 2);
    controller.abort();
    await expect(handle).rejects.toBe(controller.signal.reason);
    await expectProcessTreeStopped(sandbox, output);
  }, 60_000);

  it("supports a bidirectional exchange before stdin EOF", async () => {
    const chunks: string[] = [];
    const handle = sandbox.exec(
      "while IFS= read -r line; do printf 'line-%s\\n' \"$line\"; done",
      { stdin: true, captureOutput: false, onStdout: chunk => chunks.push(chunk), timeoutSec: 30 },
    );
    await handle.stdin.write("1\n");
    await waitForLines(chunks, 1);
    await handle.stdin.write("2\n");
    await waitForLines(chunks, 2);
    await handle.stdin.end();
    await expect(handle).resolves.toMatchObject({ exitCode: 0, stdout: "", truncated: false });
    expect(chunks.join("")).toBe("line-1\nline-2\n");
  }, 60_000);

  it.each([false, true])("streams binary stdin in bounded frames (ephemeral: %s)", async ephemeral => {
    const bytes = Uint8Array.from({ length: 200_000 }, (_, i) => i % 256);
    const handle = sandbox.exec("sha256sum", { stdin: true, ephemeral, timeoutSec: 10 });
    await handle.stdin.write(bytes);
    await handle.stdin.end();
    const result = await handle;
    expect(result.exitCode).toBe(0);
    expect(result.stdout.split(" ")[0]).toBe(createHash("sha256").update(bytes).digest("hex"));
    if (ephemeral) await expect(handle.sessionName).rejects.toThrow(/Ephemeral/);
    else expect(await handle.sessionName).toBeTruthy();
  }, 60_000);

  it("runs a short ephemeral command with an exit code", async () => {
    await expect(sandbox.exec("echo ephemeral; exit 7", { ephemeral: true, timeoutSec: 5 }))
      .resolves.toMatchObject({ exitCode: 7, stdout: "ephemeral\n", timedOut: false });
  }, 30_000);

  it("caps captured output while streaming the complete output", async () => {
    let bytes = 0;
    const result = await sandbox.exec("head -c 100000 /dev/zero | tr '\\0' x", {
      maxOutputBytes: 128,
      onStdout: chunk => { bytes += chunk.length; },
      timeoutSec: 30,
    });
    expect(result).toMatchObject({ exitCode: 0, stdout: "x".repeat(128), truncated: true });
    expect(bytes).toBe(100_000);
  }, 60_000);

  it("heartbeats a running sandbox and refreshes its metadata", async () => {
    await expect(sandbox.heartbeat()).resolves.toBe(sandbox);
    expect(sandbox.status).toBe("RUNNING");
    expect(sandbox.idleTimeoutMinutes).toBe(10);
  }, 30_000);

  it("lists a running durable exec in sessions()", async () => {
    const handle = sandbox.exec("sleep 30");
    const sessionName = await handle.sessionName;
    try {
      const sessions = await sandbox.sessions();
      expect(sessions).not.toBeNull();
      const mine = sessions!.find(session => session.name === sessionName);
      expect(mine).toMatchObject({ kind: "EXEC", running: true, exitCode: null });
    } finally {
      await handle.kill("KILL");
      await handle.catch(() => {});
    }
  }, 60_000);

  it("runs a command over one HTTPS request with execHttp()", async () => {
    const result = await sandbox.execHttp("printf out; printf err >&2; exit 7", { timeoutSec: 30 });
    expect(result).toMatchObject({
      exitCode: 7,
      stdout: "out",
      stderr: "err",
      truncated: false,
      timedOut: false,
    });
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

// Print both PIDs before blocking; checking the descendant catches detach-only timeouts.
const processTreeCommand = "sleep 300 & child=$!; printf 'line-%s\\n' \"$$\" \"$child\"; wait";

async function expectProcessTreeStopped(sandbox: Sandbox, output: string[]) {
  const pids = lineNumbers(output.join(""));
  expect(pids).toHaveLength(2);
  expect(pids.every(pid => Number.isSafeInteger(pid) && pid > 1)).toBe(true);
  // A dead child may briefly remain a zombie until init reaps it.
  const check = await sandbox.exec(
    `for pid in ${pids.join(" ")}; do
      if [ -r "/proc/$pid/stat" ]; then
        IFS= read -r stat < "/proc/$pid/stat" || continue
        fields=\${stat##*) }
        state=\${fields%% *}
        case "$state" in
          Z|X) ;;
          *) printf 'still running: %s (%s)\\n' "$pid" "$state"; exit 1 ;;
        esac
      fi
    done`,
    { timeoutSec: 10 },
  );
  expect(check.stdout.trim()).toBe("");
  expect(check.stderr).toBe("");
  expect(check.exitCode).toBe(0);
}
